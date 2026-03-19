/**
 * game-state.ts -- Core mutable game state and initialisation functions.
 *
 * Exports:
 *   - `G`                -- The single source of truth for all mutable game data.
 *   - `emptyStats()`     -- Create a zeroed Stats object.
 *   - `defaultRecords()` -- Create a fresh Records object for the Trophy Room.
 *   - `initNewGame()`    -- Set up all teams, fixtures, budgets, and markets for season 1.
 *   - `generateFixtures()` -- Build round-robin home-and-away fixtures for each division.
 *   - `initBudgets()`    -- Ensure every team has a starting budget entry.
 *
 * Design decisions:
 *   - `G` is intentionally a mutable `let` binding so that `loadGame()` can
 *     wholesale-assign properties onto it via `Object.assign`.
 *   - Transfer-related helpers (`initBudgets`, `generateSeasonFreeAgents`) are
 *     imported from the transfers module to avoid duplicating budget/market logic.
 *   - The waiting pool is a shallow copy of `WAITING_TEAMS_DATA` so that the
 *     original constant stays pristine across new-game cycles.
 */

import type {
  Fixture,
  FixturesByDivision,
  GameState,
  LeagueMatchResultRecord,
  LeagueMostGoalsRecord,
  LeagueRecords,
  LeagueStatRecord,
  LeagueTopScorerRecord,
  MatchResultRecord,
  MostGoalsRecord,
  Position,
  Records,
  StatRecord,
  Stats,
  Team,
  TopScorerRecord,
  WaitingTeam,
} from '../types';

import {
  DEFAULT_FORMATION_IDX,
  FORMATIONS,
  SQUAD_COMP,
  STARTING_BUDGET,
  TEAMS_DATA,
  WAITING_TEAMS_DATA,
} from '../config';

import { genName, genSkill, makePlayer, rand } from '../engine/player';
import { generateSeasonFreeAgents, initBudgets as _initBudgets } from '../engine/transfers';

// ---------------------------------------------------------------------------
// Stats Helper
// ---------------------------------------------------------------------------

/**
 * Create a zeroed-out Stats object.
 *
 * Used when initialising teams, resetting season stats, and any place
 * where a blank statistical record is needed.
 *
 * @returns A Stats object with all counters set to zero.
 */
export const emptyStats = (): Stats => ({
  p: 0,
  w: 0,
  d: 0,
  l: 0,
  gf: 0,
  ga: 0,
  pts: 0,
});

// ---------------------------------------------------------------------------
// Default Records (Trophy Room)
// ---------------------------------------------------------------------------

/**
 * Create a fresh Records object with all values at their initial defaults.
 *
 * "Best" records start at 0 (to be beaten upward), while "fewest" records
 * start at 999 (to be beaten downward). The Hall of Fame starts empty.
 *
 * @returns A fully-initialised Records object for the Trophy Room.
 */
export const defaultRecords = (): Records => {
  /* Player single-season personal bests */
  const bestPts: StatRecord = { value: 0, season: 0 };
  const bestWins: StatRecord = { value: 0, season: 0 };
  const fewestDefeats: StatRecord = { value: 999, season: 0 };
  const bestAttack: StatRecord = { value: 0, season: 0 };
  const bestDefence: StatRecord = { value: 999, season: 0 };
  const bestGD: StatRecord = { value: -999, season: 0 };
  const topScorerSeason: TopScorerRecord = { name: '', goals: 0, season: 0 };
  const biggestWin: MatchResultRecord = { score: '', opponent: '', season: 0, diff: 0 };
  const biggestDefeat: MatchResultRecord = { score: '', opponent: '', season: 0, diff: 0 };
  const mostGoalsMatch: MostGoalsRecord = { score: '', opponent: '', season: 0, total: 0 };
  const highestPower: StatRecord = { value: 0, season: 0 };

  /* League-wide records (any team, any season) */
  const league: LeagueRecords = {
    bestPts: { value: 0, season: 0, team: '' } as LeagueStatRecord,
    bestWins: { value: 0, season: 0, team: '' } as LeagueStatRecord,
    fewestDefeats: { value: 999, season: 0, team: '' } as LeagueStatRecord,
    bestAttack: { value: 0, season: 0, team: '' } as LeagueStatRecord,
    bestDefence: { value: 999, season: 0, team: '' } as LeagueStatRecord,
    bestGD: { value: -999, season: 0, team: '' } as LeagueStatRecord,
    topScorerSeason: { name: '', goals: 0, season: 0, team: '' } as LeagueTopScorerRecord,
    biggestWin: { score: '', team: '', opponent: '', season: 0, diff: 0 } as LeagueMatchResultRecord,
    biggestDefeat: { score: '', team: '', opponent: '', season: 0, diff: 0 } as LeagueMatchResultRecord,
    mostGoalsMatch: { score: '', team: '', opponent: '', season: 0, total: 0 } as LeagueMostGoalsRecord,
    highestPower: { value: 0, season: 0, team: '' } as LeagueStatRecord,
  };

  return {
    bestPts,
    bestWins,
    fewestDefeats,
    bestAttack,
    bestDefence,
    bestGD,
    topScorerSeason,
    biggestWin,
    biggestDefeat,
    mostGoalsMatch,
    highestPower,
    league,
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
  };
};

// ---------------------------------------------------------------------------
// Mutable Game State
// ---------------------------------------------------------------------------

/**
 * `G` -- The master game state object.
 *
 * This is the single source of truth for all mutable game data. Every module
 * that needs to read or write game state imports this reference. The save
 * system serialises it to localStorage and the load system hydrates it back
 * via `Object.assign(G, data)`.
 *
 * Initial values here represent an uninitialised / pre-game state. Call
 * `initNewGame()` to properly populate everything for season 1.
 */
export let G: GameState = {
  manager: '',
  playerTeamId: null,
  season: 1,
  week: 1,
  teams: [],
  fixtures: {},

  /* Waiting / Return Pools */
  waitingPool: [],
  returnPool: [],

  /* UI State */
  sortByPos: true,
  matchInProgress: false,
  tableDivTab: 4,
  calDivTab: 4,
  scorersDivTab: 0,

  /* Scoring */
  topScorers: {},

  /* History */
  seasonHistory: [],

  /* Transfer Market */
  freeAgents: [],
  budgets: {},
  transferWindow: false,
  transferLog: [],
  usedFreeSign: false,

  /* Trophy Room */
  records: null,

  /* Formation */
  selectedFormationIdx: DEFAULT_FORMATION_IDX,

  /* Tactics & Training */
  tactic: 'balanced',
  trainingFocus: 'balanced',

  /* Cup */
  cup: null,

  /* Animated Match (transient) */
  matchSubs: 0,
  matchRedCards: [],

  /* Player Profile */
  viewingPlayerId: null,
};

// ---------------------------------------------------------------------------
// Fixture Generation (Round-Robin)
// ---------------------------------------------------------------------------

/**
 * Generate round-robin home-and-away fixtures for every division.
 *
 * The algorithm uses the "circle method" (also called the polygon scheduling
 * algorithm):
 *   1. Fix the first team in place.
 *   2. Rotate the remaining teams through each round.
 *   3. Pair team[i] with team[n-1-i] for each slot.
 *   4. After all single-round combinations, duplicate them with home/away
 *      swapped to create the return fixtures.
 *
 * This produces `(n - 1) * 2` rounds per division (14 rounds for 8 teams),
 * with `n / 2` matches per round (4 matches for 8 teams).
 *
 * The result is stored in `G.fixtures`, keyed by division number.
 */
export const generateFixtures = (): void => {
  G.fixtures = {} as FixturesByDivision;

  for (let d = 1; d <= 4; d++) {
    const divTeams = G.teams.filter(tm => tm.div === d);
    if (divTeams.length < 2) continue;

    const n = divTeams.length;
    const ids = divTeams.map(tm => tm.id);
    const half = Math.floor(n / 2);

    /* The first team is "fixed" — the rest rotate around it */
    const fixed = ids[0];
    const rotating = ids.slice(1);

    /* Generate one round per rotation of the non-fixed teams */
    const rounds: Array<[number, number][]> = [];
    for (let r = 0; r < n - 1; r++) {
      const round: Array<[number, number]> = [];
      const current = [fixed, ...rotating];
      for (let i = 0; i < half; i++) {
        round.push([current[i], current[n - 1 - i]]);
      }
      /* Rotate: move first element of rotating to the end */
      rotating.push(rotating.shift()!);
      rounds.push(round);
    }

    /* First leg (home/away as generated) + second leg (swapped) */
    const divFix: Fixture[][] = [];

    for (const round of rounds) {
      divFix.push(
        round.map(([h, a]) => ({
          home: h,
          away: a,
          homeGoals: null,
          awayGoals: null,
          events: [],
        })),
      );
    }
    for (const round of rounds) {
      divFix.push(
        round.map(([h, a]) => ({
          home: a,
          away: h,
          homeGoals: null,
          awayGoals: null,
          events: [],
        })),
      );
    }

    G.fixtures[d] = divFix;
  }
};

// ---------------------------------------------------------------------------
// Budget Initialisation (delegated to transfers module)
// ---------------------------------------------------------------------------

/**
 * Ensure every team in `G.teams` has a budget entry.
 *
 * Teams without an existing budget receive `STARTING_BUDGET` ($10,000).
 * This thin wrapper delegates to the transfers module's `initBudgets`
 * to keep budget logic centralised.
 */
export const initBudgets = (): void => {
  _initBudgets(G);
};

// ---------------------------------------------------------------------------
// New Game Initialisation
// ---------------------------------------------------------------------------

/**
 * Initialise a brand-new game from scratch.
 *
 * This is the entry point when the player clicks "New Game" on the welcome
 * screen. It:
 *   1. Resets all state fields to their defaults.
 *   2. Creates all 32 teams from `TEAMS_DATA`, each with a full squad
 *      generated according to their division's skill range.
 *   3. Populates the waiting pool from `WAITING_TEAMS_DATA`.
 *   4. Generates the season's round-robin fixtures.
 *   5. Initialises team budgets and the free-agent market.
 *
 * The human player's team is NOT assigned here -- that's deferred to the
 * welcome screen's team-picker flow.
 */
export const initNewGame = (): void => {
  /* Reset core state */
  G.teams = [];
  G.season = 1;
  G.week = 1;
  G.topScorers = {};
  G.seasonHistory = [];
  G.freeAgents = [];
  G.budgets = {};
  G.transferWindow = true;
  G.transferReminderShown = false;
  G.transferLog = [];
  G.usedFreeSign = false;
  G.records = defaultRecords();
  G.selectedFormationIdx = DEFAULT_FORMATION_IDX;
  G.tactic = 'balanced';
  G.trainingFocus = 'balanced';
  G.cup = null;
  G.matchSubs = 0;
  G.matchRedCards = [];
  G.viewingPlayerId = null;
  G.facilities = { trainingFacility: 0, youthAcademy: 0, stadium: 0 };
  G.sponsorship = null;
  G.scoutLevel = 0;
  G.loans = [];
  G.youthProspects = [];

  /* Create all 32 teams from the data table */
  for (const td of TEAMS_DATA) {
    const team: Team = {
      id: G.teams.length,
      name: td.name,
      div: td.div,
      c1: td.c1,
      c2: td.c2,
      country: td.country,
      players: [],
      stats: emptyStats(),
      seasonStats: emptyStats(),
      trophies: [],
      /* Random formation for AI -- reassigned each season */
      aiFormation: rand(0, FORMATIONS.length - 1),
    };

    /* Build squad from the standard composition (2 GK, 7 DEF, 7 MID, 6 STR) */
    const positions: Position[] = [];
    for (const [pos, cnt] of Object.entries(SQUAD_COMP)) {
      for (let i = 0; i < cnt; i++) {
        positions.push(pos as Position);
      }
    }
    for (const pos of positions) {
      team.players.push(
        makePlayer(genName(td.country), pos, genSkill(td.div), rand(18, 33)),
      );
    }

    G.teams.push(team);
  }

  /* Copy waiting-pool teams (shallow clone to avoid mutating the constant) */
  G.waitingPool = WAITING_TEAMS_DATA.map(td => ({
    name: td.name,
    c1: td.c1,
    c2: td.c2,
    country: td.country,
  }));
  G.returnPool = [];

  /* Generate the season's fixtures */
  generateFixtures();

  /* Player team is NOT assigned here -- deferred to welcome screen selectTeam() */
  G.playerTeamId = null;

  /* Initialise budgets and free-agent market */
  initBudgets();
  generateSeasonFreeAgents(G);
};
