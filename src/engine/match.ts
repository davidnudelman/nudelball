/**
 * Match engine module — handles match simulation, team strength
 * calculations, goal scoring, card events, and post-match processing.
 *
 * The core `simulateMatch()` function replicates the logic from the
 * original index.html `simulateMatchInstant()` while accepting a
 * difficulty parameter that scales AI team strength.
 */

import type {
  Fixture,
  GameState,
  MatchEvent,
  MatchInjury,
  MatchSimOptions,
  Player,
  Position,
  PowerLevels,
  TacticId,
  Team,
} from '../types';
import {
  DEFAULT_FORMATION_IDX,
  FORMATIONS,
  FORM_GOAL_BOOST,
  FORM_LOSS_PENALTY,
  FORM_MAX,
  FORM_MIN,
  FORM_WIN_BOOST,
  GOAL_POS_WEIGHT,
  MORALE_STRENGTH_PCT,
  POS_ORDER,
  RED_CARD_CHANCE,
  RED_SUSPENSION,
  ROLE_TACTIC_SYNERGY,
  TACTICS,
  YELLOW_ACCUMULATION,
  YELLOW_CARD_CHANCE,
  MORALE_WIN,
  MORALE_LOSS,
  MORALE_MAX,
  MORALE_MIN,
  DERBY_FORM_MULT,
  DERBY_MORALE_BONUS,
  SEASON_WEEKS,
  GOAL_NARRATIVES,
  LATE_GOAL_SUFFIXES,
  LATE_GOAL_BIAS,
  YELLOW_NARRATIVES,
  RED_NARRATIVES,
  PRESSURE_THRESHOLD_WEEKS,
  PRESSURE_FORM_MULT,
  PRESSURE_VARIANCE,
  ON_FIRE_FORM_MIN,
  ON_FIRE_GOALS_MIN,
  ON_FIRE_BONUS,
  MOTM_GOAL_WEIGHT,
  MOTM_SKILL_WEIGHT,
  FORMATION_TACTIC_SYNERGY,
  TACTIC_COUNTER,
  POSITIONAL_POWER_WEIGHT,
} from '../config';
import { getOopPenalty, playerOvr, rand, clamp, pick } from './player';

// ---------------------------------------------------------------------------
// Narrative Generation
// ---------------------------------------------------------------------------

/**
 * Generate a narrative string for a goal event.
 * Picks a random template based on the scorer's position, with special
 * treatment for late goals (85'+).
 */
const generateGoalNarrative = (scorerName: string, pos: Position, minute: number): string => {
  const templates = GOAL_NARRATIVES[pos] || GOAL_NARRATIVES.STR;
  let text = pick(templates).replace('{name}', scorerName);
  if (minute >= 85) {
    text += pick(LATE_GOAL_SUFFIXES);
  }
  return text;
};

/** Generate a narrative for a yellow card event. */
const generateYellowNarrative = (playerName: string): string =>
  pick(YELLOW_NARRATIVES).replace('{name}', playerName);

/** Generate a narrative for a red card event. */
const generateRedNarrative = (playerName: string): string =>
  pick(RED_NARRATIVES).replace('{name}', playerName);

/**
 * Generate a goal minute with late-game drama bias.
 * ~20% of goals are pushed into the 85-93 minute range.
 */
const generateGoalMinute = (): number => {
  if (Math.random() < LATE_GOAL_BIAS) {
    return rand(85, 93);
  }
  return rand(1, 90);
};

// ---------------------------------------------------------------------------
// Hot Streak Detection
// ---------------------------------------------------------------------------

/**
 * Check if a player qualifies for "On Fire" status.
 * Requires form >= ON_FIRE_FORM_MIN and recent goals >= ON_FIRE_GOALS_MIN.
 */
export const checkOnFire = (p: Player): boolean =>
  (p.form || 0) >= ON_FIRE_FORM_MIN && (p.seasonGoals || 0) >= ON_FIRE_GOALS_MIN;

/**
 * Update onFire status for all players in a team.
 */
export const updateOnFireStatus = (team: Team): void => {
  for (const p of team.players) {
    p.onFire = checkOnFire(p);
  }
};

// ---------------------------------------------------------------------------
// Pressure Detection (Title Race / Relegation Battle)
// ---------------------------------------------------------------------------

/**
 * Check if a team is under pressure — fighting for the title or against relegation
 * in the final weeks of the season.
 */
const isUnderPressure = (team: Team, G: GameState): boolean => {
  const weeksLeft = SEASON_WEEKS - G.week;
  if (weeksLeft > PRESSURE_THRESHOLD_WEEKS) return false;

  const divTeams = G.teams.filter(t => t.div === team.div && t.div >= 1 && t.div <= 4);
  const sorted = divTeams.sort((a, b) => {
    if (b.seasonStats.pts !== a.seasonStats.pts) return b.seasonStats.pts - a.seasonStats.pts;
    return (b.seasonStats.gf - b.seasonStats.ga) - (a.seasonStats.gf - a.seasonStats.ga);
  });
  const pos = sorted.findIndex(t => t.id === team.id);

  /* Title race: top 3 within 6 points of leader */
  if (pos <= 2) {
    const leader = sorted[0].seasonStats.pts;
    if (leader - team.seasonStats.pts <= 6) return true;
  }

  /* Relegation battle: bottom 4 within 6 points of safety */
  if (pos >= sorted.length - 4) {
    const safePos = Math.max(0, sorted.length - 3);
    const safePoints = sorted[safePos]?.seasonStats.pts ?? 0;
    if (safePoints - team.seasonStats.pts <= 6) return true;
  }

  return false;
};

// ---------------------------------------------------------------------------
// Man of the Match
// ---------------------------------------------------------------------------

/**
 * Select Man of the Match from both teams' starters.
 * Score = goals_scored * MOTM_GOAL_WEIGHT + skill * MOTM_SKILL_WEIGHT.
 */
const selectMOTM = (
  homeTeam: Team, awayTeam: Team, fixture: Fixture,
): { name: string; teamId: number } | null => {
  const candidates: Array<{ name: string; teamId: number; score: number }> = [];

  for (const team of [homeTeam, awayTeam]) {
    for (const p of team.players.filter(pl => pl.selected)) {
      const goalsScored = fixture.events.filter(
        e => e.type === 'goal' && e.scorer === p.name && e.teamId === team.id,
      ).length;
      const score = goalsScored * MOTM_GOAL_WEIGHT + p.skill * MOTM_SKILL_WEIGHT * 0.1;
      candidates.push({ name: p.name, teamId: team.id, score });
    }
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);

  /* Add some randomness — top 3 candidates have a chance */
  const top = candidates.slice(0, Math.min(3, candidates.length));
  return pick(top);
};

// ---------------------------------------------------------------------------
// Team Strength Calculations
// ---------------------------------------------------------------------------

/**
 * Calculate a team's overall strength from the average effective rating
 * of the 11 selected starters. OOP penalties are baked into `playerOvr()`.
 *
 * If fewer than 11 starters are selected, returns a floor value of 10.
 * Players who were subbed in receive a 10% effectiveness boost.
 *
 * @param team - The team to evaluate.
 * @returns The average effective rating of the starting XI.
 */
export const teamStrength = (team: Team, tactic?: TacticId): number => {
  const starters = team.players.filter(p => p.selected);
  if (starters.length < 11) return 10;

  let total = 0;
  for (const p of starters) {
    let eff = playerOvr(p) * (p.subbedIn ? 1.10 : 1.0);
    /* Role-tactic synergy bonus (#5) */
    if (tactic && p.role) {
      const synergy = (ROLE_TACTIC_SYNERGY as Record<string, Partial<Record<TacticId, number>> | undefined>)[p.role];
      if (synergy && synergy[tactic]) {
        eff *= (1 + synergy[tactic]!);
      }
    }
    /* On Fire bonus — hot streak players get a boost */
    if (p.onFire) {
      eff *= ON_FIRE_BONUS;
    }
    total += eff;
  }
  let avg = total / 11;

  /* Morale multiplier (#4) */
  const morale = team.morale ?? 0;
  avg *= (1 + morale * MORALE_STRENGTH_PCT);

  return avg;
};

/**
 * Calculate team power levels broken down by assigned position group.
 *
 * Returns the sum of effective ratings for GK, DEF, MID, STR, and a total.
 * Useful for displaying pre-match strength comparisons and trophy room records.
 *
 * @param team - The team to evaluate.
 * @returns Power levels per position and total.
 */
export const getTeamPowerLevels = (team: Team): PowerLevels => {
  const starters = team.players.filter(p => p.selected);
  const levels: PowerLevels = { GK: 0, DEF: 0, MID: 0, STR: 0, total: 0 };

  for (const p of starters) {
    const pos: Position = p.assignedPos || p.pos;
    const eff = playerOvr(p) * (p.subbedIn ? 1.10 : 1.0);
    levels[pos] = (levels[pos] || 0) + eff;
    levels.total += eff;
  }

  return levels;
};

/**
 * Calculate the average effective rating of a team's selected starters.
 *
 * @param team - The team to evaluate.
 * @returns Average rating (0 if no starters selected).
 */
export const getTeamAvgRating = (team: Team): number => {
  const starters = team.players.filter(p => p.selected);
  if (!starters.length) return 0;
  return Math.round(
    starters.reduce((sum, p) => sum + playerOvr(p) * (p.subbedIn ? 1.10 : 1.0), 0) / starters.length,
  );
};

// ---------------------------------------------------------------------------
// Dynamic AI Tactic Selection (#1)
// ---------------------------------------------------------------------------

/**
 * Select a tactic for an AI team based on game context.
 *
 * Considers relative strength, home/away status, and league position.
 *
 * @param team - The AI team choosing a tactic.
 * @param opponent - The opposing team.
 * @param isHome - Whether the AI team is at home.
 * @param G - Game state for league position context.
 * @returns The selected tactic ID.
 */
export const selectAITactic = (
  team: Team, opponent: Team, isHome: boolean, G: GameState,
): TacticId => {
  const myStr = teamStrength(team);
  const oppStr = teamStrength(opponent);
  const ratio = myStr / Math.max(oppStr, 1);

  /* Check league position — bottom 2 teams are desperate */
  const divTeams = G.teams.filter(t => t.div === team.div && t.div >= 1 && t.div <= 4);
  const sorted = divTeams.sort((a, b) => {
    if (b.seasonStats.pts !== a.seasonStats.pts) return b.seasonStats.pts - a.seasonStats.pts;
    return (b.seasonStats.gf - b.seasonStats.ga) - (a.seasonStats.gf - a.seasonStats.ga);
  });
  const pos = sorted.findIndex(t => t.id === team.id);
  const isBottom = pos >= sorted.length - 2;
  const isTop = pos <= 1;

  /* Much weaker: defend */
  if (ratio < 0.85) return isHome ? 'counter' : 'defensive';
  /* Much stronger: attack */
  if (ratio > 1.15) return isHome ? 'attack' : 'balanced';
  /* Desperate bottom team: attack more */
  if (isBottom) return isHome ? 'attack' : 'counter';
  /* Comfortable top team: protect lead */
  if (isTop) return isHome ? 'balanced' : 'defensive';
  /* Default: balanced at home, counter away */
  return isHome ? 'balanced' : 'counter';
};

// ---------------------------------------------------------------------------
// AI Team Auto-Selection
// ---------------------------------------------------------------------------

/**
 * Auto-select the best starting XI for an AI team based on its stored
 * formation preference.
 *
 * For each position slot in the formation, the function picks the best
 * available player (by effective rating including OOP penalty), skipping
 * injured, suspended, and exhausted players. A fallback pass fills any
 * remaining slots if all candidates were below the 60% stamina threshold.
 *
 * @param team - The AI team to auto-select (mutated in-place).
 * @param playerTeamId - The human player's team ID (to avoid auto-selecting human team).
 */
export const autoSelectAI = (team: Team, playerTeamId: number): void => {
  if (team.id === playerTeamId) return;

  /* Clear current selection */
  team.players.forEach(p => { p.selected = false; p.assignedPos = null; });

  const formIdx = team.aiFormation != null ? team.aiFormation : DEFAULT_FORMATION_IDX;
  const formation = FORMATIONS[formIdx] ? FORMATIONS[formIdx].slots : FORMATIONS[DEFAULT_FORMATION_IDX].slots;

  _autoPickByFormation(team, formation);
};

/**
 * Internal helper — pick players for each formation slot, prioritising
 * highest effective rating while respecting injury/suspension/stamina.
 */
const _autoPickByFormation = (team: Team, formation: Record<Position, number>): void => {
  const selected = new Set<number>();

  for (const pos of POS_ORDER) {
    const needed = formation[pos];
    const candidates = team.players
      .map((p, i) => {
        if (selected.has(i)) return null;
        if (p.injuredFor > 0) return null;
        if (p.suspendedFor > 0) return null;
        if (p.stamina < 60) return null;
        const oop = getOopPenalty(p.pos, pos);
        if (oop === 0) return null; /* GK mismatch */
        const eff = Math.round(p.skill * (0.5 + 0.5 * p.stamina / 100) * oop);
        const freshBonus = p.benchStreak >= 3 ? 5 : 0;
        return { p, i, score: eff + freshBonus };
      })
      .filter(Boolean) as Array<{ p: Player; i: number; score: number }>;

    candidates.sort((a, b) => b.score - a.score);

    for (let j = 0; j < needed && j < candidates.length; j++) {
      const c = candidates[j];
      c.p.selected = true;
      c.p.assignedPos = pos;
      selected.add(c.i);
    }
  }

  /* Fallback: if slots still unfilled (all below 60 stamina), fill ignoring threshold */
  const selCount = team.players.filter(p => p.selected).length;
  if (selCount < 11) {
    for (const pos of POS_ORDER) {
      const neededCount = formation[pos];
      const currentCount = team.players.filter(p => p.selected && (p.assignedPos || p.pos) === pos).length;
      if (currentCount >= neededCount) continue;

      const remaining = team.players
        .map((p, i) => {
          if (selected.has(i)) return null;
          if (p.injuredFor > 0) return null;
          if (p.suspendedFor > 0) return null;
          const oop = getOopPenalty(p.pos, pos);
          if (oop === 0) return null;
          return { p, i, score: p.skill };
        })
        .filter(Boolean) as Array<{ p: Player; i: number; score: number }>;

      remaining.sort((a, b) => b.score - a.score);

      const toFill = neededCount - currentCount;
      for (let j = 0; j < toFill && j < remaining.length; j++) {
        const c = remaining[j];
        c.p.selected = true;
        c.p.assignedPos = pos;
        selected.add(c.i);
      }
    }
  }
};

// ---------------------------------------------------------------------------
// Goal Scoring
// ---------------------------------------------------------------------------

/**
 * Generate a Poisson-distributed number of goals given an expected rate.
 * Capped at 8 to prevent unrealistic scorelines.
 *
 * @param lambda - Expected goals rate.
 * @returns Number of goals (0-8).
 */
export const poissonGoals = (lambda: number): number => {
  let L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return Math.min(k - 1, 8);
};

/**
 * Pick a goal scorer from the team's selected starters.
 *
 * Scoring probability is weighted by position (STR > MID > DEF > GK)
 * and the player's base skill. Higher-skilled strikers are much more
 * likely to score than low-skill defenders.
 *
 * @param team - The scoring team.
 * @param forTeamId - Team ID for the returned scorer object.
 * @returns An object with the scorer's name and team ID.
 */
export const pickScorer = (team: Team, forTeamId: number): { name: string; teamId: number; pos: Position } => {
  const starters = team.players.filter(p => p.selected);
  if (!starters.length) return { name: 'Unknown', teamId: forTeamId, pos: 'STR' };

  const weights = starters.map(p => {
    const pos: Position = p.assignedPos || p.pos;
    const posW = GOAL_POS_WEIGHT[pos] || 1;
    return { player: p, pos, w: posW * p.skill };
  });

  const total = weights.reduce((sum, x) => sum + x.w, 0);
  let r = Math.random() * total;
  for (const item of weights) {
    r -= item.w;
    if (r <= 0) return { name: item.player.name, teamId: forTeamId, pos: item.pos };
  }

  return { name: starters[0].name, teamId: forTeamId, pos: starters[0].assignedPos || starters[0].pos };
};

/**
 * Record a goal in the game state's top-scorer tracker.
 *
 * @param G - The game state (mutated in-place).
 * @param teamId - ID of the scoring team.
 * @param playerName - Name of the goal scorer.
 */
export const recordGoal = (G: GameState, teamId: number, playerName: string): void => {
  const key = teamId + '_' + playerName;
  if (!G.topScorers[key]) {
    G.topScorers[key] = { name: playerName, teamId, goals: 0 };
  }
  G.topScorers[key].goals++;
};

// ---------------------------------------------------------------------------
// Card Events
// ---------------------------------------------------------------------------

/**
 * Generate yellow and red card events for a team's starters during a match.
 *
 * Each selected player has a 3.5% chance of a yellow and 0.3% chance of a
 * red card. Cards are tracked on the player's season stats and added to the
 * match event list.
 *
 * @param team - The team being evaluated.
 * @param teamId - The team's ID for event attribution.
 * @param events - The match event array (mutated in-place).
 */
export const generateCardEvents = (team: Team, teamId: number, events: MatchEvent[]): void => {
  const starters = team.players.filter(p => p.selected);
  for (const p of starters) {
    if (Math.random() * 100 < YELLOW_CARD_CHANCE) {
      p.seasonYellows = (p.seasonYellows || 0) + 1;
      events.push({
        type: 'yellow', teamId, minute: rand(1, 90), playerName: p.name,
        narrative: generateYellowNarrative(p.name),
      });
    }
    if (Math.random() * 100 < RED_CARD_CHANCE) {
      p.seasonReds = (p.seasonReds || 0) + 1;
      events.push({
        type: 'red', teamId, minute: rand(1, 90), playerName: p.name,
        narrative: generateRedNarrative(p.name),
      });
    }
  }
};

/**
 * Apply suspensions resulting from card events.
 *
 * - Red card: player is suspended for `RED_SUSPENSION` matches (2).
 * - Yellow accumulation: after `YELLOW_ACCUMULATION` yellows (5), the
 *   player receives a 1-match ban and their yellow count resets.
 *
 * @param team - The team whose players may be suspended.
 * @param events - The match events containing card data.
 */
export const applyCardSuspensions = (team: Team, events: MatchEvent[]): void => {
  for (const ev of events) {
    if (ev.type === 'red') {
      const p = team.players.find(pl => pl.name === ev.playerName);
      if (p) p.suspendedFor = RED_SUSPENSION;
    }
    if (ev.type === 'yellow') {
      const p = team.players.find(pl => pl.name === ev.playerName);
      if (p && (p.seasonYellows || 0) >= YELLOW_ACCUMULATION) {
        p.suspendedFor = 1;
        p.seasonYellows = 0; /* Reset yellows after accumulation ban */
      }
    }
  }
};

// ---------------------------------------------------------------------------
// Stamina & Injuries
// ---------------------------------------------------------------------------

/**
 * Apply post-match stamina changes, injuries, and skill decay for a team.
 *
 * **Starters**:
 * - Lose 8-15 stamina points per match.
 * - If stamina drops below 50, 25% chance to lose -1 skill.
 * - Injury roll: 0.4-1.2% base chance scaling with age and division.
 *   Max 2 simultaneous injuries per team, 3 per season.
 *
 * **Bench players**:
 * - Recover 20 stamina.
 * - Increment bench streak.
 * - Small skill growth chance from rest (30% at benchStreak >= 2).
 *
 * @param team - The team to process (mutated in-place).
 * @returns Array of new injuries that occurred.
 */
export const applyStaminaChanges = (team: Team): MatchInjury[] => {
  const div = team.div || 1;
  const injuries: MatchInjury[] = [];

  for (const p of team.players) {
    /* Heal injured players: decrement counter each match */
    if (p.injuredFor > 0) {
      p.injuredFor--;
      if (p.injuredFor <= 0) p.injuredFor = 0;
      /* Injured players still recover stamina but NO skill growth */
      if (!p.selected) p.stamina = Math.min(100, p.stamina + 20);
      continue;
    }

    if (p.selected) {
      (p as any).matchesPlayed = ((p as any).matchesPlayed || 0) + 1;
      const drain = rand(8, 15);
      p.stamina = Math.max(10, p.stamina - drain);
      p.benchStreak = 0;

      /* Skill degradation when exhausted (25% chance) */
      if (p.stamina < 50 && Math.random() < 0.25) {
        p.skill = Math.max(1, p.skill - 1);
      }

      /* Injury roll */
      const currentInjured = team.players.filter(pl => pl.injuredFor > 0).length;
      const seasonInj = (team as any).seasonInjuries || 0;
      if (currentInjured < 2 && seasonInj < 3) {
        const age = p.age || 25;
        const baseInjuryPct = (1 + (age >= 30 ? (age - 30) * 0.2 : 0)) * 0.4;
        const divCap = div === 4 ? 0.4 : div === 3 ? 0.6 : 1.2;
        const injuryPct = Math.min(baseInjuryPct, divCap);
        if (Math.random() * 100 < injuryPct) {
          p.injuredFor = rand(1, 4);
          p.selected = false;
          (team as any).seasonInjuries = ((team as any).seasonInjuries || 0) + 1;
          injuries.push({ name: p.name, teamId: team.id, duration: p.injuredFor });
        }
      }
    } else {
      /* Bench: recover stamina */
      p.stamina = Math.min(100, p.stamina + 20);
      p.benchStreak = (p.benchStreak || 0) + 1;

      /* Skill growth from rest (reduced rates) */
      if (p.benchStreak >= 2 && Math.random() < 0.30) {
        p.skill = clamp(p.skill + 1, 1, 50);
      } else if (p.benchStreak === 1 && Math.random() < 0.09) {
        p.skill = clamp(p.skill + 1, 1, 50);
      }
    }
  }

  return injuries;
};

// ---------------------------------------------------------------------------
// Form Updates
// ---------------------------------------------------------------------------

/**
 * Update player form after a match based on the result and individual goals.
 *
 * - Win: all starters gain +1 form.
 * - Loss: all starters lose -1 form.
 * - Scoring a goal: additional +1 form for the scorer.
 * - Bench players drift toward 0 form.
 *
 * Form is clamped to [-3, +3].
 *
 * @param fixture - The completed fixture with goals and events.
 * @param G - The game state.
 */
export const updatePlayerForm = (fixture: Fixture, G: GameState, isDerby: boolean = false, isPressure: boolean = false): void => {
  if (G.playerTeamId == null) return;
  const pt = G.teams[G.playerTeamId];
  const isHome = fixture.home === G.playerTeamId;
  const myGoals = isHome ? fixture.homeGoals! : fixture.awayGoals!;
  const theirGoals = isHome ? fixture.awayGoals! : fixture.homeGoals!;
  const won = myGoals > theirGoals;
  const lost = myGoals < theirGoals;

  for (const p of pt.players) {
    if (!p.selected) continue;
    let delta = 0;
    if (won) delta += FORM_WIN_BOOST;
    if (lost) delta += FORM_LOSS_PENALTY;

    /* Check if player scored */
    const scored = fixture.events.some(
      ev => ev.type === 'goal' && ev.teamId === G.playerTeamId && ev.scorer === p.name,
    );
    if (scored) delta += FORM_GOAL_BOOST;

    /* Derby matches double form changes (#13) */
    if (isDerby) delta *= DERBY_FORM_MULT;

    /* Pressure amplifies form changes in title/relegation battles */
    if (isPressure) delta = Math.round(delta * PRESSURE_FORM_MULT);

    p.form = clamp((p.form || 0) + delta, FORM_MIN, FORM_MAX);
  }

  /* Bench players drift toward 0 */
  for (const p of pt.players) {
    if (p.selected) continue;
    if (p.form > 0) p.form--;
    else if (p.form < 0) p.form++;
  }
};

// ---------------------------------------------------------------------------
// Morale Update (#4)
// ---------------------------------------------------------------------------

/**
 * Update a team's morale after a match result.
 *
 * @param team - The team to update.
 * @param myGoals - Goals scored by this team.
 * @param theirGoals - Goals conceded by this team.
 * @param isDerby - Whether this was a derby match (double morale effect).
 */
export const updateMorale = (team: Team, myGoals: number, theirGoals: number, isDerby: boolean): void => {
  let delta = 0;
  if (myGoals > theirGoals) delta = MORALE_WIN;
  else if (myGoals < theirGoals) delta = MORALE_LOSS;
  if (isDerby) {
    delta *= 2;
    if (myGoals > theirGoals) delta += DERBY_MORALE_BONUS;
  }
  team.morale = clamp((team.morale ?? 0) + delta, MORALE_MIN, MORALE_MAX);
};

/**
 * Decay team morale toward 0 by 1 point. Called once per week.
 */
export const decayMorale = (team: Team): void => {
  const m = team.morale ?? 0;
  if (m > 0) team.morale = m - 1;
  else if (m < 0) team.morale = m + 1;
};

// ---------------------------------------------------------------------------
// Match Stats
// ---------------------------------------------------------------------------

/**
 * Update both season and cumulative stats for both teams after a match.
 *
 * Handles points allocation: 3 for a win, 1 each for a draw, 0 for a loss.
 *
 * @param f - The completed fixture.
 * @param G - The game state.
 */
export const updateMatchStats = (f: Fixture, G: GameState): void => {
  const ht = G.teams[f.home];
  const at = G.teams[f.away];

  /* Season stats */
  ht.seasonStats.p++;
  at.seasonStats.p++;
  ht.seasonStats.gf += f.homeGoals!;
  ht.seasonStats.ga += f.awayGoals!;
  at.seasonStats.gf += f.awayGoals!;
  at.seasonStats.ga += f.homeGoals!;

  /* Cumulative stats */
  ht.stats.p++;
  at.stats.p++;
  ht.stats.gf += f.homeGoals!;
  ht.stats.ga += f.awayGoals!;
  at.stats.gf += f.awayGoals!;
  at.stats.ga += f.homeGoals!;

  if (f.homeGoals! > f.awayGoals!) {
    ht.seasonStats.w++;
    ht.seasonStats.pts += 3;
    at.seasonStats.l++;
    ht.stats.w++;
    ht.stats.pts += 3;
    at.stats.l++;
  } else if (f.homeGoals! < f.awayGoals!) {
    at.seasonStats.w++;
    at.seasonStats.pts += 3;
    ht.seasonStats.l++;
    at.stats.w++;
    at.stats.pts += 3;
    ht.stats.l++;
  } else {
    ht.seasonStats.d++;
    at.seasonStats.d++;
    ht.seasonStats.pts++;
    at.seasonStats.pts++;
    ht.stats.d++;
    at.stats.d++;
    ht.stats.pts++;
    at.stats.pts++;
  }
};

// ---------------------------------------------------------------------------
// Match Record Tracking
// ---------------------------------------------------------------------------

/**
 * Update per-match records (Trophy Room) after each match involving the player.
 *
 * Tracks: biggest win, biggest defeat, most goals in a match, win/unbeaten
 * streaks, clean sheets, and hall of fame (career goal scorers).
 * Also updates league-wide match records for all teams.
 *
 * @param f - The completed fixture with results.
 * @param G - The game state (records mutated in-place).
 */
export const updateMatchRecords = (f: Fixture, G: GameState): void => {
  if (!G.records || G.playerTeamId == null) return;
  if (f.homeGoals == null || f.awayGoals == null) return;

  const r = G.records;
  const hg = f.homeGoals;
  const ag = f.awayGoals;
  const totalGoals = hg + ag;
  const diff = Math.abs(hg - ag);
  const scoreStr = `${hg} - ${ag}`;

  const isPlayerHome = f.home === G.playerTeamId;
  const isPlayerAway = f.away === G.playerTeamId;

  /* --- Player team records --- */
  if (isPlayerHome || isPlayerAway) {
    const myGoals = isPlayerHome ? hg : ag;
    const theirGoals = isPlayerHome ? ag : hg;
    const opponentId = isPlayerHome ? f.away : f.home;
    const opponentName = G.teams[opponentId].name;
    const playerWon = myGoals > theirGoals;
    const playerLost = myGoals < theirGoals;
    const playerDrew = myGoals === theirGoals;

    /* Biggest Win */
    if (playerWon && diff > r.biggestWin.diff) {
      r.biggestWin = { score: scoreStr, opponent: opponentName, season: G.season, diff };
    }

    /* Biggest Defeat */
    if (playerLost && diff > r.biggestDefeat.diff) {
      r.biggestDefeat = { score: scoreStr, opponent: opponentName, season: G.season, diff };
    }

    /* Most Goals in a Match */
    if (totalGoals > r.mostGoalsMatch.total) {
      r.mostGoalsMatch = { score: scoreStr, opponent: opponentName, season: G.season, total: totalGoals };
    }

    /* Win streak */
    if (playerWon) {
      r.currentWinStreak++;
      if (r.currentWinStreak > r.longestWinStreak) {
        r.longestWinStreak = r.currentWinStreak;
      }
    } else {
      r.currentWinStreak = 0;
    }

    /* Unbeaten streak */
    if (!playerLost) {
      r.currentUnbeaten++;
      if (r.currentUnbeaten > r.longestUnbeaten) {
        r.longestUnbeaten = r.currentUnbeaten;
      }
    } else {
      r.currentUnbeaten = 0;
    }

    /* Clean sheets */
    if (theirGoals === 0) {
      r.totalCleanSheets++;
    }

    /* Hall of Fame — track career goals for player team scorers */
    const playerTeam = G.teams[G.playerTeamId];
    for (const p of playerTeam.players) {
      if ((p.seasonGoals || 0) > 0) {
        r.hallOfFame[p.name] = p.careerGoals || p.seasonGoals || 0;
      }
    }
  }

  /* --- League-wide match records (any team, any match) --- */
  const homeTeam = G.teams[f.home];
  const awayTeam = G.teams[f.away];

  /* League biggest win — check from perspective of winning team */
  if (hg > ag && diff > r.league.biggestWin.diff) {
    r.league.biggestWin = {
      score: scoreStr, team: homeTeam.name, opponent: awayTeam.name,
      season: G.season, diff,
    };
  } else if (ag > hg && diff > r.league.biggestWin.diff) {
    r.league.biggestWin = {
      score: scoreStr, team: awayTeam.name, opponent: homeTeam.name,
      season: G.season, diff,
    };
  }

  /* League biggest defeat — from perspective of losing team */
  if (hg > ag && diff > r.league.biggestDefeat.diff) {
    r.league.biggestDefeat = {
      score: scoreStr, team: awayTeam.name, opponent: homeTeam.name,
      season: G.season, diff,
    };
  } else if (ag > hg && diff > r.league.biggestDefeat.diff) {
    r.league.biggestDefeat = {
      score: scoreStr, team: homeTeam.name, opponent: awayTeam.name,
      season: G.season, diff,
    };
  }

  /* League most goals in a match */
  if (totalGoals > r.league.mostGoalsMatch.total) {
    r.league.mostGoalsMatch = {
      score: scoreStr, team: homeTeam.name, opponent: awayTeam.name,
      season: G.season, total: totalGoals,
    };
  }
};

// ---------------------------------------------------------------------------
// Core Match Simulation
// ---------------------------------------------------------------------------

/**
 * Simulate a complete match between home and away teams.
 *
 * This is the core match engine. It:
 * 1. Auto-selects AI team lineups.
 * 2. Calculates team strengths with tactic modifiers.
 * 3. Generates goals using Poisson distribution.
 * 4. Assigns goal scorers weighted by position and skill.
 * 5. Generates yellow/red card events.
 * 6. Tracks player appearances and goals.
 * 7. Updates match stats (points, standings).
 * 8. Updates player form for the human team.
 * 9. Applies stamina changes, injuries, and suspensions.
 *
 * The `options.difficulty` parameter (default 1.0) scales AI team strength,
 * allowing the game to be harder or easier.
 *
 * @param f - The fixture to simulate (mutated in-place with results).
 * @param G - The game state (mutated in-place).
 * @param options - Optional simulation parameters (tactic override, difficulty).
 */
export const simulateMatch = (f: Fixture, G: GameState, options?: MatchSimOptions): void => {
  const { tacticOverride, difficulty = 1.0 } = options || {};

  const homeTeam = G.teams[f.home];
  const awayTeam = G.teams[f.away];

  /* Auto-select AI teams */
  autoSelectAI(homeTeam, G.playerTeamId!);
  autoSelectAI(awayTeam, G.playerTeamId!);

  /* Determine tactics — AI teams now choose dynamically (#1) */
  const isPlayerHome = f.home === G.playerTeamId;
  const isPlayerAway = f.away === G.playerTeamId;
  const pTac = tacticOverride || (isPlayerHome || isPlayerAway ? G.tactic : 'balanced');

  const homeTacId: TacticId = isPlayerHome ? pTac : selectAITactic(homeTeam, awayTeam, true, G);
  const awayTacId: TacticId = isPlayerAway ? pTac : selectAITactic(awayTeam, homeTeam, false, G);
  const homeTac = TACTICS[homeTacId] || TACTICS.balanced;
  const awayTac = TACTICS[awayTacId] || TACTICS.balanced;

  /* Update On Fire status before strength calculation */
  updateOnFireStatus(homeTeam);
  updateOnFireStatus(awayTeam);

  /* Calculate base strengths with tactic synergy */
  let hs = teamStrength(homeTeam, homeTacId);
  let as_ = teamStrength(awayTeam, awayTacId);

  /* Apply difficulty scaling to AI teams */
  if (f.home !== G.playerTeamId) hs *= difficulty;
  if (f.away !== G.playerTeamId) as_ *= difficulty;

  /* Pressure mechanic — title race / relegation battle adds variance */
  const homePressure = isUnderPressure(homeTeam, G);
  const awayPressure = isUnderPressure(awayTeam, G);
  if (homePressure) hs *= (1 + (Math.random() - 0.5) * PRESSURE_VARIANCE * 2);
  if (awayPressure) as_ *= (1 + (Math.random() - 0.5) * PRESSURE_VARIANCE * 2);

  /* --- Formation-tactic synergy --- */
  const homeFormIdx = isPlayerHome ? (G.selectedFormationIdx ?? DEFAULT_FORMATION_IDX) : (homeTeam.aiFormation ?? DEFAULT_FORMATION_IDX);
  const awayFormIdx = isPlayerAway ? (G.selectedFormationIdx ?? DEFAULT_FORMATION_IDX) : (awayTeam.aiFormation ?? DEFAULT_FORMATION_IDX);
  const homeFormLabel = FORMATIONS[homeFormIdx]?.label ?? FORMATIONS[DEFAULT_FORMATION_IDX].label;
  const awayFormLabel = FORMATIONS[awayFormIdx]?.label ?? FORMATIONS[DEFAULT_FORMATION_IDX].label;

  const homeFTS = FORMATION_TACTIC_SYNERGY[homeFormLabel]?.[homeTacId] ?? 1.0;
  const awayFTS = FORMATION_TACTIC_SYNERGY[awayFormLabel]?.[awayTacId] ?? 1.0;

  /* --- Tactic counter matchup --- */
  const homeCounterMult = TACTIC_COUNTER[homeTacId]?.[awayTacId] ?? 1.0;
  const awayCounterMult = TACTIC_COUNTER[awayTacId]?.[homeTacId] ?? 1.0;

  /* --- Positional power matchups (STR vs DEF, midfield control) --- */
  const homePower = getTeamPowerLevels(homeTeam);
  const awayPower = getTeamPowerLevels(awayTeam);

  /* Attacking advantage: my strikers vs their defenders */
  const homeAtkRatio = homePower.STR / Math.max(awayPower.DEF, 1);
  const awayAtkRatio = awayPower.STR / Math.max(homePower.DEF, 1);
  /* Clamp to [0.8, 1.2] so it nudges but doesn't dominate */
  const homeAtkMult = 1 + (Math.min(Math.max(homeAtkRatio - 1, -0.2), 0.2)) * POSITIONAL_POWER_WEIGHT;
  const awayAtkMult = 1 + (Math.min(Math.max(awayAtkRatio - 1, -0.2), 0.2)) * POSITIONAL_POWER_WEIGHT;

  /* Midfield control: winner gets a small xG bonus, loser gets a small penalty */
  const totalMid = homePower.MID + awayPower.MID + 1;
  const homeMidShare = homePower.MID / totalMid;
  const awayMidShare = awayPower.MID / totalMid;
  /* Ranges ~0.96 to ~1.04 */
  const homeMidMult = 1 + (homeMidShare - 0.5) * POSITIONAL_POWER_WEIGHT;
  const awayMidMult = 1 + (awayMidShare - 0.5) * POSITIONAL_POWER_WEIGHT;

  /* Calculate expected goals — all factors combined */
  const homeExp = Math.max(0.3,
    ((hs - as_) / 15 + homeTac.homeBonus * homeFTS) * awayTac.defPenalty
    * homeCounterMult * homeAtkMult * homeMidMult
  );
  const awayExp = Math.max(0.3,
    ((as_ - hs) / 15 + awayTac.awayBonus * awayFTS) * homeTac.defPenalty
    * awayCounterMult * awayAtkMult * awayMidMult
  );

  /* Generate goals */
  f.homeGoals = poissonGoals(homeExp);
  f.awayGoals = poissonGoals(awayExp);
  f.events = [];

  /* Home team goals */
  for (let i = 0; i < f.homeGoals; i++) {
    const sc = pickScorer(homeTeam, f.home);
    const minute = generateGoalMinute();
    const narrative = generateGoalNarrative(sc.name, sc.pos, minute);
    f.events.push({ type: 'goal', teamId: f.home, minute, scorer: sc.name, narrative });
    recordGoal(G, f.home, sc.name);
    const sp = homeTeam.players.find(p => p.name === sc.name);
    if (sp) {
      sp.seasonGoals = (sp.seasonGoals || 0) + 1;
      sp.careerGoals = (sp.careerGoals || 0) + 1;
    }
  }

  /* Away team goals */
  for (let i = 0; i < f.awayGoals; i++) {
    const sc = pickScorer(awayTeam, f.away);
    const minute = generateGoalMinute();
    const narrative = generateGoalNarrative(sc.name, sc.pos, minute);
    f.events.push({ type: 'goal', teamId: f.away, minute, scorer: sc.name, narrative });
    recordGoal(G, f.away, sc.name);
    const sp = awayTeam.players.find(p => p.name === sc.name);
    if (sp) {
      sp.seasonGoals = (sp.seasonGoals || 0) + 1;
      sp.careerGoals = (sp.careerGoals || 0) + 1;
    }
  }

  /* Card events */
  generateCardEvents(homeTeam, f.home, f.events);
  generateCardEvents(awayTeam, f.away, f.events);

  /* Red card match impact (#10) — adjust goals for red cards received early */
  const homeReds = f.events.filter(e => e.type === 'red' && e.teamId === f.home);
  const awayReds = f.events.filter(e => e.type === 'red' && e.teamId === f.away);
  if (homeReds.length > 0) {
    const earliestMin = Math.min(...homeReds.map(e => e.minute));
    const remainingPct = (90 - earliestMin) / 90;
    const extraGoals = poissonGoals(remainingPct * 0.4);
    for (let i = 0; i < extraGoals; i++) {
      const sc = pickScorer(awayTeam, f.away);
      const min = rand(earliestMin, 90);
      f.events.push({ type: 'goal', teamId: f.away, minute: min, scorer: sc.name, narrative: generateGoalNarrative(sc.name, sc.pos, min) });
      f.awayGoals!++;
      recordGoal(G, f.away, sc.name);
      const sp = awayTeam.players.find(p => p.name === sc.name);
      if (sp) { sp.seasonGoals = (sp.seasonGoals || 0) + 1; sp.careerGoals = (sp.careerGoals || 0) + 1; }
    }
  }
  if (awayReds.length > 0) {
    const earliestMin = Math.min(...awayReds.map(e => e.minute));
    const remainingPct = (90 - earliestMin) / 90;
    const extraGoals = poissonGoals(remainingPct * 0.4);
    for (let i = 0; i < extraGoals; i++) {
      const sc = pickScorer(homeTeam, f.home);
      const min = rand(earliestMin, 90);
      f.events.push({ type: 'goal', teamId: f.home, minute: min, scorer: sc.name, narrative: generateGoalNarrative(sc.name, sc.pos, min) });
      f.homeGoals!++;
      recordGoal(G, f.home, sc.name);
      const sp = homeTeam.players.find(p => p.name === sc.name);
      if (sp) { sp.seasonGoals = (sp.seasonGoals || 0) + 1; sp.careerGoals = (sp.careerGoals || 0) + 1; }
    }
  }

  /* Sort events chronologically */
  f.events.sort((a, b) => a.minute - b.minute);

  /* Track appearances for selected players */
  for (const p of homeTeam.players.filter(pl => pl.selected)) {
    p.seasonApps = (p.seasonApps || 0) + 1;
    p.careerApps = (p.careerApps || 0) + 1;
  }
  for (const p of awayTeam.players.filter(pl => pl.selected)) {
    p.seasonApps = (p.seasonApps || 0) + 1;
    p.careerApps = (p.careerApps || 0) + 1;
  }

  /* Update standings */
  updateMatchStats(f, G);

  /* Update Trophy Room records */
  updateMatchRecords(f, G);

  /* Detect derby match (#13) */
  const isDerby = (homeTeam.rivals ?? []).includes(awayTeam.id) ||
    (awayTeam.rivals ?? []).includes(homeTeam.id);

  /* Update form for player's team — pressure amplifies form changes */
  const playerTeam = isPlayerHome ? homeTeam : isPlayerAway ? awayTeam : null;
  const pressureActive = playerTeam ? isUnderPressure(playerTeam, G) : false;
  if (isPlayerHome || isPlayerAway) {
    updatePlayerForm(f, G, isDerby, pressureActive);
  }

  /* Update morale (#4) */
  updateMorale(homeTeam, f.homeGoals!, f.awayGoals!, isDerby);
  updateMorale(awayTeam, f.awayGoals!, f.homeGoals!, isDerby);

  /* Apply stamina changes and injuries */
  const homeInj = applyStaminaChanges(homeTeam);
  const awayInj = applyStaminaChanges(awayTeam);
  f.injuries = [...homeInj, ...awayInj];

  /* Apply suspensions from cards */
  applyCardSuspensions(homeTeam, f.events);
  applyCardSuspensions(awayTeam, f.events);

  /* Select Man of the Match */
  const motm = selectMOTM(homeTeam, awayTeam, f);
  if (motm) {
    f.motm = motm.name;
    f.motmTeamId = motm.teamId;
  }

  /* Update On Fire status after form changes */
  updateOnFireStatus(homeTeam);
  updateOnFireStatus(awayTeam);
};
