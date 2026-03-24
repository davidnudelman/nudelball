/**
 * tests/league.test.ts — Unit tests for src/engine/league.ts
 *
 * Covers: emptyStats, generateFixtures, getSortedDiv
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  emptyStats,
  generateFixtures,
  getSortedDiv,
} from '../src/engine/league';
import { makePlayer, genSkill, genName } from '../src/engine/player';
import { TEAMS_PER_DIV, SEASON_WEEKS, SQUAD_COMP, DEFAULT_FORMATION_IDX } from '../src/config';
import type { GameState, Team, Position, Stats } from '../src/types';

/* ================================================================
   Helper: build a minimal game state with teams for fixture generation
   ================================================================ */
const buildGameStateForLeague = (): GameState => {
  const teams: Team[] = [];

  /* Create 32 teams: 8 per division */
  for (let d = 1; d <= 4; d++) {
    for (let t = 0; t < TEAMS_PER_DIV; t++) {
      const id = teams.length;
      const positions: Position[] = [];
      for (const [pos, cnt] of Object.entries(SQUAD_COMP)) {
        for (let i = 0; i < cnt; i++) {
          positions.push(pos as Position);
        }
      }

      const players = positions.map(pos =>
        makePlayer(genName('EN'), pos, genSkill(d), 25),
      );

      teams.push({
        id,
        name: `Team_${d}_${t}`,
        div: d,
        c1: '#ff0000',
        c2: '#0000ff',
        country: 'EN',
        players,
        stats: emptyStats(),
        seasonStats: emptyStats(),
        trophies: [],
        aiFormation: DEFAULT_FORMATION_IDX,
      });
    }
  }

  return {
    manager: 'Test',
    playerTeamId: 0,
    season: 1,
    week: 1,
    teams,
    fixtures: {},
    waitingPool: [],
    returnPool: [],
    sortByPos: true,
    matchInProgress: false,
    tableDivTab: 1,
    calDivTab: 1,
    scorersDivTab: 0,
    topScorers: {},
    seasonHistory: [],
    freeAgents: [],
    budgets: {},
    transferWindow: false,
    transferLog: [],
    usedFreeSign: false,
    records: null,
    selectedFormationIdx: DEFAULT_FORMATION_IDX,
    tactic: 'balanced',
    trainingFocus: 'balanced',
    matchSubs: 0,
    matchRedCards: [],
    viewingPlayerId: null,
  };
};

/* ================================================================
   emptyStats() — zeroed stats object
   ================================================================ */
describe('emptyStats()', () => {
  it('returns an object with all values set to 0', () => {
    const stats = emptyStats();
    expect(stats.p).toBe(0);
    expect(stats.w).toBe(0);
    expect(stats.d).toBe(0);
    expect(stats.l).toBe(0);
    expect(stats.gf).toBe(0);
    expect(stats.ga).toBe(0);
    expect(stats.pts).toBe(0);
  });

  it('returns a new object each time (not shared reference)', () => {
    const a = emptyStats();
    const b = emptyStats();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it('has exactly the expected keys', () => {
    const stats = emptyStats();
    const keys = Object.keys(stats).sort();
    expect(keys).toEqual(['d', 'ga', 'gf', 'l', 'p', 'pts', 'w']);
  });
});

/* ================================================================
   generateFixtures() — round-robin fixture schedule
   ================================================================ */
describe('generateFixtures()', () => {
  let G: GameState;

  beforeEach(() => {
    G = buildGameStateForLeague();
  });

  it('creates fixtures for all 4 divisions', () => {
    generateFixtures(G);
    expect(G.fixtures).toHaveProperty('1');
    expect(G.fixtures).toHaveProperty('2');
    expect(G.fixtures).toHaveProperty('3');
    expect(G.fixtures).toHaveProperty('4');
  });

  it('creates the correct number of rounds per division (14 for 8 teams)', () => {
    generateFixtures(G);
    for (let d = 1; d <= 4; d++) {
      expect(G.fixtures[d]).toHaveLength(SEASON_WEEKS); /* 14 rounds */
    }
  });

  it('creates the correct number of matches per round (4 for 8 teams)', () => {
    generateFixtures(G);
    for (let d = 1; d <= 4; d++) {
      for (const round of G.fixtures[d]) {
        expect(round).toHaveLength(TEAMS_PER_DIV / 2); /* 4 matches */
      }
    }
  });

  it('each team plays every other team twice (home and away)', () => {
    generateFixtures(G);

    for (let d = 1; d <= 4; d++) {
      const divTeams = G.teams.filter(t => t.div === d);
      const teamIds = divTeams.map(t => t.id);

      /* Build a matchup counter: key = "homeId_awayId" */
      const matchups: Record<string, number> = {};
      for (const round of G.fixtures[d]) {
        for (const f of round) {
          const key = `${f.home}_${f.away}`;
          matchups[key] = (matchups[key] || 0) + 1;
        }
      }

      /* Each ordered pair (A, B) where A !== B should appear exactly once */
      for (const a of teamIds) {
        for (const b of teamIds) {
          if (a === b) continue;
          const key = `${a}_${b}`;
          expect(matchups[key]).toBe(1);
        }
      }
    }
  });

  it('no team plays itself', () => {
    generateFixtures(G);
    for (let d = 1; d <= 4; d++) {
      for (const round of G.fixtures[d]) {
        for (const f of round) {
          expect(f.home).not.toBe(f.away);
        }
      }
    }
  });

  it('each team plays exactly once per round', () => {
    generateFixtures(G);
    for (let d = 1; d <= 4; d++) {
      for (const round of G.fixtures[d]) {
        const teamsInRound = new Set<number>();
        for (const f of round) {
          teamsInRound.add(f.home);
          teamsInRound.add(f.away);
        }
        /* Each team should appear exactly once per round */
        expect(teamsInRound.size).toBe(TEAMS_PER_DIV);
      }
    }
  });

  it('all fixtures start unplayed (goals null, events empty)', () => {
    generateFixtures(G);
    for (let d = 1; d <= 4; d++) {
      for (const round of G.fixtures[d]) {
        for (const f of round) {
          expect(f.homeGoals).toBeNull();
          expect(f.awayGoals).toBeNull();
          expect(f.events).toEqual([]);
        }
      }
    }
  });

  it('total fixtures per division equals n*(n-1) where n = teams per div', () => {
    generateFixtures(G);
    const n = TEAMS_PER_DIV; /* 8 */
    const expectedTotalFixtures = n * (n - 1); /* 56 */

    for (let d = 1; d <= 4; d++) {
      let totalFixtures = 0;
      for (const round of G.fixtures[d]) {
        totalFixtures += round.length;
      }
      expect(totalFixtures).toBe(expectedTotalFixtures);
    }
  });
});

/* ================================================================
   getSortedDiv() — standings sort
   ================================================================ */
describe('getSortedDiv()', () => {
  let G: GameState;

  beforeEach(() => {
    G = buildGameStateForLeague();
  });

  it('returns teams sorted by points (descending)', () => {
    const divTeams = G.teams.filter(t => t.div === 1);
    /* Give different point totals */
    divTeams[0].seasonStats.pts = 10;
    divTeams[1].seasonStats.pts = 20;
    divTeams[2].seasonStats.pts = 15;

    const sorted = getSortedDiv(G, 1);
    expect(sorted[0].seasonStats.pts).toBe(20);
    expect(sorted[1].seasonStats.pts).toBe(15);
    expect(sorted[2].seasonStats.pts).toBe(10);
  });

  it('breaks ties by goal difference', () => {
    const divTeams = G.teams.filter(t => t.div === 1);
    divTeams[0].seasonStats.pts = 10;
    divTeams[0].seasonStats.gf = 15;
    divTeams[0].seasonStats.ga = 5; /* GD = +10 */

    divTeams[1].seasonStats.pts = 10;
    divTeams[1].seasonStats.gf = 10;
    divTeams[1].seasonStats.ga = 8; /* GD = +2 */

    const sorted = getSortedDiv(G, 1);
    const topTwo = sorted.filter(t => t.seasonStats.pts === 10);
    expect(topTwo[0].seasonStats.gf - topTwo[0].seasonStats.ga).toBeGreaterThan(
      topTwo[1].seasonStats.gf - topTwo[1].seasonStats.ga,
    );
  });

  it('breaks further ties by goals scored', () => {
    const divTeams = G.teams.filter(t => t.div === 1);
    divTeams[0].seasonStats.pts = 10;
    divTeams[0].seasonStats.gf = 20;
    divTeams[0].seasonStats.ga = 10; /* GD = +10 */

    divTeams[1].seasonStats.pts = 10;
    divTeams[1].seasonStats.gf = 15;
    divTeams[1].seasonStats.ga = 5; /* GD = +10 */

    const sorted = getSortedDiv(G, 1);
    const topTwo = sorted.filter(t => t.seasonStats.pts === 10);
    expect(topTwo[0].seasonStats.gf).toBeGreaterThanOrEqual(topTwo[1].seasonStats.gf);
  });

  it('returns only teams from the specified division', () => {
    const sorted = getSortedDiv(G, 2);
    for (const t of sorted) {
      expect(t.div).toBe(2);
    }
    expect(sorted).toHaveLength(TEAMS_PER_DIV);
  });
});
