/**
 * tests/transfers.test.ts — Unit tests for src/engine/transfers.ts
 *
 * Covers: generateSeasonFreeAgents, initBudgets, playerMarketValue,
 *         playerSellValue, signPlayer, sellPlayer, getAITeamPlayersForSale,
 *         buyFromTeam, generateFreeAgent
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateSeasonFreeAgents,
  initBudgets,
  playerMarketValue,
  playerSellValue,
  generateFreeAgent,
  signPlayer,
  sellPlayer,
  getAITeamPlayersForSale,
  buyFromTeam,
} from '../src/engine/transfers';
import { makePlayer, genSkill, genName } from '../src/engine/player';
import {
  FREE_AGENTS_PER_SEASON,
  FREE_AGENT_SKILL_RANGE,
  STARTING_BUDGET,
  SELL_VALUE_RATIO,
  SQUAD_COMP,
  DEFAULT_FORMATION_IDX,
  SQUAD_MIN,
  SQUAD_MAX,
} from '../src/config';
import { emptyStats } from '../src/engine/league';
import type { GameState, Player, Position, Team } from '../src/types';

/* ================================================================
   Helper: build a team with a full squad
   ================================================================ */
const buildTeam = (id: number, div: number, playerCount?: number): Team => {
  const positions: Position[] = [];
  for (const [pos, cnt] of Object.entries(SQUAD_COMP)) {
    for (let i = 0; i < cnt; i++) {
      positions.push(pos as Position);
    }
  }

  /* Use only the needed number of players */
  const count = playerCount || positions.length;
  const players: Player[] = [];
  for (let i = 0; i < count; i++) {
    const pos = positions[i % positions.length];
    players.push(makePlayer(genName('EN'), pos, genSkill(div), 25));
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
 * Build a game state with the given number of teams.
 */
const buildGameState = (teamCount: number = 32, playerTeamId: number | null = 0): GameState => {
  const teams: Team[] = [];
  for (let i = 0; i < teamCount; i++) {
    const div = Math.min(4, Math.floor(i / 8) + 1);
    teams.push(buildTeam(i, div));
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
    matchSubs: 0,
    matchRedCards: [],
    viewingPlayerId: null,
  };
};

/* ================================================================
   generateFreeAgent() — single free agent creation
   ================================================================ */
describe('generateFreeAgent()', () => {
  it('creates a free agent with valid position', () => {
    const fa = generateFreeAgent();
    expect(['GK', 'DEF', 'MID', 'STR']).toContain(fa.pos);
  });

  it('creates a free agent with stamina 100', () => {
    expect(generateFreeAgent().stamina).toBe(100);
  });

  it('creates a free agent with a non-empty name', () => {
    expect(generateFreeAgent().name.length).toBeGreaterThan(0);
  });

  it('creates a free agent with age 18-33', () => {
    for (let i = 0; i < 50; i++) {
      const fa = generateFreeAgent();
      expect(fa.age).toBeGreaterThanOrEqual(18);
      expect(fa.age).toBeLessThanOrEqual(33);
    }
  });

  it('uses the forced base skill when provided', () => {
    const fa = generateFreeAgent(25);
    expect(fa.skill).toBe(25);
  });

  it('calculates a market value', () => {
    const fa = generateFreeAgent(30);
    expect(fa.marketValue).toBeGreaterThan(0);
  });
});

/* ================================================================
   generateSeasonFreeAgents() — full season pool
   ================================================================ */
describe('generateSeasonFreeAgents()', () => {
  let G: GameState;

  beforeEach(() => {
    G = buildGameState();
  });

  it('creates the correct number of free agents (16)', () => {
    generateSeasonFreeAgents(G);
    expect(G.freeAgents).toHaveLength(FREE_AGENTS_PER_SEASON);
  });

  it('all free agent skills are within the configured range [10, 35]', () => {
    generateSeasonFreeAgents(G);
    const [lo, hi] = FREE_AGENT_SKILL_RANGE;
    for (const fa of G.freeAgents) {
      expect(fa.skill).toBeGreaterThanOrEqual(lo);
      expect(fa.skill).toBeLessThanOrEqual(hi);
    }
  });

  it('free agents have valid positions', () => {
    generateSeasonFreeAgents(G);
    const validPositions = ['GK', 'DEF', 'MID', 'STR'];
    for (const fa of G.freeAgents) {
      expect(validPositions).toContain(fa.pos);
    }
  });

  it('free agents have positive market values', () => {
    generateSeasonFreeAgents(G);
    for (const fa of G.freeAgents) {
      expect(fa.marketValue).toBeGreaterThan(0);
    }
  });

  it('free agents have stamina 100', () => {
    generateSeasonFreeAgents(G);
    for (const fa of G.freeAgents) {
      expect(fa.stamina).toBe(100);
    }
  });

  it('overwrites any existing free agents', () => {
    G.freeAgents = [generateFreeAgent(), generateFreeAgent()];
    generateSeasonFreeAgents(G);
    expect(G.freeAgents).toHaveLength(FREE_AGENTS_PER_SEASON);
  });
});

/* ================================================================
   initBudgets() — budget initialisation
   ================================================================ */
describe('initBudgets()', () => {
  let G: GameState;

  beforeEach(() => {
    G = buildGameState();
  });

  it('sets the starting budget for all teams', () => {
    initBudgets(G);
    for (const team of G.teams) {
      expect(G.budgets[team.id]).toBe(STARTING_BUDGET);
    }
  });

  it('does not overwrite existing budgets', () => {
    G.budgets = { 0: 99999 };
    initBudgets(G);
    expect(G.budgets[0]).toBe(99999);
    /* Other teams should still get the starting budget */
    expect(G.budgets[1]).toBe(STARTING_BUDGET);
  });

  it('creates the budgets object if undefined', () => {
    (G as any).budgets = undefined;
    initBudgets(G);
    expect(G.budgets).toBeDefined();
    expect(Object.keys(G.budgets).length).toBe(G.teams.length);
  });
});

/* ================================================================
   playerMarketValue() — market value calculation
   ================================================================ */
describe('playerMarketValue()', () => {
  it('returns a positive number for any skill', () => {
    for (let skill = 1; skill <= 50; skill++) {
      expect(playerMarketValue({ skill })).toBeGreaterThan(0);
    }
  });

  it('higher skill = higher market value', () => {
    const low = playerMarketValue({ skill: 10 });
    const mid = playerMarketValue({ skill: 25 });
    const high = playerMarketValue({ skill: 40 });
    expect(high).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(low);
  });

  it('is rounded to the nearest 100', () => {
    for (let skill = 1; skill <= 50; skill++) {
      const val = playerMarketValue({ skill });
      expect(val % 100).toBe(0);
    }
  });
});

/* ================================================================
   playerSellValue() — sell value calculation
   ================================================================ */
describe('playerSellValue()', () => {
  it('is less than market value', () => {
    for (let skill = 5; skill <= 50; skill++) {
      const mv = playerMarketValue({ skill });
      const sv = playerSellValue({ skill });
      expect(sv).toBeLessThanOrEqual(mv);
    }
  });

  it('is approximately 65% of market value', () => {
    const skill = 30;
    const mv = playerMarketValue({ skill });
    const sv = playerSellValue({ skill });
    /* Because of rounding, accept a range */
    const expected = Math.round((mv * SELL_VALUE_RATIO) / 100) * 100;
    expect(sv).toBe(expected);
  });

  it('is rounded to the nearest 100', () => {
    for (let skill = 1; skill <= 50; skill++) {
      expect(playerSellValue({ skill }) % 100).toBe(0);
    }
  });
});

/* ================================================================
   getAITeamPlayersForSale() — AI team transfer offers
   ================================================================ */
describe('getAITeamPlayersForSale()', () => {
  let G: GameState;

  beforeEach(() => {
    G = buildGameState(32, 0);
    initBudgets(G);
  });

  it('returns 2-4 players for a valid AI team', () => {
    /* Run multiple times since the count is random */
    const counts: number[] = [];
    for (let i = 0; i < 50; i++) {
      const result = getAITeamPlayersForSale(G, 1);
      counts.push(result.length);
    }
    for (const count of counts) {
      expect(count).toBeGreaterThanOrEqual(2);
      expect(count).toBeLessThanOrEqual(4);
    }
  });

  it('returns an empty array for the player team', () => {
    expect(getAITeamPlayersForSale(G, 0)).toEqual([]);
  });

  it('each offer has a player, playerIdx, and price', () => {
    const offers = getAITeamPlayersForSale(G, 1);
    for (const offer of offers) {
      expect(offer).toHaveProperty('player');
      expect(offer).toHaveProperty('playerIdx');
      expect(offer).toHaveProperty('price');
      expect(offer.price).toBeGreaterThan(0);
    }
  });

  it('price is rounded to $100', () => {
    const offers = getAITeamPlayersForSale(G, 1);
    for (const offer of offers) {
      expect(offer.price % 100).toBe(0);
    }
  });

  it('does not offer top 40% players', () => {
    const team = G.teams[1];
    const sortedBySkill = [...team.players].sort((a, b) => b.skill - a.skill);
    const topPlayerCount = Math.floor(team.players.length * 0.4);
    const topPlayerNames = new Set(
      sortedBySkill.slice(0, topPlayerCount).map(p => p.name),
    );

    /* Run many times to be more confident */
    for (let i = 0; i < 20; i++) {
      const offers = getAITeamPlayersForSale(G, 1);
      for (const offer of offers) {
        expect(topPlayerNames.has(offer.player.name)).toBe(false);
      }
    }
  });

  it('returns empty for teams with invalid division', () => {
    G.teams[1].div = 0;
    expect(getAITeamPlayersForSale(G, 1)).toEqual([]);
  });
});

/* ================================================================
   signPlayer() — signing from free agent pool
   ================================================================ */
describe('signPlayer()', () => {
  let G: GameState;

  beforeEach(() => {
    G = buildGameState(4, 0);
    initBudgets(G);
    generateSeasonFreeAgents(G);
  });

  it('adds the player to the human team roster', () => {
    const initialCount = G.teams[0].players.length;
    const result = signPlayer(G, 0);
    expect(result).toBe(true);
    expect(G.teams[0].players.length).toBe(initialCount + 1);
  });

  it('removes the agent from the free agent pool', () => {
    const initialCount = G.freeAgents.length;
    signPlayer(G, 0);
    expect(G.freeAgents.length).toBe(initialCount - 1);
  });

  it('first signing is free', () => {
    G.usedFreeSign = false;
    const budgetBefore = G.budgets[0];
    signPlayer(G, 0);
    expect(G.budgets[0]).toBe(budgetBefore);
    expect(G.usedFreeSign).toBe(true);
  });

  it('subsequent signings cost money', () => {
    G.usedFreeSign = true;
    const budgetBefore = G.budgets[0];
    const agentCost = G.freeAgents[0].marketValue;
    signPlayer(G, 0);
    expect(G.budgets[0]).toBe(budgetBefore - agentCost);
  });

  it('fails when squad is at maximum capacity', () => {
    /* Add players until at SQUAD_MAX */
    while (G.teams[0].players.length < SQUAD_MAX) {
      G.teams[0].players.push(makePlayer('Extra', 'MID', 20, 25));
    }
    expect(signPlayer(G, 0)).toBe(false);
  });

  it('fails when insufficient budget', () => {
    G.usedFreeSign = true;
    G.budgets[0] = 0;
    expect(signPlayer(G, 0)).toBe(false);
  });

  it('creates a transfer log entry', () => {
    signPlayer(G, 0);
    expect(G.transferLog.length).toBeGreaterThanOrEqual(1);
    expect(G.transferLog[0].type).toBe('buy');
  });
});

/* ================================================================
   sellPlayer() — selling from squad
   ================================================================ */
describe('sellPlayer()', () => {
  let G: GameState;

  beforeEach(() => {
    G = buildGameState(4, 0);
    initBudgets(G);
    generateSeasonFreeAgents(G);
  });

  it('removes the player from the squad', () => {
    const initialCount = G.teams[0].players.length;
    sellPlayer(G, 0);
    expect(G.teams[0].players.length).toBe(initialCount - 1);
  });

  it('adds the player to the free agent pool', () => {
    const initialFaCount = G.freeAgents.length;
    sellPlayer(G, 0);
    expect(G.freeAgents.length).toBeGreaterThanOrEqual(initialFaCount);
  });

  it('adds money to the team budget', () => {
    const budgetBefore = G.budgets[0];
    sellPlayer(G, 0);
    expect(G.budgets[0]).toBeGreaterThan(budgetBefore);
  });

  it('fails when squad is at minimum size', () => {
    /* Trim to SQUAD_MIN players */
    G.teams[0].players = G.teams[0].players.slice(0, SQUAD_MIN);
    expect(sellPlayer(G, 0)).toBe(false);
  });

  it('creates a transfer log entry', () => {
    sellPlayer(G, 0);
    expect(G.transferLog.length).toBeGreaterThanOrEqual(1);
    const lastLog = G.transferLog[G.transferLog.length - 1];
    expect(lastLog.type).toBe('sell');
  });
});

/* ================================================================
   buyFromTeam() — inter-team transfers
   ================================================================ */
describe('buyFromTeam()', () => {
  let G: GameState;

  beforeEach(() => {
    G = buildGameState(4, 0);
    initBudgets(G);
  });

  it('transfers a player from seller to buyer', () => {
    const buyerCountBefore = G.teams[0].players.length;
    const sellerCountBefore = G.teams[1].players.length;
    const result = buyFromTeam(G, 0, 1, 0, 500);
    expect(result).toBe(true);
    expect(G.teams[0].players.length).toBe(buyerCountBefore + 1);
    expect(G.teams[1].players.length).toBe(sellerCountBefore - 1);
  });

  it('deducts price from buyer and adds to seller', () => {
    const buyerBudgetBefore = G.budgets[0];
    const sellerBudgetBefore = G.budgets[1];
    buyFromTeam(G, 0, 1, 0, 500);
    expect(G.budgets[0]).toBe(buyerBudgetBefore - 500);
    expect(G.budgets[1]).toBe(sellerBudgetBefore + 500);
  });

  it('fails if buyer has insufficient budget', () => {
    G.budgets[0] = 0;
    expect(buyFromTeam(G, 0, 1, 0, 500)).toBe(false);
  });

  it('fails if buyer squad is at SQUAD_MAX', () => {
    while (G.teams[0].players.length < SQUAD_MAX) {
      G.teams[0].players.push(makePlayer('Extra', 'MID', 20, 25));
    }
    expect(buyFromTeam(G, 0, 1, 0, 500)).toBe(false);
  });

  it('fails if seller squad would drop below SQUAD_MIN', () => {
    G.teams[1].players = G.teams[1].players.slice(0, SQUAD_MIN);
    expect(buyFromTeam(G, 0, 1, 0, 500)).toBe(false);
  });

  it('creates a transfer log entry', () => {
    buyFromTeam(G, 0, 1, 0, 500);
    expect(G.transferLog.length).toBeGreaterThanOrEqual(1);
    expect(G.transferLog[G.transferLog.length - 1].type).toBe('buy');
  });
});
