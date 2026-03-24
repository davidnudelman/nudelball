/**
 * Season-end module — handles the main end-of-season processing,
 * including trophy awards, record updates, promotion/relegation,
 * prize money distribution, waiting pool rotation, and new-season setup.
 *
 * This module orchestrates calls to league, training, transfer,
 * and player modules to perform the full season transition.
 */

import type {
  FinancialAward,
  GameState,
  Player,
  PlayerRole,
  Records,
  SeasonAward,
  SeasonAwardEntry,
  SeasonHistory,
  SeasonMove,
  Team,
  TrophyType,
  YouthProspect,
} from '../types';
import {
  FORMATIONS,
  PARACHUTE_PAYMENT,
  PRIZE_MONEY,
  SOLIDARITY_PAYMENT,
  SQUAD_COMP,
  DIV_SEASON_INCOME,
  DIV_WIN_BONUS,
  DIV_DRAW_BONUS,
  MORALE_PROMOTION,
  MORALE_RELEGATION,
  MORALE_MAX,
  MORALE_MIN,
  RIVAL_PAIRS,
  STADIUM_INCOME_BONUS,
  YOUTH_ACADEMY_SKILL_BONUS,
  ROLES_BY_POSITION,
} from '../config';
import { applyDevelopmentCurve, agePlayer, genName, genSkill, makePlayer, rand } from './player';
import { getTeamPowerLevels } from './match';
import { emptyStats, generateFixtures, getSortedDiv } from './league';
import {
  awardSeasonIncome,
  generateSeasonFreeAgents,
  initBudgets,
  aiDoTransfers,
} from './transfers';

// ---------------------------------------------------------------------------
// Default Records
// ---------------------------------------------------------------------------

/**
 * Create the default records object for a new game.
 *
 * All numeric records start at 0 (or 999/-999 for "lowest" records),
 * ensuring the first season's values will always be recorded.
 *
 * @returns A fresh Records object.
 */
export const defaultRecords = (): Records => ({
  /* Player single-season personal bests */
  bestPts: { value: 0, season: 0 },
  bestWins: { value: 0, season: 0 },
  fewestDefeats: { value: 999, season: 0 },
  bestAttack: { value: 0, season: 0 },
  bestDefence: { value: 999, season: 0 },
  bestGD: { value: -999, season: 0 },
  topScorerSeason: { name: '', goals: 0, season: 0 },
  biggestWin: { score: '', opponent: '', season: 0, diff: 0 },
  biggestDefeat: { score: '', opponent: '', season: 0, diff: 0 },
  mostGoalsMatch: { score: '', opponent: '', season: 0, total: 0 },
  highestPower: { value: 0, season: 0 },

  /* League-wide records */
  league: {
    bestPts: { value: 0, season: 0, team: '' },
    bestWins: { value: 0, season: 0, team: '' },
    fewestDefeats: { value: 999, season: 0, team: '' },
    bestAttack: { value: 0, season: 0, team: '' },
    bestDefence: { value: 999, season: 0, team: '' },
    bestGD: { value: -999, season: 0, team: '' },
    topScorerSeason: { name: '', goals: 0, season: 0, team: '' },
    biggestWin: { score: '', team: '', opponent: '', season: 0, diff: 0 },
    biggestDefeat: { score: '', team: '', opponent: '', season: 0, diff: 0 },
    mostGoalsMatch: { score: '', team: '', opponent: '', season: 0, total: 0 },
    highestPower: { value: 0, season: 0, team: '' },
  },

  /* Milestones */
  highestDiv: 4,
  totalPromotions: 0,
  totalRelegations: 0,
  consecutiveDiv1: 0,
  maxConsecutiveDiv1: 0,
  currentUnbeaten: 0,
  longestUnbeaten: 0,
  currentWinStreak: 0,
  longestWinStreak: 0,
  totalCleanSheets: 0,

  /* Hall of Fame */
  hallOfFame: {},
});

// ---------------------------------------------------------------------------
// Season Records Update
// ---------------------------------------------------------------------------

/**
 * Update Trophy Room season records — called at the very start of
 * endOfSeason, BEFORE trophies are awarded, moves happen, or
 * seasonStats are reset.
 *
 * Checks both player-personal and league-wide records for:
 * - Best points, wins, fewest defeats
 * - Best attack, defence, goal difference
 * - Top scorer of the season
 * - Highest team power
 * - Highest division reached, consecutive Div 1 seasons
 *
 * @param G - The game state (mutated: G.records may be updated).
 */
export const updateSeasonRecords = (G: GameState): void => {
  if (!G.records || G.playerTeamId == null) return;

  const r = G.records;
  const pt = G.teams[G.playerTeamId];
  const st = pt.seasonStats;
  const gd = st.gf - st.ga;

  /* Player personal bests */
  if (st.pts > r.bestPts.value) r.bestPts = { value: st.pts, season: G.season };
  if (st.w > r.bestWins.value) r.bestWins = { value: st.w, season: G.season };
  if (st.l < r.fewestDefeats.value) r.fewestDefeats = { value: st.l, season: G.season };
  if (st.gf > r.bestAttack.value) r.bestAttack = { value: st.gf, season: G.season };
  if (st.ga < r.bestDefence.value) r.bestDefence = { value: st.ga, season: G.season };
  if (gd > r.bestGD.value) r.bestGD = { value: gd, season: G.season };

  /* Top Scorer in a Season for player team */
  const playerScorers = Object.values(G.topScorers).filter(s => s.teamId === G.playerTeamId);
  if (playerScorers.length) {
    const best = playerScorers.sort((a, b) => b.goals - a.goals)[0];
    if (best.goals > r.topScorerSeason.goals) {
      r.topScorerSeason = { name: best.name, goals: best.goals, season: G.season };
    }
  }

  /* Highest Power at season end */
  const power = getTeamPowerLevels(pt);
  if (power.total > r.highestPower.value) {
    r.highestPower = { value: power.total, season: G.season };
  }

  /* League-wide season records — loop all active teams */
  for (const tm of G.teams) {
    if (tm.div < 1 || tm.div > 4) continue;
    const ss = tm.seasonStats;
    const tmGD = ss.gf - ss.ga;

    if (ss.pts > r.league.bestPts.value) {
      r.league.bestPts = { value: ss.pts, season: G.season, team: tm.name };
    }
    if (ss.w > r.league.bestWins.value) {
      r.league.bestWins = { value: ss.w, season: G.season, team: tm.name };
    }
    if (ss.l < r.league.fewestDefeats.value) {
      r.league.fewestDefeats = { value: ss.l, season: G.season, team: tm.name };
    }
    if (ss.gf > r.league.bestAttack.value) {
      r.league.bestAttack = { value: ss.gf, season: G.season, team: tm.name };
    }
    if (ss.ga < r.league.bestDefence.value) {
      r.league.bestDefence = { value: ss.ga, season: G.season, team: tm.name };
    }
    if (tmGD > r.league.bestGD.value) {
      r.league.bestGD = { value: tmGD, season: G.season, team: tm.name };
    }

    /* League top scorer in a season */
    const tmScorers = Object.values(G.topScorers).filter(s => s.teamId === tm.id);
    if (tmScorers.length) {
      const best = tmScorers.sort((a, b) => b.goals - a.goals)[0];
      if (best.goals > r.league.topScorerSeason.goals) {
        r.league.topScorerSeason = {
          name: best.name,
          goals: best.goals,
          season: G.season,
          team: tm.name,
        };
      }
    }

    /* League highest power */
    const tmPower = getTeamPowerLevels(tm);
    if (tmPower.total > r.league.highestPower.value) {
      r.league.highestPower = { value: tmPower.total, season: G.season, team: tm.name };
    }
  }

  /* Milestones: highest division reached */
  if (pt.div < r.highestDiv) r.highestDiv = pt.div;

  /* Consecutive Seasons in Div 1 */
  if (pt.div === 1) {
    r.consecutiveDiv1++;
    if (r.consecutiveDiv1 > r.maxConsecutiveDiv1) {
      r.maxConsecutiveDiv1 = r.consecutiveDiv1;
    }
  } else {
    r.consecutiveDiv1 = 0;
  }
};

// ---------------------------------------------------------------------------
// End of Season
// ---------------------------------------------------------------------------

/**
 * The main end-of-season handler.
 *
 * This is the most complex function in the game engine. It performs
 * the following steps in order:
 *
 * 1. **Update records** — capture personal and league-wide bests.
 * 2. **Award trophies** — Div 1-2 champions and runners-up.
 * 3. **Record season history** — for the history view.
 * 4. **Determine promotions/relegations** — top 2 promoted, bottom 2 relegated.
 * 5. **Apply moves** — update team divisions, handle exits and entries.
 * 6. **Track milestones** — promotions, relegations for player team.
 * 7. **Bring in new teams** — from return pool and waiting pool.
 * 8. **Distribute prize money** — champion, runner-up, promotion, relegation,
 *    parachute payments, and solidarity (revenue sharing).
 * 9. **Financial setup** — award season income, initialise budgets,
 *    generate free agents, AI transfers, reopen transfer window.
 *
 * @param G - The game state (mutated extensively).
 * @returns An object with `awards`, `moves`, and `financialAwards` for the
 *          season summary overlay.
 */
export const endOfSeason = (G: GameState): {
  awards: SeasonAward[];
  moves: SeasonMove[];
  financialAwards: FinancialAward[];
} => {
  updateSeasonRecords(G);

  const changes: SeasonAward[] = [];

  /* ---- Award trophies/medals BEFORE moving teams ---- */
  for (let d = 1; d <= 2; d++) {
    const sorted = getSortedDiv(G, d);
    if (sorted.length >= 1) {
      const trophy1: TrophyType = d === 1 ? 'gold_trophy' : 'gold_medal';
      sorted[0].trophies.push({ type: trophy1, season: G.season });
      changes.push({ team: sorted[0], award: trophy1 });
    }
    if (sorted.length >= 2) {
      const trophy2: TrophyType = d === 1 ? 'silver_trophy' : 'silver_medal';
      sorted[1].trophies.push({ type: trophy2, season: G.season });
      changes.push({ team: sorted[1], award: trophy2 });
    }
  }

  /* ---- Record season history ---- */
  if (!G.seasonHistory) G.seasonHistory = [];
  const historyEntry: SeasonHistory = {
    season: G.season,
    div1Champion: null,
    div1RunnerUp: null,
    div2Champion: null,
    div2RunnerUp: null,
    topScorer: null,
  };

  const div1sorted = getSortedDiv(G, 1);
  if (div1sorted.length >= 1) historyEntry.div1Champion = { name: div1sorted[0].name };
  if (div1sorted.length >= 2) historyEntry.div1RunnerUp = { name: div1sorted[1].name };

  const div2sorted = getSortedDiv(G, 2);
  if (div2sorted.length >= 1) historyEntry.div2Champion = { name: div2sorted[0].name };
  if (div2sorted.length >= 2) historyEntry.div2RunnerUp = { name: div2sorted[1].name };

  const allScorers = Object.values(G.topScorers).sort((a, b) => b.goals - a.goals);
  if (allScorers.length && allScorers[0].goals > 0) {
    const top = allScorers[0];
    const tt = G.teams[top.teamId];
    historyEntry.topScorer = {
      name: top.name,
      teamName: tt ? tt.name : '',
      teamId: top.teamId,
      goals: top.goals,
    };
  }

  G.seasonHistory.push(historyEntry);

  /* ---- Determine promotions/relegations ---- */
  const moves: SeasonMove[] = [];

  for (let d = 1; d <= 4; d++) {
    const sorted = getSortedDiv(G, d);

    /* Promotion: top 2 from divisions 2-4 go up */
    if (d > 1 && sorted.length >= 2) {
      moves.push({ team: sorted[0], from: d, to: d - 1, type: 'promote' });
      moves.push({ team: sorted[1], from: d, to: d - 1, type: 'promote' });
    }

    /* Relegation: bottom 2 from divisions 1-3 go down */
    if (d < 4 && sorted.length >= 2) {
      moves.push({ team: sorted[sorted.length - 2], from: d, to: d + 1, type: 'relegate' });
      moves.push({ team: sorted[sorted.length - 1], from: d, to: d + 1, type: 'relegate' });
    }

    /* Division 4 bottom 2 exit the league entirely */
    if (d === 4 && sorted.length >= 2) {
      moves.push({ team: sorted[sorted.length - 2], from: d, to: 0, type: 'out' });
      moves.push({ team: sorted[sorted.length - 1], from: d, to: 0, type: 'out' });
    }
  }

  /* ---- Apply moves ---- */
  for (const m of moves) {
    if (m.to === 0) {
      /* Team exits the league — save to return pool */
      (G.returnPool as any[]).push({
        name: m.team.name,
        c1: m.team.c1,
        c2: m.team.c2,
        country: m.team.country,
        returnIn: G.season + 2,
        stats: { ...m.team.stats },
        trophies: [...m.team.trophies],
      });
      m.team.div = 0;
    } else {
      m.team.div = m.to;
    }
  }

  /* ---- Track promotion/relegation milestones for player's team ---- */
  if (G.records && G.playerTeamId != null) {
    for (const m of moves) {
      if (m.team && m.team.id === G.playerTeamId) {
        if (m.type === 'promote') G.records.totalPromotions++;
        if (m.type === 'relegate' || m.type === 'out') G.records.totalRelegations++;
      }
    }
  }

  /* ---- Morale changes for promoted/relegated teams (#4) ---- */
  for (const m of moves) {
    if (m.type === 'promote') {
      m.team.morale = Math.min(MORALE_MAX, (m.team.morale ?? 0) + MORALE_PROMOTION);
    } else if (m.type === 'relegate' || m.type === 'out') {
      m.team.morale = Math.max(MORALE_MIN, (m.team.morale ?? 0) + MORALE_RELEGATION);
    }
  }

  /* ---- Bring in teams from return pool and waiting pool ---- */
  const enteringTeams: Array<{
    name: string;
    c1: string;
    c2: string;
    country: string;
    stats?: any;
    trophies?: any;
  }> = [];

  for (let i = G.returnPool.length - 1; i >= 0; i--) {
    if ((G.returnPool[i].returnIn || 0) <= G.season + 1) {
      enteringTeams.push(G.returnPool.splice(i, 1)[0]);
    }
  }
  while (enteringTeams.length < 2 && G.waitingPool.length > 0) {
    enteringTeams.push(G.waitingPool.shift()!);
  }

  for (const et of enteringTeams) {
    const existing = G.teams.find(tm => tm.name === et.name);
    const cty = et.country || '';

    if (existing) {
      /* Reinstate existing team */
      existing.div = 4;
      existing.players = [];
      if (cty) existing.country = cty as any;
      existing.aiFormation = rand(0, FORMATIONS.length - 1);

      const positions: string[] = [];
      for (const [pos, cnt] of Object.entries(SQUAD_COMP)) {
        for (let i = 0; i < cnt; i++) positions.push(pos);
      }
      for (const pos of positions) {
        existing.players.push(
          makePlayer(genName(cty), pos as any, genSkill(4), 18 + rand(0, 15)),
        );
      }
      if (et.stats) existing.stats = et.stats;
      if (et.trophies) existing.trophies = et.trophies;
      existing.seasonStats = emptyStats();
    } else {
      /* Create brand-new team */
      const team: Team = {
        id: G.teams.length,
        name: et.name,
        div: 4,
        c1: et.c1,
        c2: et.c2,
        country: (cty || '') as any,
        players: [],
        stats: et.stats || emptyStats(),
        seasonStats: emptyStats(),
        trophies: et.trophies || [],
        aiFormation: rand(0, FORMATIONS.length - 1),
      };

      const positions: string[] = [];
      for (const [pos, cnt] of Object.entries(SQUAD_COMP)) {
        for (let i = 0; i < cnt; i++) positions.push(pos);
      }
      for (const pos of positions) {
        team.players.push(
          makePlayer(genName(cty), pos as any, genSkill(4), 18 + rand(0, 15)),
        );
      }
      G.teams.push(team);
    }

    const enteredTeam = G.teams.find(tm => tm.name === et.name);
    if (enteredTeam) {
      moves.push({ team: enteredTeam, from: 0, to: 4, type: 'enter' });
    }
  }

  /* ---- Financial Awards ---- */
  const financialAwards: FinancialAward[] = [];

  /* Prize money: Div 1 Champion & Runner-up */
  const champAward = changes.find(a => a.award === 'gold_trophy');
  const runnerAward = changes.find(a => a.award === 'silver_trophy');

  if (champAward && champAward.team) {
    G.budgets[champAward.team.id] = (G.budgets[champAward.team.id] || 0) + PRIZE_MONEY.div1Champion;
    financialAwards.push({ team: champAward.team, type: 'champion', amount: PRIZE_MONEY.div1Champion });
  }
  if (runnerAward && runnerAward.team) {
    G.budgets[runnerAward.team.id] = (G.budgets[runnerAward.team.id] || 0) + PRIZE_MONEY.div1RunnerUp;
    financialAwards.push({ team: runnerAward.team, type: 'runnerUp', amount: PRIZE_MONEY.div1RunnerUp });
  }

  /* Promotion bonus: $2,500 per promoted team */
  for (const m of moves) {
    if (m.type === 'promote' && m.team) {
      G.budgets[m.team.id] = (G.budgets[m.team.id] || 0) + PRIZE_MONEY.promotionBonus;
      financialAwards.push({ team: m.team, type: 'promotion', amount: PRIZE_MONEY.promotionBonus });
    }
  }

  /* Avoid relegation bonus */
  for (let d = 1; d <= 3; d++) {
    const divMoves = moves.filter(m => m.from === d);
    const promotedIds = new Set(divMoves.filter(m => m.type === 'promote').map(m => m.team.id));
    const relegatedIds = new Set(
      divMoves.filter(m => m.type === 'relegate' || m.type === 'out').map(m => m.team.id),
    );

    const survivors = G.teams.filter(
      tm => tm.div === d && !promotedIds.has(tm.id) && !relegatedIds.has(tm.id),
    );
    const sortedSurvivors = survivors.sort((a, b) => {
      if (a.seasonStats.pts !== b.seasonStats.pts) return a.seasonStats.pts - b.seasonStats.pts;
      const gdA = a.seasonStats.gf - a.seasonStats.ga;
      const gdB = b.seasonStats.gf - b.seasonStats.ga;
      return gdA - gdB;
    });

    const avoidCount = Math.min(2, sortedSurvivors.length);
    for (let i = 0; i < avoidCount; i++) {
      const tm = sortedSurvivors[i];
      G.budgets[tm.id] = (G.budgets[tm.id] || 0) + PRIZE_MONEY.avoidRelegation;
      financialAwards.push({ team: tm, type: 'avoidRelegation', amount: PRIZE_MONEY.avoidRelegation });
    }
  }

  /* Relegation payment */
  for (const m of moves) {
    if (m.type === 'relegate' && m.team) {
      G.budgets[m.team.id] = (G.budgets[m.team.id] || 0) + PRIZE_MONEY.relegation;
      financialAwards.push({ team: m.team, type: 'relegation', amount: PRIZE_MONEY.relegation });
    }
  }

  /* Parachute payment */
  for (const m of moves) {
    if ((m.type === 'relegate' || m.type === 'out') && m.team) {
      G.budgets[m.team.id] = (G.budgets[m.team.id] || 0) + PARACHUTE_PAYMENT;
      financialAwards.push({ team: m.team, type: 'parachute', amount: PARACHUTE_PAYMENT });
    }
  }

  /* Revenue sharing / Financial Fair Play */
  const div1Top = [champAward, runnerAward]
    .filter((a): a is SeasonAward => a != null && a.team != null)
    .map(a => a.team);
  const receivingTeams = G.teams.filter(tm => tm.div === 3 || tm.div === 4);

  if (div1Top.length >= 2 && receivingTeams.length > 0) {
    let solidarityPool = 0;
    for (const tm of div1Top) {
      const payment = rand(SOLIDARITY_PAYMENT.min, SOLIDARITY_PAYMENT.max);
      const actual = Math.min(payment, G.budgets[tm.id] || 0);
      G.budgets[tm.id] = (G.budgets[tm.id] || 0) - actual;
      solidarityPool += actual;
      if (actual > 0) {
        financialAwards.push({ team: tm, type: 'solidarityPaid', amount: actual });
      }
    }
    if (solidarityPool > 0 && receivingTeams.length > 0) {
      const perTeam = Math.floor(solidarityPool / receivingTeams.length);
      for (const tm of receivingTeams) {
        G.budgets[tm.id] = (G.budgets[tm.id] || 0) + perTeam;
        financialAwards.push({ team: tm, type: 'solidarityReceived', amount: perTeam });
      }
    }
  }

  /* ---- Financial setup for next season ---- */
  initBudgets(G);
  awardSeasonIncome(G);
  generateSeasonFreeAgents(G);
  G.transferLog = [];
  aiDoTransfers(G);
  G.transferWindow = true;
  G.transferReminderShown = false;

  return { awards: changes, moves, financialAwards };
};

// ---------------------------------------------------------------------------
// Start New Season
// ---------------------------------------------------------------------------

/**
 * Transition to a new season after the end-of-season summary is dismissed.
 *
 * Performs:
 * 1. **Skill bonuses** — top scorers per division get +1 skill, most-played
 *    player per team gets +1 skill.
 * 2. **Aging & retirement** — all players age +1; players 38+ retire and
 *    are replaced with regens. Skill decline is applied based on age tiers.
 * 3. **Development curves** — apply age-based development to all players.
 * 4. **Reset** — stamina, bench streak, injuries, and seasonal stats all reset.
 * 5. **Season increment** — G.season++, G.week = 1.
 * 6. **New fixtures** — fresh fixture schedule generated.
 *
 * @param G - The game state (mutated extensively).
 */
export const startNewSeason = (G: GameState): void => {
  /* ---- Season-end skill bonuses ---- */

  /* Top scorer of each division gets +1 skill */
  for (let d = 1; d <= 4; d++) {
    const divTeamIds = new Set(
      G.teams.filter(tm => tm.div === d).map(tm => tm.id),
    );
    const divScorers = Object.values(G.topScorers).filter(s => divTeamIds.has(s.teamId));

    if (divScorers.length) {
      const maxGoals = Math.max(...divScorers.map(s => s.goals));
      if (maxGoals > 0) {
        const topNames = divScorers.filter(s => s.goals === maxGoals);
        for (const top of topNames) {
          const tm = G.teams[top.teamId];
          if (!tm) continue;
          const player = tm.players.find(p => p.name === top.name);
          if (player) player.skill = Math.min(50, player.skill + 1);
        }
      }
    }
  }

  /* Most-played player on each team gets +1 skill */
  for (const tm of G.teams) {
    if (tm.div < 1 || tm.div > 4) continue;
    let bestPlayer: Player | null = null;
    let bestCount = 0;
    for (const p of tm.players) {
      const mp = (p as any).matchesPlayed || 0;
      if (mp > bestCount) {
        bestCount = mp;
        bestPlayer = p;
      }
    }
    if (bestPlayer && bestCount > 0) {
      bestPlayer.skill = Math.min(50, bestPlayer.skill + 1);
    }
  }

  /* ---- Age system: aging, skill decline, retirement & regen ---- */
  for (const tm of G.teams) {
    if (tm.div < 1 || tm.div > 4) continue;
    const cty = tm.country || '';

    for (let i = tm.players.length - 1; i >= 0; i--) {
      const p = tm.players[i];

      /* Age the player and check for retirement */
      const { retired } = agePlayer(p);

      if (retired) {
        /* Replace with a young regen in the same position */
        const regenPos = p.pos;
        tm.players.splice(i, 1);
        tm.players.push(makePlayer(genName(cty), regenPos, genSkill(tm.div), 18));
        continue;
      }

      /* Apply age-based development curve (NEW) */
      applyDevelopmentCurve(p);

      /* Legacy skill decline (kept for backward compatibility with existing balance) */
      if (p.age >= 36 && Math.random() < 0.60) {
        p.skill = Math.max(1, p.skill - 2);
      } else if (p.age >= 33 && Math.random() < 0.40) {
        p.skill = Math.max(1, p.skill - (Math.random() < 0.5 ? 2 : 1));
      } else if (p.age >= 30 && Math.random() < 0.20) {
        p.skill = Math.max(1, p.skill - 1);
      }
    }
  }

  /* ---- Reset stamina, bench streak, injuries for all players ---- */
  for (const tm of G.teams) {
    if (tm.div < 1 || tm.div > 4) continue;
    (tm as any).seasonInjuries = 0;
    for (const p of tm.players) {
      p.stamina = 100;
      p.benchStreak = 0;
      (p as any).matchesPlayed = 0;
      p.injuredFor = 0;
    }
  }

  /* ---- Increment season ---- */
  G.season++;
  G.week = 1;
  G.topScorers = {};

  /* ---- Reset season stats ---- */
  for (const tm of G.teams) {
    if (tm.div >= 1 && tm.div <= 4) {
      tm.seasonStats = emptyStats();
      tm.players.forEach(p => {
        p.selected = false;
        p.seasonGoals = 0;
        p.seasonApps = 0;
        p.seasonYellows = 0;
        p.seasonReds = 0;
        p.form = 0;
        p.formStreak = 0;
        p.suspendedFor = 0;
      });
      /* Randomise AI formations for the new season */
      if (tm.id !== G.playerTeamId) {
        tm.aiFormation = rand(0, FORMATIONS.length - 1);
      }
    }
  }

  /* ---- Assign rival relationships (#13) ---- */
  assignRivals(G);

  /* ---- Generate youth prospects (#14) ---- */
  generateYouthProspects(G);

  /* ---- Return loaned players (#8) ---- */
  returnLoans(G);

  /* ---- Decay morale toward 0 (#4) ---- */
  for (const tm of G.teams) {
    if (tm.div >= 1 && tm.div <= 4) {
      const m = tm.morale ?? 0;
      if (m > 0) tm.morale = m - 1;
      else if (m < 0) tm.morale = m + 1;
    }
  }

  /* ---- Apply sponsorship income (#6) ---- */
  applySponsorshipIncome(G);

  /* ---- Apply stadium income bonus (#7) ---- */
  applyFacilityIncome(G);

  /* ---- Generate new fixtures ---- */
  generateFixtures(G);
};

// ---------------------------------------------------------------------------
// Rival Assignment (#13)
// ---------------------------------------------------------------------------

/**
 * Assign rival team IDs based on configured rival pairs.
 */
export const assignRivals = (G: GameState): void => {
  for (const [nameA, nameB] of RIVAL_PAIRS) {
    const teamA = G.teams.find(t => t.name === nameA);
    const teamB = G.teams.find(t => t.name === nameB);
    if (teamA && teamB) {
      if (!teamA.rivals) teamA.rivals = [];
      if (!teamB.rivals) teamB.rivals = [];
      if (!teamA.rivals.includes(teamB.id)) teamA.rivals.push(teamB.id);
      if (!teamB.rivals.includes(teamA.id)) teamB.rivals.push(teamA.id);
    }
  }
};

// ---------------------------------------------------------------------------
// Youth Academy Pipeline (#14)
// ---------------------------------------------------------------------------

/**
 * Generate 1-2 youth prospects at the start of each season.
 * Quality scales with division and youth academy facility level.
 */
export const generateYouthProspects = (G: GameState): void => {
  if (G.playerTeamId == null) return;
  const pt = G.teams[G.playerTeamId];
  const cty = pt.country || '';
  const academyLevel = G.facilities?.youthAcademy ?? 0;
  const count = 1 + (Math.random() < 0.5 ? 1 : 0);

  const prospects: YouthProspect[] = [];
  for (let i = 0; i < count; i++) {
    const baseSkill = genSkill(pt.div) + (academyLevel * YOUTH_ACADEMY_SKILL_BONUS);
    const age = 16 + rand(0, 1);
    const pos = (['DEF', 'MID', 'STR'] as const)[rand(0, 2)];
    const role = (ROLES_BY_POSITION[pos] || [null])[rand(0, ROLES_BY_POSITION[pos].length - 1)] as PlayerRole;
    const player = makePlayer(genName(cty), pos, baseSkill, age, { role });
    prospects.push({ player, promoted: false });
  }
  G.youthProspects = prospects;
};

// ---------------------------------------------------------------------------
// Loan System (#8)
// ---------------------------------------------------------------------------

/**
 * Return all loaned players to their parent clubs at season end.
 */
export const returnLoans = (G: GameState): void => {
  if (!G.loans || G.loans.length === 0) return;
  if (G.playerTeamId == null) return;

  const pt = G.teams[G.playerTeamId];
  for (const loan of G.loans) {
    /* Remove loaned player from player's squad */
    const idx = pt.players.findIndex(p => p.name === loan.player.name);
    if (idx >= 0) pt.players.splice(idx, 1);
  }
  G.loans = [];
};

// ---------------------------------------------------------------------------
// Sponsorship Income (#6)
// ---------------------------------------------------------------------------

/**
 * Apply sponsorship income at season start.
 * Checks if team still qualifies for their sponsor tier.
 */
export const applySponsorshipIncome = (G: GameState): void => {
  if (G.playerTeamId == null || !G.sponsorship) return;
  const pt = G.teams[G.playerTeamId];

  /* Check if team still qualifies */
  if (pt.div > G.sponsorship.requiredDiv) {
    G.sponsorship = null; /* Lost sponsor due to relegation */
    return;
  }

  G.budgets[G.playerTeamId] = (G.budgets[G.playerTeamId] || 0) + G.sponsorship.incomePerSeason;
};

// ---------------------------------------------------------------------------
// Facility Income (#7)
// ---------------------------------------------------------------------------

/**
 * Apply stadium upgrade income bonus at season start.
 */
export const applyFacilityIncome = (G: GameState): void => {
  if (G.playerTeamId == null) return;
  const stadiumLevel = G.facilities?.stadium ?? 0;
  if (stadiumLevel > 0) {
    G.budgets[G.playerTeamId] = (G.budgets[G.playerTeamId] || 0) + (stadiumLevel * STADIUM_INCOME_BONUS);
  }
};

// ---------------------------------------------------------------------------
// Season Awards (#15)
// ---------------------------------------------------------------------------

/**
 * Calculate season awards from existing data.
 * Returns awards for display in the season-end overlay.
 */
export const calculateSeasonAwards = (G: GameState): SeasonAwardEntry[] => {
  const awards: SeasonAwardEntry[] = [];

  /* Golden Boot — top scorer per division (already tracked) */
  const allScorers = Object.values(G.topScorers).sort((a, b) => b.goals - a.goals);
  if (allScorers.length && allScorers[0].goals > 0) {
    const top = allScorers[0];
    const tm = G.teams[top.teamId];
    awards.push({
      type: 'goldenBoot',
      playerName: top.name,
      teamName: tm ? tm.name : '',
      value: top.goals,
    });
  }

  /* Player of the Season — highest goals+apps combo on player's team */
  if (G.playerTeamId != null) {
    const pt = G.teams[G.playerTeamId];
    let best: Player | null = null;
    let bestScore = 0;
    for (const p of pt.players) {
      const score = (p.seasonGoals || 0) * 3 + (p.seasonApps || 0);
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }
    if (best) {
      awards.push({
        type: 'playerOfSeason',
        playerName: best.name,
        teamName: pt.name,
        value: best.seasonGoals || 0,
      });
    }

    /* Best Young Player — under 21 with most skill improvement */
    let bestYoung: Player | null = null;
    let bestYoungGoals = 0;
    for (const p of pt.players) {
      if ((p.age || 25) <= 21 && (p.seasonGoals || 0) > bestYoungGoals) {
        bestYoungGoals = p.seasonGoals || 0;
        bestYoung = p;
      }
    }
    if (bestYoung) {
      awards.push({
        type: 'bestYoung',
        playerName: bestYoung.name,
        teamName: pt.name,
        value: bestYoungGoals,
      });
    }
  }

  return awards;
};
