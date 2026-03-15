/**
 * Cup competition module — handles bracket generation, cup match
 * simulation, round advancement, and cup final resolution.
 *
 * The cup is a single-elimination knockout tournament with all teams
 * from divisions 1-4. Teams are randomly seeded into a bracket, and
 * if the number of teams is odd, some receive byes.
 */

import type { CupMatch, CupState, GameState } from '../types';
import { CUP_PRIZE, CUP_ROUNDS, CUP_WEEKS } from '../config';
import { autoSelectAI, getTeamAvgRating } from './match';
import { rand } from './player';

// ---------------------------------------------------------------------------
// Bracket Generation
// ---------------------------------------------------------------------------

/**
 * Generate a new cup bracket at the start of each season.
 *
 * All teams in divisions 1-4 are entered and randomly shuffled. They are
 * then paired into round-of-32 fixtures. If there's an odd number of
 * teams, the last team gets a bye (auto-advances).
 *
 * The bracket is stored in `G.cup` with:
 * - `active: true` — the cup is in progress.
 * - `round: 0` — starting at the first round (Round of 32).
 * - `rounds: [[...]]` — nested array of fixtures per round.
 * - `playerEliminated: false` — human player is still in.
 * - `winner: null` — no winner yet.
 *
 * @param G - The game state (mutated: G.cup is overwritten).
 */
export const generateCupBracket = (G: GameState): void => {
  /* Collect all teams in divisions 1-4 */
  const cupTeams = G.teams
    .filter(tm => tm.div >= 1 && tm.div <= 4)
    .map(tm => tm.id);

  /* Shuffle for random draw using Fisher-Yates */
  for (let i = cupTeams.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [cupTeams[i], cupTeams[j]] = [cupTeams[j], cupTeams[i]];
  }

  /* Build round-of-32 (16 matches). If fewer than 32 teams, some get byes */
  const r32: CupMatch[] = [];
  for (let i = 0; i < cupTeams.length; i += 2) {
    if (i + 1 < cupTeams.length) {
      r32.push({
        home: cupTeams[i],
        away: cupTeams[i + 1],
        homeGoals: null,
        awayGoals: null,
        played: false,
      });
    } else {
      /* Bye: team advances automatically */
      r32.push({
        home: cupTeams[i],
        away: null,
        homeGoals: null,
        awayGoals: null,
        played: true,
        bye: true,
      });
    }
  }

  G.cup = {
    active: true,
    round: 0,
    rounds: [r32],
    playerEliminated: false,
    winner: null,
  };
};

// ---------------------------------------------------------------------------
// Cup Match Simulation (for non-final rounds)
// ---------------------------------------------------------------------------

/**
 * Simulate the current cup round during the designated cup week.
 *
 * This function is called during `playMatch()` on each cup-designated week.
 * It handles all non-final cup matches:
 * 1. Checks if the current week matches the cup round schedule.
 * 2. Simulates each unplayed match using strength-based Poisson.
 * 3. Resolves draws via coin-flip (slight home advantage: 55%).
 * 4. Tracks whether the human player was eliminated.
 * 5. Builds the next round's fixtures from the winners.
 *
 * The **Final** is excluded here — it gets the full animated treatment
 * via `animateCupFinal()` in the UI layer.
 *
 * @param G - The game state (mutated in-place).
 */
export const simulateCupWeek = (G: GameState): void => {
  if (!G.cup || !G.cup.active) return;

  const roundIdx = G.cup.round;
  if (roundIdx >= CUP_ROUNDS.length) return;

  /* Gate: only simulate on designated cup weeks */
  if (CUP_WEEKS[roundIdx] !== G.week) return;

  /* Skip the Final — handled by UI animation */
  if (roundIdx === CUP_ROUNDS.length - 1) return;

  const matches = G.cup.rounds[roundIdx];
  if (!matches) return;

  /* Simulate each unplayed match */
  for (const m of matches) {
    if (m.played) continue;
    if (m.bye) {
      m.played = true;
      continue;
    }
    if (m.away == null) {
      m.played = true;
      continue;
    }

    const ht = G.teams[m.home];
    const at = G.teams[m.away];
    if (!ht || !at) {
      m.played = true;
      continue;
    }

    /* Quick sim using strength-based expected goals */
    autoSelectAI(ht, G.playerTeamId!);
    autoSelectAI(at, G.playerTeamId!);
    const hs = getTeamAvgRating(ht);
    const as_ = getTeamAvgRating(at);

    const homeExp = Math.max(0.3, (hs - as_) / 15 + 1.15);
    const awayExp = Math.max(0.3, (as_ - hs) / 15 + 1.0);

    let hg = 0;
    let ag = 0;
    for (let i = 0; i < 90; i++) {
      if (Math.random() < homeExp / 90) hg++;
      if (Math.random() < awayExp / 90) ag++;
    }

    /* If draw, decide by coin-flip (slight home advantage) */
    if (hg === ag) {
      if (Math.random() < 0.55) hg++;
      else ag++;
    }

    m.homeGoals = hg;
    m.awayGoals = ag;
    m.played = true;
  }

  /* Check if player was eliminated */
  const playerMatch = matches.find(
    m => m.home === G.playerTeamId || m.away === G.playerTeamId,
  );
  if (playerMatch && playerMatch.played && !playerMatch.bye) {
    const playerIsHome = playerMatch.home === G.playerTeamId;
    const playerWon = playerIsHome
      ? playerMatch.homeGoals! > playerMatch.awayGoals!
      : playerMatch.awayGoals! > playerMatch.homeGoals!;
    if (!playerWon) G.cup.playerEliminated = true;
  }

  /* Build next round from winners */
  const winners: number[] = [];
  for (const m of matches) {
    if (m.bye) {
      winners.push(m.home);
      continue;
    }
    if (!m.played) continue;
    winners.push(m.homeGoals! > m.awayGoals! ? m.home : m.away!);
  }

  if (winners.length <= 1 && roundIdx === CUP_ROUNDS.length - 1) {
    /* Final is done — award cup */
    _awardCup(G, winners[0] || null);
  } else if (winners.length > 1) {
    /* Generate next round fixtures */
    const nextRound: CupMatch[] = [];
    for (let i = 0; i < winners.length; i += 2) {
      if (i + 1 < winners.length) {
        nextRound.push({
          home: winners[i],
          away: winners[i + 1],
          homeGoals: null,
          awayGoals: null,
          played: false,
        });
      } else {
        nextRound.push({
          home: winners[i],
          away: null,
          homeGoals: null,
          awayGoals: null,
          played: true,
          bye: true,
        });
      }
    }
    G.cup.rounds.push(nextRound);
    G.cup.round++;
  } else {
    G.cup.round++;
  }
};

// ---------------------------------------------------------------------------
// Cup Final Resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the cup final after it has been simulated/animated.
 *
 * This should be called by the UI layer after the cup final match
 * has been played (either via instant sim or animated playback).
 * It determines the winner from the final round's fixture and awards
 * the cup trophy plus prize money.
 *
 * @param G - The game state (mutated in-place).
 * @param homeGoals - Goals scored by the home team in the final.
 * @param awayGoals - Goals scored by the away team in the final.
 */
export const resolveCupFinal = (G: GameState, homeGoals: number, awayGoals: number): void => {
  if (!G.cup || !G.cup.active) return;

  const finalRound = G.cup.rounds[G.cup.round];
  if (!finalRound || !finalRound.length) return;

  const finalMatch = finalRound[0];
  finalMatch.homeGoals = homeGoals;
  finalMatch.awayGoals = awayGoals;
  finalMatch.played = true;

  const winnerId = homeGoals > awayGoals ? finalMatch.home : finalMatch.away!;
  _awardCup(G, winnerId);
};

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Award the cup to the winning team — trophy + prize money.
 */
const _awardCup = (G: GameState, winnerId: number | null): void => {
  G.cup!.winner = winnerId;
  G.cup!.active = false;

  if (winnerId != null) {
    const winTeam = G.teams[winnerId];
    if (winTeam) {
      winTeam.trophies.push({ type: 'cup', season: G.season });

      /* Prize money */
      if (winnerId === G.playerTeamId) {
        G.budgets[winnerId] = (G.budgets[winnerId] || 0) + CUP_PRIZE;
      }
    }
  }
};
