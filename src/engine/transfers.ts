/**
 * Transfer market module — handles free agent generation, player buying
 * and selling, market value calculations, budget management, and AI
 * team transfer activity.
 *
 * NEW: Includes ability to buy players directly from AI teams via
 * `getAITeamPlayersForSale()` and `buyFromTeam()`.
 */

import type { AIPlayerForSale, FreeAgent, GameState, Player, Position, Team, TransferLogEntry } from '../types';
import {
  AI_TARGET_SQUAD,
  COUNTRY_NAMES,
  DIV_RANGE,
  FREE_AGENT_SKILL_RANGE,
  FREE_AGENTS_PER_SEASON,
  MAX_FREE_AGENT_POOL,
  POS_ORDER,
  SELL_VALUE_RATIO,
  SQUAD_MAX,
  SQUAD_MIN,
  STARTING_BUDGET,
} from '../config';
import { clamp, genName, pick, rand } from './player';

// ---------------------------------------------------------------------------
// Market Value Calculations
// ---------------------------------------------------------------------------

/**
 * Calculate a player's market value based on their base skill.
 *
 * Uses an exponential formula so top-tier players cost significantly more
 * than average ones. The value is rounded to the nearest $100.
 *
 * @param p - The player (or free agent with a `skill` property).
 * @returns Market value in dollars (rounded to nearest 100).
 */
export const playerMarketValue = (p: { skill: number }): number => {
  const sk = p.skill || 1;
  return Math.round((sk * sk * 50) / 100) * 100;
};

/**
 * Calculate the sell price for a player.
 *
 * Sell price = 65% of market value, rounded to nearest $100.
 *
 * @param p - The player to price.
 * @returns Sell value in dollars.
 */
export const playerSellValue = (p: { skill: number }): number => {
  return Math.round((playerMarketValue(p) * SELL_VALUE_RATIO) / 100) * 100;
};

// ---------------------------------------------------------------------------
// Free Agent Generation
// ---------------------------------------------------------------------------

/**
 * Generate a single free agent with a specific base skill level.
 *
 * The agent is assigned a random position and a culturally-appropriate
 * name from a random country pool. Age is randomised between 18-33.
 *
 * @param forceBase - Base skill level for this agent (optional; defaults to random within FREE_AGENT_SKILL_RANGE).
 * @returns A FreeAgent with all fields populated, including marketValue.
 */
export const generateFreeAgent = (forceBase?: number): FreeAgent => {
  const pos: Position = pick(POS_ORDER);
  const [lo, hi] = FREE_AGENT_SKILL_RANGE;
  const skill = clamp(forceBase !== undefined ? forceBase : rand(lo, hi), 1, 50);
  const countryCodes = Object.keys(COUNTRY_NAMES);

  const player: FreeAgent = {
    name: genName(pick(countryCodes)),
    pos,
    skill,
    stamina: 100,
    benchStreak: 0,
    assignedPos: null,
    selected: false,
    age: rand(18, 33),
    marketValue: 0,
  };
  player.marketValue = playerMarketValue(player);

  return player;
};

/**
 * Generate a full set of free agents for the season.
 *
 * Creates `FREE_AGENTS_PER_SEASON` (16) agents with skills evenly
 * distributed across the full skill spectrum (`FREE_AGENT_SKILL_RANGE`
 * = [10, 35]). This ensures the market always has cheap weak players,
 * mid-range options, AND expensive elite signings.
 *
 * The pool is shuffled after generation so agents don't appear sorted
 * by strength in the UI.
 *
 * @param G - The game state (mutated: G.freeAgents is overwritten).
 */
export const generateSeasonFreeAgents = (G: GameState): void => {
  G.freeAgents = [];
  const [lo, hi] = FREE_AGENT_SKILL_RANGE;
  const count = FREE_AGENTS_PER_SEASON;

  for (let i = 0; i < count; i++) {
    /* Spread base tiers evenly across the range */
    const base = Math.round(lo + ((hi - lo) * i) / (count - 1));
    G.freeAgents.push(generateFreeAgent(base));
  }

  /* Shuffle so they don't appear sorted by strength */
  for (let i = G.freeAgents.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [G.freeAgents[i], G.freeAgents[j]] = [G.freeAgents[j], G.freeAgents[i]];
  }
};

// ---------------------------------------------------------------------------
// Budget Initialisation
// ---------------------------------------------------------------------------

/**
 * Initialise budgets for all teams that don't already have one.
 *
 * Each team starts with `STARTING_BUDGET` ($10,000). This is called at
 * game initialisation and at the start of each new season (to cover
 * newly-entered teams).
 *
 * @param G - The game state (mutated: G.budgets may gain new entries).
 */
export const initBudgets = (G: GameState): void => {
  if (!G.budgets) G.budgets = {};
  for (const tm of G.teams) {
    if (G.budgets[tm.id] === undefined) {
      G.budgets[tm.id] = STARTING_BUDGET;
    }
  }
};

// ---------------------------------------------------------------------------
// Player Signing (from Free Agent Pool)
// ---------------------------------------------------------------------------

/**
 * Sign a free agent to the human player's squad.
 *
 * Validates:
 * - The free agent index is valid.
 * - The squad isn't already at max capacity (25).
 * - The player has enough budget (or this is their free first signing).
 *
 * The first signing of the game is free (`G.usedFreeSign`), after which
 * all signings cost the agent's market value.
 *
 * @param G - The game state (mutated in-place).
 * @param faIdx - Index into G.freeAgents array.
 * @returns `true` if the signing succeeded, `false` otherwise.
 */
export const signPlayer = (G: GameState, faIdx: number): boolean => {
  if (G.playerTeamId == null) return false;
  const pt = G.teams[G.playerTeamId];
  if (!G.freeAgents || faIdx < 0 || faIdx >= G.freeAgents.length) return false;

  const fa = G.freeAgents[faIdx];
  if (pt.players.length >= SQUAD_MAX) return false;

  /* Check if this is the one-time free first signing */
  const isFreeSign = !G.usedFreeSign;
  if (!isFreeSign && (G.budgets[pt.id] || 0) < fa.marketValue) return false;

  /* Add player to squad */
  pt.players.push({
    name: fa.name,
    pos: fa.pos,
    skill: fa.skill,
    stamina: fa.stamina || 100,
    benchStreak: 0,
    assignedPos: null,
    selected: false,
    age: fa.age || rand(18, 33),
    injuredFor: 0,
    careerGoals: 0,
    careerApps: 0,
    seasonGoals: 0,
    seasonApps: 0,
    seasonYellows: 0,
    seasonReds: 0,
    form: 0,
    formStreak: 0,
    suspendedFor: 0,
    isAcademy: false,
  });

  const cost = isFreeSign ? 0 : fa.marketValue;
  G.budgets[pt.id] -= cost;
  if (isFreeSign) G.usedFreeSign = true;

  if (!G.transferLog) G.transferLog = [];
  G.transferLog.push({
    season: G.season,
    type: 'buy',
    playerName: fa.name,
    teamId: pt.id,
    teamName: pt.name,
    amount: cost,
  });

  G.freeAgents.splice(faIdx, 1);
  return true;
};

// ---------------------------------------------------------------------------
// Player Selling
// ---------------------------------------------------------------------------

/**
 * Sell a player from the human player's squad.
 *
 * The player is removed from the squad and added to the free agent pool
 * (with a fresh market value). The selling team receives the sell value
 * (65% of market value).
 *
 * Will not sell below the minimum squad size (19).
 *
 * @param G - The game state (mutated in-place).
 * @param playerIdx - Index into the player's team roster.
 * @returns `true` if the sale succeeded, `false` otherwise.
 */
export const sellPlayer = (G: GameState, playerIdx: number): boolean => {
  if (G.playerTeamId == null) return false;
  const pt = G.teams[G.playerTeamId];
  if (playerIdx < 0 || playerIdx >= pt.players.length) return false;
  if (pt.players.length <= SQUAD_MIN) return false;

  const p = pt.players[playerIdx];
  const sellVal = playerSellValue(p);

  /* Move player to free agent pool */
  const fa: FreeAgent = {
    name: p.name,
    pos: p.pos,
    skill: p.skill,
    stamina: 100,
    benchStreak: 0,
    assignedPos: null,
    selected: false,
    age: p.age || 25,
    marketValue: 0,
  };
  fa.marketValue = playerMarketValue(fa);

  G.freeAgents.push(fa);
  while (G.freeAgents.length > MAX_FREE_AGENT_POOL) {
    G.freeAgents.shift();
  }

  /* Remove from squad */
  pt.players.splice(playerIdx, 1);
  G.budgets[pt.id] = (G.budgets[pt.id] || 0) + sellVal;

  if (!G.transferLog) G.transferLog = [];
  G.transferLog.push({
    season: G.season,
    type: 'sell',
    playerName: p.name,
    teamId: pt.id,
    teamName: pt.name,
    amount: sellVal,
  });

  return true;
};

// ---------------------------------------------------------------------------
// AI Team Transfers
// ---------------------------------------------------------------------------

/**
 * Run AI transfer logic for all non-human teams.
 *
 * Each AI team:
 * 1. **Sells** if above their target squad size (offloading weakest players).
 * 2. **Buys** the best affordable free agent if below target (prioritising GK
 *    if they have fewer than 2).
 *
 * AI teams target a smaller squad than the human player (22-23 vs 25)
 * because they don't need tactical depth.
 *
 * @param G - The game state (mutated in-place).
 */
export const aiDoTransfers = (G: GameState): void => {
  for (const team of G.teams) {
    if (team.id === G.playerTeamId) continue;
    if (team.div < 1 || team.div > 4) continue;

    const targetSize = AI_TARGET_SQUAD[team.div] || 22;

    /* Sell if above target squad size */
    while (team.players.length > targetSize) {
      let worstIdx = 0;
      let worstSkill = Infinity;
      team.players.forEach((p, i) => {
        if (p.skill < worstSkill) {
          worstSkill = p.skill;
          worstIdx = i;
        }
      });

      const sold = team.players[worstIdx];
      const sellVal = playerSellValue(sold);

      const fa: FreeAgent = {
        name: sold.name,
        pos: sold.pos,
        skill: sold.skill,
        stamina: 100,
        benchStreak: 0,
        assignedPos: null,
        selected: false,
        age: sold.age || 25,
        marketValue: 0,
      };
      fa.marketValue = playerMarketValue(fa);

      G.freeAgents.push(fa);
      while (G.freeAgents.length > MAX_FREE_AGENT_POOL) {
        G.freeAgents.shift();
      }

      team.players.splice(worstIdx, 1);
      G.budgets[team.id] = (G.budgets[team.id] || 0) + sellVal;

      if (!G.transferLog) G.transferLog = [];
      G.transferLog.push({
        season: G.season,
        type: 'sell',
        playerName: sold.name,
        teamId: team.id,
        teamName: team.name,
        amount: sellVal,
      });
    }

    /* Identify weak positions */
    const posCounts: Record<string, number> = { GK: 0, DEF: 0, MID: 0, STR: 0 };
    for (const p of team.players) {
      posCounts[p.pos] = (posCounts[p.pos] || 0) + 1;
    }
    const needsGK = posCounts.GK < 2;

    /* Try to buy — only if below target squad size */
    if (team.players.length < targetSize && G.freeAgents.length > 0) {
      const currentBudget = G.budgets[team.id] || 0;
      let bestIdx = -1;
      let bestScore = -1;

      G.freeAgents.forEach((fa, i) => {
        if (fa.marketValue > currentBudget) return;
        let score = fa.skill;
        if (needsGK && fa.pos === 'GK') score += 20;
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      });

      if (bestIdx >= 0) {
        const fa = G.freeAgents[bestIdx];
        team.players.push({
          name: fa.name,
          pos: fa.pos,
          skill: fa.skill,
          stamina: 100,
          benchStreak: 0,
          assignedPos: null,
          selected: false,
          age: fa.age || rand(18, 33),
          injuredFor: 0,
          careerGoals: 0,
          careerApps: 0,
          seasonGoals: 0,
          seasonApps: 0,
          seasonYellows: 0,
          seasonReds: 0,
          form: 0,
          formStreak: 0,
          suspendedFor: 0,
          isAcademy: false,
        });

        G.budgets[team.id] -= fa.marketValue;

        if (!G.transferLog) G.transferLog = [];
        G.transferLog.push({
          season: G.season,
          type: 'buy',
          playerName: fa.name,
          teamId: team.id,
          teamName: team.name,
          amount: fa.marketValue,
        });

        G.freeAgents.splice(bestIdx, 1);
      }
    }
  }
};

// ---------------------------------------------------------------------------
// Season Income
// ---------------------------------------------------------------------------

/**
 * Award end-of-season income to all active teams.
 *
 * Income consists of:
 * - A base amount by division (Div 1: $5,000, Div 4: $1,000).
 * - Win bonus per match won (scaled inversely by division).
 * - Draw bonus per match drawn (scaled inversely by division).
 *
 * @param G - The game state (mutated: G.budgets updated).
 */
export const awardSeasonIncome = (G: GameState): void => {
  const DIV_SEASON_INCOME: Record<number, number> = { 1: 5000, 2: 3500, 3: 2000, 4: 1000 };
  const DIV_WIN_BONUS: Record<number, number> = { 1: 100, 2: 150, 3: 250, 4: 350 };
  const DIV_DRAW_BONUS: Record<number, number> = { 1: 30, 2: 50, 3: 80, 4: 100 };

  for (const team of G.teams) {
    if (team.div < 1 || team.div > 4) continue;
    let income = DIV_SEASON_INCOME[team.div] || 1000;
    const winBonus = DIV_WIN_BONUS[team.div] || 150;
    const drawBonus = DIV_DRAW_BONUS[team.div] || 50;
    income += team.seasonStats.w * winBonus;
    income += team.seasonStats.d * drawBonus;
    G.budgets[team.id] = (G.budgets[team.id] || 0) + income;
  }
};

// ---------------------------------------------------------------------------
// NEW: Buy Players from AI Teams
// ---------------------------------------------------------------------------

/**
 * Get a list of players an AI team is willing to sell.
 *
 * AI teams offer 2-4 of their non-best players for sale. The function:
 * 1. Sorts players by skill (ascending).
 * 2. Excludes the top 40% (the team's core players).
 * 3. Randomly selects 2-4 from the remaining pool.
 *
 * Price = player skill * 100 * division multiplier.
 * Division multipliers: Div 1 = 2.0x, Div 2 = 1.5x, Div 3 = 1.2x, Div 4 = 1.0x.
 *
 * @param G - The game state.
 * @param teamId - The AI team's ID.
 * @returns Array of players for sale, or empty if team is not valid.
 */
export const getAITeamPlayersForSale = (G: GameState, teamId: number): AIPlayerForSale[] => {
  const team = G.teams[teamId];
  if (!team || teamId === G.playerTeamId) return [];
  if (team.div < 1 || team.div > 4) return [];

  /* Division multiplier for pricing */
  const divMultiplier: Record<number, number> = { 1: 2.0, 2: 1.5, 3: 1.2, 4: 1.0 };
  const mult = divMultiplier[team.div] || 1.0;

  /* Sort players by skill (ascending) and exclude top 40% */
  const indexed = team.players
    .map((p, i) => ({ player: p, playerIdx: i }))
    .sort((a, b) => a.player.skill - b.player.skill);

  const cutoff = Math.ceil(indexed.length * 0.6); /* offer from bottom 60% only */
  const available = indexed.slice(0, cutoff);

  if (available.length === 0) return [];

  /* Shuffle and take 2-4 */
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }

  const count = Math.min(rand(2, 4), available.length);
  return available.slice(0, count).map(({ player, playerIdx }) => ({
    playerIdx,
    player,
    price: Math.round(player.skill * 100 * mult / 100) * 100, /* rounded to $100 */
  }));
};

/**
 * Buy a player from an AI team (inter-team transfer).
 *
 * Validates:
 * - Both teams exist and are valid.
 * - The buyer has enough budget.
 * - The buyer's squad isn't at capacity.
 * - The seller's squad won't drop below minimum.
 * - The player index is valid.
 *
 * The player is removed from the seller and added to the buyer.
 * Budget is transferred accordingly. A transfer log entry is created.
 *
 * @param G - The game state (mutated in-place).
 * @param buyerTeamId - The buying team's ID (typically G.playerTeamId).
 * @param sellerTeamId - The selling AI team's ID.
 * @param playerIdx - Index into the seller's players array.
 * @param price - The agreed transfer price.
 * @returns `true` if the transfer succeeded, `false` otherwise.
 */
export const buyFromTeam = (
  G: GameState,
  buyerTeamId: number,
  sellerTeamId: number,
  playerIdx: number,
  price: number,
): boolean => {
  const buyer = G.teams[buyerTeamId];
  const seller = G.teams[sellerTeamId];

  if (!buyer || !seller) return false;
  if (buyerTeamId === sellerTeamId) return false;
  if (playerIdx < 0 || playerIdx >= seller.players.length) return false;
  if (buyer.players.length >= SQUAD_MAX) return false;
  if (seller.players.length <= SQUAD_MIN) return false;
  if ((G.budgets[buyerTeamId] || 0) < price) return false;

  const p = seller.players[playerIdx];

  /* Add to buyer */
  buyer.players.push({
    name: p.name,
    pos: p.pos,
    skill: p.skill,
    stamina: 100,
    benchStreak: 0,
    assignedPos: null,
    selected: false,
    age: p.age || 25,
    injuredFor: 0,
    careerGoals: p.careerGoals || 0,
    careerApps: p.careerApps || 0,
    seasonGoals: 0,
    seasonApps: 0,
    seasonYellows: 0,
    seasonReds: 0,
    form: 0,
    formStreak: 0,
    suspendedFor: 0,
    isAcademy: false,
  });

  /* Remove from seller */
  seller.players.splice(playerIdx, 1);

  /* Transfer funds */
  G.budgets[buyerTeamId] = (G.budgets[buyerTeamId] || 0) - price;
  G.budgets[sellerTeamId] = (G.budgets[sellerTeamId] || 0) + price;

  /* Log the transfer */
  if (!G.transferLog) G.transferLog = [];
  G.transferLog.push({
    season: G.season,
    type: 'buy',
    playerName: p.name,
    teamId: buyerTeamId,
    teamName: buyer.name,
    amount: price,
  });

  return true;
};
