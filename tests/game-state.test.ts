/**
 * tests/game-state.test.ts — Unit tests for src/state/game-state.ts
 *
 * Covers: initNewGame, defaultRecords, emptyStats, generateFixtures,
 *         team/squad composition, division distribution
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  G,
  initNewGame,
  defaultRecords,
  emptyStats,
} from '../src/state/game-state';
import {
  TEAMS_DATA,
  TEAMS_PER_DIV,
  SQUAD_COMP,
  STARTING_BUDGET,
  FREE_AGENTS_PER_SEASON,
  DEFAULT_FORMATION_IDX,
  WAITING_TEAMS_DATA,
  SEASON_WEEKS,
} from '../src/config';
import type { Position } from '../src/types';

/* ================================================================
   initNewGame() — full game initialisation
   ================================================================ */
describe('initNewGame()', () => {
  beforeEach(() => {
    initNewGame();
    /* initNewGame now handles division randomisation internally */
    G.playerTeamId = 0;
  });

  /* --- Team Count --- */
  it('creates 32 teams', () => {
    expect(G.teams).toHaveLength(32);
  });

  /* --- Division Distribution --- */
  it('distributes 8 teams per division', () => {
    for (let d = 1; d <= 4; d++) {
      const divTeams = G.teams.filter(t => t.div === d);
      expect(divTeams).toHaveLength(TEAMS_PER_DIV);
    }
  });

  it('teams are in divisions 1-4 only', () => {
    for (const t of G.teams) {
      expect(t.div).toBeGreaterThanOrEqual(1);
      expect(t.div).toBeLessThanOrEqual(4);
    }
  });

  /* --- Squad Composition --- */
  it('each team has the correct total number of players (22 per SQUAD_COMP)', () => {
    const expectedSquadSize = Object.values(SQUAD_COMP).reduce((a, b) => a + b, 0);
    for (const t of G.teams) {
      expect(t.players).toHaveLength(expectedSquadSize);
    }
  });

  it('each team has the correct number of players per position', () => {
    for (const t of G.teams) {
      const posCounts: Record<string, number> = { GK: 0, DEF: 0, MID: 0, STR: 0 };
      for (const p of t.players) {
        posCounts[p.pos] = (posCounts[p.pos] || 0) + 1;
      }
      expect(posCounts.GK).toBe(SQUAD_COMP.GK);   /* 2 */
      expect(posCounts.DEF).toBe(SQUAD_COMP.DEF); /* 7 */
      expect(posCounts.MID).toBe(SQUAD_COMP.MID); /* 7 */
      expect(posCounts.STR).toBe(SQUAD_COMP.STR); /* 6 */
    }
  });

  /* --- Player Properties --- */
  it('all players have valid skills (1-50)', () => {
    for (const t of G.teams) {
      for (const p of t.players) {
        expect(p.skill).toBeGreaterThanOrEqual(1);
        expect(p.skill).toBeLessThanOrEqual(50);
      }
    }
  });

  it('all players have stamina 100', () => {
    for (const t of G.teams) {
      for (const p of t.players) {
        expect(p.stamina).toBe(100);
      }
    }
  });

  it('all players have age 18-33', () => {
    for (const t of G.teams) {
      for (const p of t.players) {
        expect(p.age).toBeGreaterThanOrEqual(18);
        expect(p.age).toBeLessThanOrEqual(33);
      }
    }
  });

  it('all players have non-empty names', () => {
    for (const t of G.teams) {
      for (const p of t.players) {
        expect(p.name.length).toBeGreaterThan(0);
      }
    }
  });

  /* --- Team IDs --- */
  it('assigns sequential team IDs starting from 0', () => {
    for (let i = 0; i < G.teams.length; i++) {
      expect(G.teams[i].id).toBe(i);
    }
  });

  /* --- Team Properties --- */
  it('each team has colours (c1 and c2)', () => {
    for (const t of G.teams) {
      expect(t.c1).toMatch(/^#/);
      expect(t.c2).toMatch(/^#/);
    }
  });

  it('each team has a country code', () => {
    for (const t of G.teams) {
      expect(t.country.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('each team has empty stats and season stats', () => {
    for (const t of G.teams) {
      expect(t.stats.p).toBe(0);
      expect(t.stats.pts).toBe(0);
      expect(t.seasonStats.p).toBe(0);
      expect(t.seasonStats.pts).toBe(0);
    }
  });

  it('each team has an empty trophies array', () => {
    for (const t of G.teams) {
      expect(t.trophies).toEqual([]);
    }
  });

  it('each team has a valid aiFormation index', () => {
    for (const t of G.teams) {
      expect(t.aiFormation).toBeGreaterThanOrEqual(0);
      expect(t.aiFormation).toBeLessThan(8);
    }
  });

  /* --- Season & Week --- */
  it('starts at season 1, week 1', () => {
    expect(G.season).toBe(1);
    expect(G.week).toBe(1);
  });

  /* --- Player Team --- */
  it('playerTeamId is set after randomization', () => {
    expect(G.playerTeamId).not.toBeNull();
  });

  /* --- Fixtures --- */
  it('generates fixtures for all 4 divisions', () => {
    expect(G.fixtures).toHaveProperty('1');
    expect(G.fixtures).toHaveProperty('2');
    expect(G.fixtures).toHaveProperty('3');
    expect(G.fixtures).toHaveProperty('4');
  });

  it('each division has the correct number of rounds', () => {
    for (let d = 1; d <= 4; d++) {
      expect(G.fixtures[d]).toHaveLength(SEASON_WEEKS);
    }
  });

  /* --- Budgets --- */
  it('initialises budgets for all teams', () => {
    for (const t of G.teams) {
      expect(G.budgets[t.id]).toBe(STARTING_BUDGET);
    }
  });

  /* --- Free Agents --- */
  it('generates the season free agent pool', () => {
    expect(G.freeAgents).toHaveLength(FREE_AGENTS_PER_SEASON);
  });

  /* --- Waiting Pool --- */
  it('populates the waiting pool with unselected teams + WAITING_TEAMS_DATA', () => {
    /* Waiting pool should contain the original waiting teams plus any unselected from the pool */
    expect(G.waitingPool.length).toBeGreaterThanOrEqual(WAITING_TEAMS_DATA.length);
    /* All original waiting teams should be present */
    for (const wt of WAITING_TEAMS_DATA) {
      expect(G.waitingPool.some(wp => wp.name === wt.name)).toBe(true);
    }
  });

  /* --- Return Pool --- */
  it('starts with an empty return pool', () => {
    expect(G.returnPool).toEqual([]);
  });

  /* --- Records --- */
  it('initialises the records (trophy room)', () => {
    expect(G.records).not.toBeNull();
  });

  /* --- Transfer State --- */
  it('opens the transfer window', () => {
    expect(G.transferWindow).toBe(true);
  });

  it('starts with empty transfer log', () => {
    expect(G.transferLog).toEqual([]);
  });

  it('starts with usedFreeSign = false', () => {
    expect(G.usedFreeSign).toBe(false);
  });

  /* --- Tactics & Training --- */
  it('defaults tactic to balanced', () => {
    expect(G.tactic).toBe('balanced');
  });

  it('defaults training focus to balanced', () => {
    expect(G.trainingFocus).toBe('balanced');
  });

  it('defaults formation to 4-4-2 (index 4)', () => {
    expect(G.selectedFormationIdx).toBe(DEFAULT_FORMATION_IDX);
  });

});

/* ================================================================
   defaultRecords() — fresh trophy room records
   ================================================================ */
describe('defaultRecords()', () => {
  it('returns a valid records object', () => {
    const records = defaultRecords();
    expect(records).toBeDefined();
    expect(records).not.toBeNull();
  });

  it('has player personal best records', () => {
    const records = defaultRecords();
    expect(records.bestPts).toBeDefined();
    expect(records.bestWins).toBeDefined();
    expect(records.fewestDefeats).toBeDefined();
    expect(records.bestAttack).toBeDefined();
    expect(records.bestDefence).toBeDefined();
    expect(records.bestGD).toBeDefined();
    expect(records.topScorerSeason).toBeDefined();
    expect(records.biggestWin).toBeDefined();
    expect(records.biggestDefeat).toBeDefined();
    expect(records.mostGoalsMatch).toBeDefined();
    expect(records.highestPower).toBeDefined();
  });

  it('has league-wide records', () => {
    const records = defaultRecords();
    expect(records.league).toBeDefined();
    expect(records.league.bestPts).toBeDefined();
    expect(records.league.bestWins).toBeDefined();
    expect(records.league.fewestDefeats).toBeDefined();
    expect(records.league.bestAttack).toBeDefined();
    expect(records.league.bestDefence).toBeDefined();
    expect(records.league.bestGD).toBeDefined();
    expect(records.league.topScorerSeason).toBeDefined();
    expect(records.league.biggestWin).toBeDefined();
    expect(records.league.biggestDefeat).toBeDefined();
    expect(records.league.mostGoalsMatch).toBeDefined();
    expect(records.league.highestPower).toBeDefined();
  });

  it('has milestone counters', () => {
    const records = defaultRecords();
    expect(records.highestDiv).toBe(4);
    expect(records.totalPromotions).toBe(0);
    expect(records.totalRelegations).toBe(0);
    expect(records.consecutiveDiv1).toBe(0);
    expect(records.maxConsecutiveDiv1).toBe(0);
    expect(records.currentUnbeaten).toBe(0);
    expect(records.longestUnbeaten).toBe(0);
    expect(records.currentWinStreak).toBe(0);
    expect(records.longestWinStreak).toBe(0);
    expect(records.totalCleanSheets).toBe(0);
  });

  it('has an empty Hall of Fame', () => {
    const records = defaultRecords();
    expect(records.hallOfFame).toEqual({});
  });

  it('"best" records start at 0 and "fewest" records start high', () => {
    const records = defaultRecords();
    expect(records.bestPts.value).toBe(0);
    expect(records.bestWins.value).toBe(0);
    expect(records.fewestDefeats.value).toBe(999);
    expect(records.bestAttack.value).toBe(0);
    expect(records.bestDefence.value).toBe(999);
    expect(records.bestGD.value).toBe(-999);
  });

  it('returns a new object each time', () => {
    const a = defaultRecords();
    const b = defaultRecords();
    expect(a).not.toBe(b);
  });
});

/* ================================================================
   emptyStats() — zeroed stats object
   ================================================================ */
describe('emptyStats() (from game-state module)', () => {
  it('returns all zeros', () => {
    const stats = emptyStats();
    expect(stats.p).toBe(0);
    expect(stats.w).toBe(0);
    expect(stats.d).toBe(0);
    expect(stats.l).toBe(0);
    expect(stats.gf).toBe(0);
    expect(stats.ga).toBe(0);
    expect(stats.pts).toBe(0);
  });
});
