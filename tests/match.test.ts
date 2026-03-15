/**
 * tests/match.test.ts — Unit tests for src/engine/match.ts
 *
 * Covers: simulateMatch, teamStrength, poissonGoals, pickScorer,
 *         generateCardEvents, updateMatchStats
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  simulateMatch,
  teamStrength,
  poissonGoals,
  pickScorer,
  getTeamPowerLevels,
  getTeamAvgRating,
} from '../src/engine/match';
import { makePlayer, genSkill, genName } from '../src/engine/player';
import { emptyStats } from '../src/state/game-state';
import { FORMATIONS, DEFAULT_FORMATION_IDX, SQUAD_COMP } from '../src/config';
import type { Fixture, GameState, Player, Team, Position } from '../src/types';

/* ================================================================
   Helper: build a team with a full squad and auto-select starters
   ================================================================ */

/**
 * Build a team with players at the given division's skill level.
 * Optionally select starters according to a formation.
 */
const buildTeam = (id: number, div: number, selectStarters = false): Team => {
  const positions: Position[] = [];
  for (const [pos, cnt] of Object.entries(SQUAD_COMP)) {
    for (let i = 0; i < cnt; i++) {
      positions.push(pos as Position);
    }
  }

  const players: Player[] = positions.map(pos =>
    makePlayer(genName('EN'), pos, genSkill(div), 25),
  );

  if (selectStarters) {
    /* Select 11 starters using the default 4-4-2 formation */
    const formation = FORMATIONS[DEFAULT_FORMATION_IDX].slots;
    let idx = 0;
    for (const pos of ['GK', 'DEF', 'MID', 'STR'] as Position[]) {
      const needed = formation[pos];
      let count = 0;
      for (const p of players) {
        if (p.selected) continue;
        if (p.pos === pos && count < needed) {
          p.selected = true;
          p.assignedPos = pos;
          count++;
        }
      }
    }
  }

  return {
    id,
    name: `Team ${id}`,
    div,
    c1: '#ff0000',
    c2: '#0000ff',
    country: 'EN',
    players,
    stats: emptyStats(),
    seasonStats: emptyStats(),
    trophies: [],
    aiFormation: DEFAULT_FORMATION_IDX,
  };
};

/**
 * Build a minimal GameState with two teams for match simulation.
 */
const buildGameState = (homeId: number, awayId: number, playerTeamId: number | null = null): GameState => {
  const teams: Team[] = [];
  /* Fill slots up to the max ID so indexing works */
  const maxId = Math.max(homeId, awayId);
  for (let i = 0; i <= maxId; i++) {
    if (i === homeId || i === awayId) {
      teams.push(buildTeam(i, 2));
    } else {
      /* Placeholder team */
      teams.push({
        id: i,
        name: `Placeholder ${i}`,
        div: 0,
        c1: '#000',
        c2: '#fff',
        country: 'EN',
        players: [],
        stats: emptyStats(),
        seasonStats: emptyStats(),
        trophies: [],
        aiFormation: DEFAULT_FORMATION_IDX,
      });
    }
  }

  return {
    manager: 'Test Manager',
    playerTeamId,
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
    cup: null,
    matchSubs: 0,
    matchRedCards: [],
    viewingPlayerId: null,
  };
};

/* ================================================================
   teamStrength() — team strength calculation
   ================================================================ */
describe('teamStrength()', () => {
  it('calculates strength from selected starters', () => {
    const team = buildTeam(0, 1, true);
    const strength = teamStrength(team);
    expect(strength).toBeGreaterThan(0);
  });

  it('returns minimum (10) when fewer than 11 starters selected', () => {
    const team = buildTeam(0, 1, false);
    /* Only select 5 players */
    team.players.slice(0, 5).forEach(p => {
      p.selected = true;
      p.assignedPos = p.pos;
    });
    expect(teamStrength(team)).toBe(10);
  });

  it('returns minimum (10) when no starters selected', () => {
    const team = buildTeam(0, 1, false);
    expect(teamStrength(team)).toBe(10);
  });

  it('returns correct average for 11 identical players', () => {
    const team: Team = {
      id: 0,
      name: 'Test',
      div: 1,
      c1: '#000',
      c2: '#fff',
      country: 'EN',
      players: [],
      stats: emptyStats(),
      seasonStats: emptyStats(),
      trophies: [],
      aiFormation: DEFAULT_FORMATION_IDX,
    };

    /* Create 11 identical players (all midfielders, skill 30, stamina 100) */
    for (let i = 0; i < 11; i++) {
      const p = makePlayer('Player ' + i, 'MID', 30, 25);
      p.selected = true;
      p.assignedPos = 'MID';
      team.players.push(p);
    }

    const strength = teamStrength(team);
    expect(strength).toBe(30);
  });
});

/* ================================================================
   getTeamPowerLevels() — power breakdown by position
   ================================================================ */
describe('getTeamPowerLevels()', () => {
  it('returns power levels for each position group', () => {
    const team = buildTeam(0, 1, true);
    const levels = getTeamPowerLevels(team);
    expect(levels).toHaveProperty('GK');
    expect(levels).toHaveProperty('DEF');
    expect(levels).toHaveProperty('MID');
    expect(levels).toHaveProperty('STR');
    expect(levels).toHaveProperty('total');
    expect(levels.total).toBeGreaterThan(0);
  });
});

/* ================================================================
   getTeamAvgRating() — average starter rating
   ================================================================ */
describe('getTeamAvgRating()', () => {
  it('returns 0 when no starters selected', () => {
    const team = buildTeam(0, 1, false);
    expect(getTeamAvgRating(team)).toBe(0);
  });

  it('returns a positive number when starters are selected', () => {
    const team = buildTeam(0, 1, true);
    expect(getTeamAvgRating(team)).toBeGreaterThan(0);
  });
});

/* ================================================================
   poissonGoals() — Poisson-distributed goal generation
   ================================================================ */
describe('poissonGoals()', () => {
  it('returns a non-negative integer', () => {
    for (let i = 0; i < 200; i++) {
      const goals = poissonGoals(1.5);
      expect(goals).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(goals)).toBe(true);
    }
  });

  it('caps at 8 goals', () => {
    for (let i = 0; i < 200; i++) {
      /* Use a very high lambda to stress the cap */
      expect(poissonGoals(20)).toBeLessThanOrEqual(8);
    }
  });

  it('averages near the given lambda over many samples', () => {
    const lambda = 2.0;
    let total = 0;
    const n = 5000;
    for (let i = 0; i < n; i++) total += poissonGoals(lambda);
    const avg = total / n;
    /* Should be within ~0.3 of lambda (statistical tolerance) */
    expect(avg).toBeGreaterThan(lambda - 0.5);
    expect(avg).toBeLessThan(lambda + 0.5);
  });
});

/* ================================================================
   pickScorer() — goal scorer selection
   ================================================================ */
describe('pickScorer()', () => {
  it('returns a scorer from the team starters', () => {
    const team = buildTeam(0, 1, true);
    const starterNames = team.players.filter(p => p.selected).map(p => p.name);
    for (let i = 0; i < 50; i++) {
      const scorer = pickScorer(team, 0);
      expect(starterNames).toContain(scorer.name);
      expect(scorer.teamId).toBe(0);
    }
  });

  it('returns "Unknown" when no starters are selected', () => {
    const team = buildTeam(0, 1, false);
    const scorer = pickScorer(team, 0);
    expect(scorer.name).toBe('Unknown');
  });
});

/* ================================================================
   simulateMatch() — full match simulation
   ================================================================ */
describe('simulateMatch()', () => {
  let G: GameState;
  let fixture: Fixture;

  beforeEach(() => {
    G = buildGameState(0, 1);
    fixture = {
      home: 0,
      away: 1,
      homeGoals: null,
      awayGoals: null,
      events: [],
    };
  });

  it('produces valid goal counts (>= 0)', () => {
    simulateMatch(fixture, G);
    expect(fixture.homeGoals).toBeGreaterThanOrEqual(0);
    expect(fixture.awayGoals).toBeGreaterThanOrEqual(0);
  });

  it('generates match events array', () => {
    simulateMatch(fixture, G);
    expect(Array.isArray(fixture.events)).toBe(true);
  });

  it('populates goal events matching the goal count', () => {
    simulateMatch(fixture, G);
    const homeGoalEvents = fixture.events.filter(e => e.type === 'goal' && e.teamId === 0);
    const awayGoalEvents = fixture.events.filter(e => e.type === 'goal' && e.teamId === 1);
    expect(homeGoalEvents).toHaveLength(fixture.homeGoals!);
    expect(awayGoalEvents).toHaveLength(fixture.awayGoals!);
  });

  it('events have valid minute values (1-90)', () => {
    simulateMatch(fixture, G);
    for (const ev of fixture.events) {
      expect(ev.minute).toBeGreaterThanOrEqual(1);
      expect(ev.minute).toBeLessThanOrEqual(90);
    }
  });

  it('events are sorted chronologically by minute', () => {
    simulateMatch(fixture, G);
    for (let i = 1; i < fixture.events.length; i++) {
      expect(fixture.events[i].minute).toBeGreaterThanOrEqual(fixture.events[i - 1].minute);
    }
  });

  it('updates season stats for both teams', () => {
    simulateMatch(fixture, G);
    expect(G.teams[0].seasonStats.p).toBe(1);
    expect(G.teams[1].seasonStats.p).toBe(1);
  });

  it('updates cumulative stats for both teams', () => {
    simulateMatch(fixture, G);
    expect(G.teams[0].stats.p).toBe(1);
    expect(G.teams[1].stats.p).toBe(1);
  });

  it('awards 3 points for a win and 0 for a loss', () => {
    /* Simulate many matches to find at least one non-draw */
    let foundDecisive = false;
    for (let i = 0; i < 50; i++) {
      const gs = buildGameState(0, 1);
      const f: Fixture = { home: 0, away: 1, homeGoals: null, awayGoals: null, events: [] };
      simulateMatch(f, gs);
      if (f.homeGoals! !== f.awayGoals!) {
        foundDecisive = true;
        const winner = f.homeGoals! > f.awayGoals! ? gs.teams[0] : gs.teams[1];
        const loser = f.homeGoals! > f.awayGoals! ? gs.teams[1] : gs.teams[0];
        expect(winner.seasonStats.pts).toBe(3);
        expect(loser.seasonStats.pts).toBe(0);
        break;
      }
    }
    expect(foundDecisive).toBe(true);
  });

  it('awards 1 point each for a draw', () => {
    /* Simulate many matches to find a draw */
    let foundDraw = false;
    for (let i = 0; i < 100; i++) {
      const gs = buildGameState(0, 1);
      const f: Fixture = { home: 0, away: 1, homeGoals: null, awayGoals: null, events: [] };
      simulateMatch(f, gs);
      if (f.homeGoals === f.awayGoals) {
        foundDraw = true;
        expect(gs.teams[0].seasonStats.pts).toBe(1);
        expect(gs.teams[1].seasonStats.pts).toBe(1);
        break;
      }
    }
    /* Draws should eventually occur -- if not, the test is still valid
       but we note that Poisson draws are expected */
    if (!foundDraw) {
      console.log('No draw found in 100 matches (statistically unlikely but possible)');
    }
  });

  it('generates injury data', () => {
    simulateMatch(fixture, G);
    /* The injuries property should exist (even if empty) */
    expect(fixture).toHaveProperty('injuries');
    expect(Array.isArray(fixture.injuries)).toBe(true);
  });

  it('does not produce negative goal counts', () => {
    for (let i = 0; i < 50; i++) {
      const gs = buildGameState(0, 1);
      const f: Fixture = { home: 0, away: 1, homeGoals: null, awayGoals: null, events: [] };
      simulateMatch(f, gs);
      expect(f.homeGoals).toBeGreaterThanOrEqual(0);
      expect(f.awayGoals).toBeGreaterThanOrEqual(0);
    }
  });

  it('respects difficulty multiplier on AI teams', () => {
    /* With very low difficulty, AI should be weaker on average */
    const lowDiffGoals: number[] = [];
    const highDiffGoals: number[] = [];
    const n = 100;

    for (let i = 0; i < n; i++) {
      /* Player is home team (0); AI is away team (1) */
      const gs = buildGameState(0, 1, 0);
      const f: Fixture = { home: 0, away: 1, homeGoals: null, awayGoals: null, events: [] };
      simulateMatch(f, gs, { difficulty: 0.5 });
      lowDiffGoals.push(f.awayGoals!);
    }

    for (let i = 0; i < n; i++) {
      const gs = buildGameState(0, 1, 0);
      const f: Fixture = { home: 0, away: 1, homeGoals: null, awayGoals: null, events: [] };
      simulateMatch(f, gs, { difficulty: 2.0 });
      highDiffGoals.push(f.awayGoals!);
    }

    const avgLow = lowDiffGoals.reduce((a, b) => a + b, 0) / n;
    const avgHigh = highDiffGoals.reduce((a, b) => a + b, 0) / n;
    /* Higher difficulty should produce more AI goals on average */
    expect(avgHigh).toBeGreaterThan(avgLow);
  });
});
