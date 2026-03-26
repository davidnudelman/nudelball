/**
 * config.ts — All game constants and configuration values.
 *
 * Every magic number, array, and lookup table from the original
 * index.html is centralised here as typed, named exports.
 * Nothing in this file is mutable at runtime.
 */

import type {
  CountryNamePool,
  DevelopmentCurve,
  DevelopmentCurveConfig,
  Difficulty,
  DifficultyMultipliers,
  DivisionRange,
  Formation,
  PlayerRole,
  Position,
  PrizeMoney,
  SolidarityPayment,
  Sponsorship,
  Tactic,
  TacticId,
  TeamData,
  WaitingTeam,
} from './types';

/* ================================================================
   VERSION & PERSISTENCE KEYS
   ================================================================ */

/** Current game version string */
export const GAME_VERSION = '0.87';

/** localStorage key for the main game save */
export const SAVE_KEY = 'pitchboss_v1';

/** localStorage key for user settings (independent of save) */
export const SETTINGS_KEY = 'pitchboss_settings';

/* ================================================================
   LEAGUE STRUCTURE
   ================================================================ */

/** Number of teams in each division */
export const TEAMS_PER_DIV = 8;

/** Number of league match-weeks per season (round-robin home & away) */
export const SEASON_WEEKS = (TEAMS_PER_DIV - 1) * 2; // 14

/* ================================================================
   TEAMS DATA — Full pool of ~80 teams (32 starting + ~48 extra pool)
   ================================================================ */

export const TEAMS_DATA: readonly TeamData[] = [
  /* Division 1 */
  { name: 'Barcelona',  div: 1, c1: '#ad1519', c2: '#fcdd09', country: 'ES' },
  { name: 'Madrid',     div: 1, c1: '#ad1519', c2: '#fcdd09', country: 'ES' },
  { name: 'Manchester', div: 1, c1: '#cf142b', c2: '#00247d', country: 'EN' },
  { name: 'Liverpool',  div: 1, c1: '#cf142b', c2: '#00247d', country: 'EN' },
  { name: 'Porto',      div: 1, c1: '#006600', c2: '#ff0000', country: 'PT' },
  { name: 'Lisbon',     div: 1, c1: '#006600', c2: '#ff0000', country: 'PT' },
  { name: 'Rome',       div: 1, c1: '#008c45', c2: '#cd212a', country: 'IT' },
  { name: 'Istanbul',   div: 1, c1: '#e30a17', c2: '#ffffff', country: 'TR' },
  /* Division 2 */
  { name: 'Berlin',     div: 2, c1: '#000000', c2: '#ffcc00', country: 'DE' },
  { name: 'Dortmund',   div: 2, c1: '#000000', c2: '#ffcc00', country: 'DE' },
  { name: 'Paris',      div: 2, c1: '#002395', c2: '#ed2939', country: 'FR' },
  { name: 'Lyon',       div: 2, c1: '#002395', c2: '#ed2939', country: 'FR' },
  { name: 'São Paulo',  div: 2, c1: '#009c3b', c2: '#ffdf00', country: 'BR' },
  { name: 'Santos',     div: 2, c1: '#009c3b', c2: '#ffdf00', country: 'BR' },
  { name: 'Amsterdam',  div: 2, c1: '#ae1c28', c2: '#21468b', country: 'NL' },
  { name: 'Seoul',      div: 2, c1: '#ffffff', c2: '#cd2e3a', country: 'KR' },
  /* Division 3 */
  { name: 'Chicago',    div: 3, c1: '#b22234', c2: '#3c3b6e', country: 'US' },
  { name: 'Los Angeles', div: 3, c1: '#b22234', c2: '#3c3b6e', country: 'US' },
  { name: 'Vancouver',  div: 3, c1: '#ff0000', c2: '#ffffff', country: 'CA' },
  { name: 'Toronto',    div: 3, c1: '#ff0000', c2: '#ffffff', country: 'CA' },
  { name: 'Kiev',       div: 3, c1: '#005bbb', c2: '#ffd500', country: 'UA' },
  { name: 'Warsaw',     div: 3, c1: '#ffffff', c2: '#dc143c', country: 'PL' },
  { name: 'Cairo',      div: 3, c1: '#ce1126', c2: '#ffffff', country: 'EG' },
  { name: 'Montevideo', div: 3, c1: '#0038a8', c2: '#ffffff', country: 'UY' },
  /* Division 4 */
  { name: 'Tokyo',      div: 4, c1: '#ffffff', c2: '#bc002d', country: 'JP' },
  { name: 'Beijing',    div: 4, c1: '#de2910', c2: '#ffde00', country: 'CN' },
  { name: 'Andorra',    div: 4, c1: '#0032a0', c2: '#fedf00', country: 'AD' },
  { name: 'Falklands',  div: 4, c1: '#00247d', c2: '#cf142b', country: 'FK' },
  { name: 'Arapiraca',  div: 4, c1: '#009c3b', c2: '#ffdf00', country: 'BR' },
  { name: 'Buenos Aires', div: 4, c1: '#74acdf', c2: '#ffffff', country: 'AR' },
  { name: 'Stockholm',      div: 4, c1: '#006aa7', c2: '#fecc02', country: 'SE' },
  { name: 'Melbourne',      div: 4, c1: '#00008b', c2: '#ffffff', country: 'AU' },

  /* -- Extra pool teams (div 0 -- assigned randomly at game start) -- */
  /* Europe */
  { name: 'Munich',         div: 0, c1: '#0066b3', c2: '#ffffff', country: 'DE' },
  { name: 'Naples',         div: 0, c1: '#007fc8', c2: '#ffffff', country: 'IT' },
  { name: 'Milan',          div: 0, c1: '#e2001a', c2: '#000000', country: 'IT' },
  { name: 'Marseille',      div: 0, c1: '#2faee0', c2: '#ffffff', country: 'FR' },
  { name: 'Seville',        div: 0, c1: '#d4002a', c2: '#ffffff', country: 'ES' },
  { name: 'Valencia',       div: 0, c1: '#ee3524', c2: '#000000', country: 'ES' },
  { name: 'Glasgow',        div: 0, c1: '#003da5', c2: '#ffffff', country: 'EN' },
  { name: 'Leeds',          div: 0, c1: '#ffffff', c2: '#1d428a', country: 'EN' },
  { name: 'Newcastle',      div: 0, c1: '#241f20', c2: '#ffffff', country: 'EN' },
  { name: 'Eindhoven',      div: 0, c1: '#ee1c25', c2: '#ffffff', country: 'NL' },
  { name: 'Prague',         div: 0, c1: '#d7141a', c2: '#11457e', country: 'PL' },
  { name: 'Vienna',         div: 0, c1: '#ed2939', c2: '#ffffff', country: 'DE' },
  { name: 'Copenhagen',     div: 0, c1: '#c8102e', c2: '#ffffff', country: 'SE' },
  { name: 'Brussels',       div: 0, c1: '#000000', c2: '#fdda24', country: 'FR' },
  { name: 'Bucharest',      div: 0, c1: '#002b7f', c2: '#fcd116', country: 'IT' },
  { name: 'Athens',         div: 0, c1: '#0d5eaf', c2: '#ffffff', country: 'IT' },
  { name: 'Belgrade',       div: 0, c1: '#c6363c', c2: '#ffffff', country: 'HR' },
  { name: 'Budapest',       div: 0, c1: '#477050', c2: '#ffffff', country: 'DE' },
  { name: 'Dublin',         div: 0, c1: '#169b62', c2: '#ff883e', country: 'EN' },
  { name: 'Helsinki',       div: 0, c1: '#003580', c2: '#ffffff', country: 'SE' },
  { name: 'Oslo',           div: 0, c1: '#ef2b2d', c2: '#002868', country: 'SE' },
  { name: 'Zurich',         div: 0, c1: '#ff0000', c2: '#ffffff', country: 'DE' },
  { name: 'Geneva',         div: 0, c1: '#ff0000', c2: '#ffffff', country: 'FR' },
  { name: 'Bilbao',         div: 0, c1: '#ee1c25', c2: '#ffffff', country: 'ES' },
  { name: 'Bordeaux',       div: 0, c1: '#1a2744', c2: '#ffffff', country: 'FR' },
  { name: 'Frankfurt',      div: 0, c1: '#e1000f', c2: '#000000', country: 'DE' },
  { name: 'Hamburg',        div: 0, c1: '#0a3d79', c2: '#ffffff', country: 'DE' },
  { name: 'Leipzig',        div: 0, c1: '#dd0741', c2: '#ffffff', country: 'DE' },
  { name: 'Lille',          div: 0, c1: '#e3001b', c2: '#00295b', country: 'FR' },
  { name: 'Monaco',         div: 0, c1: '#ce1126', c2: '#ffffff', country: 'FR' },

  /* Americas */
  { name: 'Miami',          div: 0, c1: '#f7b5cd', c2: '#231f20', country: 'US' },
  { name: 'New York',       div: 0, c1: '#6caddf', c2: '#f15b22', country: 'US' },
  { name: 'Dallas',         div: 0, c1: '#bf0d3e', c2: '#002d62', country: 'US' },
  { name: 'Seattle',        div: 0, c1: '#5d9741', c2: '#005595', country: 'US' },
  { name: 'Atlanta',        div: 0, c1: '#a4122a', c2: '#221f1f', country: 'US' },
  { name: 'Denver',         div: 0, c1: '#862633', c2: '#8bb8e8', country: 'US' },
  { name: 'Mexico City',    div: 0, c1: '#006847', c2: '#ffffff', country: 'ES' },
  { name: 'Lima',           div: 0, c1: '#d91023', c2: '#ffffff', country: 'ES' },
  { name: 'Quito',          div: 0, c1: '#ffdd00', c2: '#034ea2', country: 'ES' },
  { name: 'Medellín',       div: 0, c1: '#003893', c2: '#fcd116', country: 'CO' },
  { name: 'Guadalajara',    div: 0, c1: '#cd1735', c2: '#002d62', country: 'ES' },
  { name: 'Monterrey',      div: 0, c1: '#004b8d', c2: '#ffffff', country: 'ES' },
  { name: 'Recife',         div: 0, c1: '#e4002b', c2: '#000000', country: 'BR' },
  { name: 'Curitiba',       div: 0, c1: '#006437', c2: '#ffffff', country: 'BR' },
  { name: 'Porto Alegre',   div: 0, c1: '#0081c8', c2: '#ffffff', country: 'BR' },
  { name: 'Belo Horizonte', div: 0, c1: '#000000', c2: '#ffffff', country: 'BR' },
  { name: 'Brasília',       div: 0, c1: '#009739', c2: '#ffdf00', country: 'BR' },
  { name: 'Salvador',       div: 0, c1: '#ec1c24', c2: '#003da5', country: 'BR' },

  /* Asia / Africa / Oceania */
  { name: 'Osaka',          div: 0, c1: '#ee86a7', c2: '#00205b', country: 'JP' },
  { name: 'Shanghai',       div: 0, c1: '#b22222', c2: '#ffdf00', country: 'CN' },
  { name: 'Busan',          div: 0, c1: '#f47920', c2: '#004a98', country: 'KR' },
  { name: 'Mumbai',         div: 0, c1: '#1a56a6', c2: '#ff6600', country: 'EN' },
  { name: 'Bangkok',        div: 0, c1: '#002d62', c2: '#f4c300', country: 'JP' },
  { name: 'Jakarta',        div: 0, c1: '#ff0000', c2: '#ffffff', country: 'NL' },
  { name: 'Riyadh',         div: 0, c1: '#006c35', c2: '#ffffff', country: 'EG' },
  { name: 'Doha',           div: 0, c1: '#8a1538', c2: '#ffffff', country: 'EG' },
  { name: 'Cape Town',      div: 0, c1: '#007749', c2: '#ffb81c', country: 'EN' },
  { name: 'Lagos',          div: 0, c1: '#008751', c2: '#ffffff', country: 'EN' },
  { name: 'Casablanca',     div: 0, c1: '#c1272d', c2: '#006233', country: 'FR' },
  { name: 'Accra',          div: 0, c1: '#006b3f', c2: '#fcd116', country: 'EN' },
  { name: 'Nairobi',        div: 0, c1: '#000000', c2: '#bb0000', country: 'EN' },
  { name: 'Sydney',         div: 0, c1: '#00a1e0', c2: '#f6a21e', country: 'AU' },
  { name: 'Perth',          div: 0, c1: '#7b2281', c2: '#f47c20', country: 'AU' },
  { name: 'Auckland',       div: 0, c1: '#000033', c2: '#ffcc00', country: 'AU' },
  { name: 'Wellington',     div: 0, c1: '#000000', c2: '#ffd100', country: 'AU' },
] as const;

/** Teams that wait outside the league and rotate in via promotion/relegation */
export const WAITING_TEAMS_DATA: readonly WaitingTeam[] = [
  { name: 'Bogota',         c1: '#fcd116', c2: '#003893', country: 'CO' },
  { name: 'Santiago',       c1: '#d52b1e', c2: '#0039a6', country: 'CL' },
  { name: 'Zagreb',         c1: '#ff0000', c2: '#ffffff', country: 'HR' },
  { name: 'Tel Aviv',       c1: '#0038b8', c2: '#ffffff', country: 'IL' },
  { name: 'Havana',         c1: '#002a8f', c2: '#cb1515', country: 'ES' },
  { name: 'Caracas',        c1: '#ffcc00', c2: '#003da5', country: 'ES' },
  { name: 'La Paz',         c1: '#007934', c2: '#d52b1e', country: 'ES' },
  { name: 'Asunción',       c1: '#d52b1e', c2: '#0038a8', country: 'ES' },
  { name: 'Panama City',    c1: '#da121a', c2: '#003b7a', country: 'ES' },
  { name: 'San José',       c1: '#002b7f', c2: '#ce1126', country: 'ES' },
  { name: 'Florianópolis',  c1: '#009c3b', c2: '#ffdf00', country: 'BR' },
  { name: 'Manaus',         c1: '#009c3b', c2: '#ffdf00', country: 'BR' },
] as const;

/* ================================================================
   POSITIONS
   ================================================================ */

/** Canonical position ordering for display and sorting */
export const POS_ORDER: readonly Position[] = ['GK', 'DEF', 'MID', 'STR'] as const;

/** CSS class suffix for each position (used for colour-coding badges) */
export const POS_CSS: Readonly<Record<Position, string>> = {
  GK: 'gk',
  DEF: 'def',
  MID: 'mid',
  STR: 'str',
} as const;

/**
 * Numeric distance for each position — used to calculate out-of-position penalty.
 * The penalty is proportional to the absolute difference between two positions.
 */
export const POS_DISTANCE: Readonly<Record<Position, number>> = {
  GK: 0,
  DEF: 1,
  MID: 2,
  STR: 3,
} as const;

/** Effective rating loss per position-step away from natural position (15%) */
export const OOP_PENALTY_PER_STEP = 0.15;

/** Default squad composition: how many of each position are generated for a new team */
export const SQUAD_COMP: Readonly<Record<Position, number>> = {
  GK: 2,
  DEF: 7,
  MID: 7,
  STR: 6,
} as const;

/**
 * Position-based goal scoring likelihood weights.
 * Strikers score most, goalkeepers almost never.
 */
export const GOAL_POS_WEIGHT: Readonly<Record<Position, number>> = {
  STR: 50,
  MID: 35,
  DEF: 14.95,
  GK: 0.05,
} as const;

/* ================================================================
   FORMATIONS
   ================================================================ */

/**
 * All available formations.
 * Each must satisfy the baseline: >=3 DEF, >=3 MID, >=1 STR.
 */
export const FORMATIONS: readonly Formation[] = [
  { label: '3-3-4', slots: { GK: 1, DEF: 3, MID: 3, STR: 4 } }, // Ultra-attacking
  { label: '3-4-3', slots: { GK: 1, DEF: 3, MID: 4, STR: 3 } }, // Attacking
  { label: '3-5-2', slots: { GK: 1, DEF: 3, MID: 5, STR: 2 } }, // Midfield control
  { label: '4-3-3', slots: { GK: 1, DEF: 4, MID: 3, STR: 3 } }, // Wide attacking
  { label: '4-4-2', slots: { GK: 1, DEF: 4, MID: 4, STR: 2 } }, // Classic balanced
  { label: '4-5-1', slots: { GK: 1, DEF: 4, MID: 5, STR: 1 } }, // Defensive midfield
  { label: '5-3-2', slots: { GK: 1, DEF: 5, MID: 3, STR: 2 } }, // Solid defence
  { label: '5-4-1', slots: { GK: 1, DEF: 5, MID: 4, STR: 1 } }, // Ultra-defensive
] as const;

/** Default formation index — 4-4-2 (classic balanced) */
export const DEFAULT_FORMATION_IDX = 4;

/* ================================================================
   TACTICS
   ================================================================ */

/**
 * Tactic definitions.
 * homeBonus/awayBonus replace the base expected-goals multipliers.
 * defPenalty is applied to the opponent's expected goals.
 */
export const TACTICS: Readonly<Record<TacticId, Tactic>> = {
  attack:    { homeBonus: 1.35, awayBonus: 1.20, defPenalty: 1.15, label: 'All-Out Attack', icon: '\u2694\uFE0F' },
  balanced:  { homeBonus: 1.15, awayBonus: 1.00, defPenalty: 1.00, label: 'Balanced',       icon: '\u2696\uFE0F' },
  defensive: { homeBonus: 0.85, awayBonus: 0.75, defPenalty: 0.80, label: 'Defensive',      icon: '\uD83D\uDEE1\uFE0F' },
  counter:   { homeBonus: 0.95, awayBonus: 0.90, defPenalty: 0.90, label: 'Counter-Attack', icon: '\uD83C\uDFF9' },
} as const;

/* ================================================================
   TRAINING
   ================================================================ */

/** Base chance per player per week to gain +1 skill (12%) */
export const TRAINING_SKILL_CHANCE = 0.12;

/** Extra training chance for players whose position matches the focus (8%) */
export const TRAINING_FOCUS_BONUS = 0.08;

/** Available training focus options (simplified from 5 to 3) */
export const TRAINING_FOCUSES: readonly string[] = [
  'balanced',
  'fitness',
  'development',
] as const;

/** Total weeks in a season (same as league weeks now that cup is removed) */
export const TOTAL_SEASON_WEEKS = SEASON_WEEKS; // 14

/* ================================================================
   DISCIPLINE (RED / YELLOW CARDS)
   ================================================================ */

/** Chance (%) per selected player per match of receiving a yellow card */
export const YELLOW_CARD_CHANCE = 3.5;

/** Chance (%) per selected player per match of receiving a red card */
export const RED_CARD_CHANCE = 0.3;

/** Number of yellow cards that triggers an automatic 1-match ban */
export const YELLOW_ACCUMULATION = 5;

/** Number of matches a player is suspended after a red card */
export const RED_SUSPENSION = 2;

/* ================================================================
   PLAYER FORM
   ================================================================ */

/** Form points gained after a win */
export const FORM_WIN_BOOST = 1;

/** Form points gained when a player scores a goal */
export const FORM_GOAL_BOOST = 1;

/** Form points lost after a loss */
export const FORM_LOSS_PENALTY = -1;

/** Maximum form value */
export const FORM_MAX = 3;

/** Minimum form value */
export const FORM_MIN = -3;

/** Each form point adjusts effective OVR by this percentage (5%) */
export const FORM_OVR_PCT = 0.05;

/* ================================================================
   DIVISION RANGES & INCOME
   ================================================================ */

/**
 * Skill range [min, max] for players generated in each division.
 * Division 1 teams are strongest, division 4 weakest.
 */
export const DIV_RANGE: Readonly<Record<number, DivisionRange>> = {
  1: [28, 46],
  2: [24, 40],
  3: [20, 34],
  4: [16, 28],
} as const;

/** Base season income awarded to every team, by division */
export const DIV_SEASON_INCOME: Readonly<Record<number, number>> = {
  1: 5000,
  2: 3500,
  3: 2000,
  4: 1000,
} as const;

/**
 * Per-win bonus scaled inversely by division.
 * Lower division teams earn more per result to help them compete.
 */
export const DIV_WIN_BONUS: Readonly<Record<number, number>> = {
  1: 100,
  2: 150,
  3: 250,
  4: 350,
} as const;

/** Per-draw bonus by division */
export const DIV_DRAW_BONUS: Readonly<Record<number, number>> = {
  1: 30,
  2: 50,
  3: 80,
  4: 100,
} as const;

/* ================================================================
   PRIZE MONEY & FINANCIAL AWARDS
   ================================================================ */

/** Prize money awarded at season end for various achievements */
export const PRIZE_MONEY: Readonly<PrizeMoney> = {
  div1Champion: 500,
  div1RunnerUp: 100,
  promotionBonus: 2500,
  avoidRelegation: 500,
  relegation: 250,
} as const;

/** One-time payment to relegated teams to cushion the financial blow */
export const PARACHUTE_PAYMENT = 1500;

/** Solidarity payments: top Div 1 teams pay, distributed to Div 3-4 teams */
export const SOLIDARITY_PAYMENT: Readonly<SolidarityPayment> = {
  min: 500,
  max: 1000,
} as const;

/** Target squad size for AI teams by division (AI will buy/sell to reach this) */
export const AI_TARGET_SQUAD: Readonly<Record<number, number>> = {
  1: 22,
  2: 22,
  3: 23,
  4: 23,
} as const;

/* ================================================================
   TRANSFER MARKET
   ================================================================ */

/** Starting budget for every team at game initialization */
export const STARTING_BUDGET = 10000;

/** Number of free agents generated fresh each season */
export const FREE_AGENTS_PER_SEASON = 16;

/** Maximum number of free agents in the pool at any time */
export const MAX_FREE_AGENT_POOL = 16;

/** Skill range for generated free agents [min, max] */
export const FREE_AGENT_SKILL_RANGE: readonly [number, number] = [10, 35] as const;

/** Sell price as a fraction of market value (65%) */
export const SELL_VALUE_RATIO = 0.65;

/** Minimum squad size — players cannot be sold below this */
export const SQUAD_MIN = 19;

/** Maximum squad size — players cannot be signed above this */
export const SQUAD_MAX = 25;

/* ================================================================
   DIFFICULTY SETTINGS (New for modular version)
   ================================================================ */

/**
 * Multipliers applied based on the selected difficulty level.
 * - easy:   AI is 10% weaker, budget is 50% larger, training 30% more effective
 * - normal: No adjustments (1x everything)
 * - hard:   AI is 10% stronger, budget is 25% smaller, training 20% less effective
 */
export const DIFFICULTY_SETTINGS: Readonly<Record<Difficulty, DifficultyMultipliers>> = {
  easy:   { aiStrengthMult: 0.9,  budgetMult: 1.5,  trainingMult: 1.3 },
  normal: { aiStrengthMult: 1.0,  budgetMult: 1.0,  trainingMult: 1.0 },
  hard:   { aiStrengthMult: 1.1,  budgetMult: 0.75, trainingMult: 0.8 },
} as const;

/* ================================================================
   PLAYER DEVELOPMENT CURVES (New for modular version)
   ================================================================ */

/**
 * Age-based player development constants.
 * - Players under peakAgeStart get a training bonus (youngBonus per year)
 * - Players over peakAgeEnd face a skill decline chance (declineRate per year)
 * - Players reaching retirementAge retire at season end
 */
export const DEVELOPMENT_CURVES: Readonly<DevelopmentCurveConfig> = {
  peakAgeStart: 26,
  peakAgeEnd: 30,
  youngBonus: 0.03,    // 3% extra training chance per year under peak
  declineRate: 0.02,   // 2% skill decline chance per year over peak end
  retirementAge: 38,
} as const;

/** Age at which a player retires and is replaced by a regen */
export const RETIREMENT_AGE = 38;

/**
 * Array-style development curves for the `applyDevelopmentCurve()` function.
 * Each entry defines improvement/decline probabilities for an age bracket.
 */
export const DEVELOPMENT_CURVE_TABLE: readonly DevelopmentCurve[] = [
  { minAge: 16, maxAge: 20, improvementChance: 0.50, maxGain: 3, declineChance: 0.00, maxLoss: 0 },
  { minAge: 21, maxAge: 23, improvementChance: 0.35, maxGain: 2, declineChance: 0.00, maxLoss: 0 },
  { minAge: 24, maxAge: 25, improvementChance: 0.20, maxGain: 1, declineChance: 0.00, maxLoss: 0 },
  { minAge: 26, maxAge: 29, improvementChance: 0.05, maxGain: 1, declineChance: 0.05, maxLoss: 1 },
  { minAge: 30, maxAge: 32, improvementChance: 0.00, maxGain: 0, declineChance: 0.20, maxLoss: 1 },
  { minAge: 33, maxAge: 35, improvementChance: 0.00, maxGain: 0, declineChance: 0.40, maxLoss: 2 },
  { minAge: 36, maxAge: 37, improvementChance: 0.00, maxGain: 0, declineChance: 0.60, maxLoss: 2 },
] as const;

/* ================================================================
   COUNTRY NAME POOLS
   ================================================================ */

/** Country-specific name pools for procedural player-name generation */
export const COUNTRY_NAMES: Record<string, CountryNamePool> = {
  ES: { first: ['Carlos','Diego','Alejandro','Fernando','Sergio','Andrés','Pablo','Álvaro','Marcos','Jordi','David','Hugo','Adrián','Rubén','Antonio','Jesús','Miguel','Alberto','Gonzalo','Enrique','Javier','Daniel','Iván','Víctor','Manuel','Francisco','José','Rafael','Ramón','Joaquín','Pedro','Ángel','Salvador','Emilio','Tomás','Ignacio','Guillermo','Ricardo','Héctor','Santiago','Nicolás','Mateo','Mario','Rodrigo','Cristian','Ismael','Abel','Iñaki','Aitor','Pau','Unai','Ander','Mikel','Borja','Álex','Raúl','Jaime','Lorenzo','Samuel','Martín'], last: ['García','López','Martínez','Rodríguez','Hernández','Sánchez','Fernández','Moreno','Muñoz','Álvarez','Romero','Díaz','Navarro','Gil','Domínguez','Vázquez','Serrano','Molina','Ortega','Castillo','Rubio','Delgado','Pardo','Iglesias','Pascual','Ruiz','Guerrero','Torres','Jiménez','Blanco','Medina','Herrero','Fuentes','Crespo','León','Ramos','Peña','Calvo','Gallego','Prieto','Vega','Campos','Aguilar','Reyes','Nieto','Cortés','Cabrera','Ibáñez','Soler','Marín','Carrasco','Giménez','Bravo','Caballero','Santana','Montes','Vera','Pastor','Alonso','Esteban'] },
  EN: { first: ['Alfred','Henry','John','George','Edward','William','James','Arthur','Thomas','Harry','Charles','Frederick','Oliver','Benjamin','Samuel','Daniel','Jack','Michael','Robert','Andrew','David','Richard','Philip','Stephen','Patrick','Martin','Owen','Peter','Luke','Simon','Joseph','Alexander','Matthew','Christopher','Nicholas','Jonathan','Adam','Mark','Paul','Anthony','Ian','Nigel','Graham','Kevin','Brian','Timothy','Lewis','Connor','Nathan','Callum','Kieran','Jake','Liam','Ethan','Cameron','Ryan','Scott','Craig','Toby','Dominic'], last: ['Smith','Jones','Taylor','Wilson','Brown','Johnson','Evans','Clarke','Roberts','Walker','Turner','Wright','Green','Hall','Wood','Harris','King','Carter','Mitchell','Moore','Jackson','White','Davis','Cooper','Morris','Thompson','Ward','Baker','Collins','Hughes','Edwards','Bell','Lee','Allen','Young','Scott','Hill','Bailey','James','Robinson','Price','Phillips','Watson','Chapman','Simpson','Ellis','Powell','Webb','Marshall','Dixon','Palmer','Holmes','Fox','Hunt','Murray','Andrews','Harvey','Graham','Pearson','Spencer'] },
  PT: { first: ['Rui','Nuno','João','Luís','Pedro','Tiago','Diogo','André','Bruno','Hugo','Ricardo','Gonçalo','Miguel','Paulo','Sérgio','Bernardo','Renato','Vítor','Fábio','Marco','Rafael','Manuel','Eduardo','Nelson','Cláudio','Filipe','Hélder','José','Carlos','António','Francisco','Duarte','Tomás','Henrique','Gustavo','Simão','Rodrigo','Dinis','Afonso','Martim','David','Alexandre','Frederico','Artur','Joaquim','Fernando','Samuel','Daniel','Ivo','Leandro','Sandro','Ruben','Flávio','Márcio','Ângelo','Telmó','Vasco','Lourenço','Mateus','Gil'], last: ['Silva','Santos','Fernandes','Costa','Oliveira','Alves','Pereira','Sousa','Ferreira','Nunes','Vieira','Carvalho','Lopes','Pinto','Mendes','Ribeiro','Rocha','Marques','Correia','Reis','Monteiro','Tavares','Gomes','Cardoso','Fonseca','Teixeira','Mota','Coelho','Martins','Abreu','Moreira','Azevedo','Barbosa','Ramos','Araújo','Machado','Campos','Simões','Antunes','Batista','Matos','Nascimento','Pires','Figueiredo','Valente','Cruz','Esteves','Freitas','Amaral','Leal','Brito','Henriques','Magalhães','Andrade','Morais','Domingues','Sá','Branco','Borges','Paiva'] },
  DE: { first: ['Hans','Klaus','Werner','Karl','Jürgen','Thomas','Lukas','Leon','Julian','Marco','Florian','Philipp','Matthias','Stefan','Bernd','Lars','Nico','Jonas','Felix','Maximilian','Andreas','Christian','Michael','Markus','Tobias','Sebastian','Alexander','Martin','Peter','Uwe','Ralf','Dirk','Sven','Torsten','Frank','Olaf','Bernhard','Dietrich','Holger','Jan','Tim','Paul','Elias','Luca','Noah','Moritz','Niklas','Erik','Hendrik','Dominik','Patrick','Fabian','Dennis','Daniel','Benjamin','Simon','David','Oliver','Rainer','Volker'], last: ['Müller','Schmidt','Schneider','Fischer','Weber','Becker','Schwarz','Wagner','Hoffmann','Keller','Richter','Klein','Wolf','Neumann','Braun','Werner','Krause','Lehmann','Hartmann','König','Schäfer','Lange','Sommer','Vogt','Gross','Zimmermann','Krüger','Meier','Schmitt','Haas','Frank','Berger','Baumann','Herrmann','Koch','Schulz','Engel','Friedrich','Böhm','Voigt','Jäger','Peters','Lorenz','Ludwig','Schubert','Pohl','Busch','Winkler','Hahn','Beck','Roth','Maier','Schmid','Krämer','Brückner','Pfeiffer','Schreiber','Kraft','Otto','Stein'] },
  FR: { first: ['Antoine','Hugo','Paul','Raphaël','Lucas','Adrien','Samuel','Laurent','Marcel','Florian','Mathieu','Clément','Jules','Rémy','Benoît','Corentin','Jean','Pierre','Nicolas','Sébastien','Julien','Guillaume','Maxime','Thomas','Alexandre','Vincent','François','Philippe','Christophe','Stéphane','Sylvain','Romain','Damien','Loïc','Cédric','Arnaud','Fabien','Jérôme','Yannick','Grégory','Emmanuel','Olivier','Frédéric','Dominique','Théo','Nathan','Léo','Louis','Étienne','Gilles','Marc','Alain','Denis','Hervé','Patrick','Thierry','Luc','Xavier','Éric','David'], last: ['Dupont','Martin','Bernard','Dubois','Moreau','Laurent','Simon','Michel','Lefèvre','Leroy','Roux','Girard','Mercier','Faure','Lambert','Fontaine','Chevalier','Robin','Masson','Blanc','Renard','Barbier','Fournier','Picard','Moulin','Perrin','Lemoine','Rousseau','Garnier','Boyer','Leclerc','Bonnet','Bertrand','Collet','Morel','Legrand','Aubert','Gérard','Duval','Lemaire','Marchand','Mathieu','Dufour','Guillot','Brun','Brunet','Noel','Gauthier','Caron','Maillard','André','Leclercq','Royer','Meunier','Adam','Rolland','Clément','Hubert','Charpentier','Pons'] },
  BR: { first: ['João','Pedro','Lucas','Matheus','Guilherme','Thiago','Vinícius','Gabriel','Davi','Rafael','Gustavo','Felipe','Leonardo','Caio','Marcelo','Rodrigo','Danilo','Bruno','Renan','Henrique','Carlos','Eduardo','Fernando','André','Diego','Luís','Ricardo','Fábio','Leandro','Márcio','Paulo','Renato','Sérgio','Antônio','Francisco','José','Marcos','Alessandro','Bernardo','Enzo','Miguel','Arthur','Heitor','Theo','Lorenzo','Samuel','Daniel','Raul','Cauã','Nicolas','Otávio','Murilo','Ian','Isaac','Luan','Wesley','Breno','Rogério','Everton','Cláudio'], last: ['Albuquerque','Silva','Rocha','Santos','Oliveira','Souza','Lima','Pereira','Costa','Ferreira','Ribeiro','Gomes','Martins','Araújo','Barbosa','Nascimento','Cardoso','Correia','Vieira','Nunes','Moura','Cavalcanti','Monteiro','Teixeira','Freitas','Carvalho','Pinto','Mendes','Batista','Reis','Almeida','Azevedo','Barros','Campos','Dias','Duarte','Farias','Fernandes','Figueiredo','Gonçalves','Leal','Lopes','Machado','Melo','Miranda','Moreira','Nogueira','Pacheco','Pires','Ramos','Sales','Sampaio','Siqueira','Soares','Tavares','Vasconcelos','Brito','Cruz','Andrade','Cunha'] },
  US: { first: ['Braden','Tyler','Josh','Weston','Christian','Matt','Kyle','Cameron','Jordan','Brandon','Austin','Marcus','Ethan','Cole','Jake','Mason','Caleb','Logan','Dylan','Chase','Hunter','Connor','Aidan','Blake','Tristan','Nolan','Ryan','Kevin','Jason','Brian','Justin','Aaron','Sean','Derek','Travis','Cody','Garrett','Trevor','Dustin','Bradley','Patrick','Nathan','Jesse','Corey','Craig','Dillon','Spencer','Bryson','Colton','Grant','Drew','Mitchell','Tanner','Wesley','Dalton','Brock','Clayton','Wyatt','Carter','Reid'], last: ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Anderson','Taylor','Thomas','Hernandez','Moore','Jackson','Thompson','White','Lopez','Lee','Gonzalez','Harris','Clark','Lewis','Robinson','Walker','Young','Allen','King','Wright','Scott','Hill','Adams','Baker','Nelson','Carter','Mitchell','Campbell','Roberts','Turner','Phillips','Parker','Evans','Edwards','Collins','Stewart','Morris','Murphy','Rivera','Sullivan','Peterson','Cooper','Reed','Bailey','Bell','Howard','Ward','Torres','Sanders','Price'] },
  CA: { first: ['Jonathan','Stephen','Samuel','Scott','Liam','Mark','Owen','Theo','Lucas','Zachary','Aidan','Fraser','Maxime','Charles','Marcus','Matthew','James','Daniel','Ryan','Tyler','Nathan','Benjamin','Ethan','Noah','Alexander','William','Jacob','Michael','Joshua','Andrew','David','Robert','Joseph','Thomas','Christopher','Nicholas','Kevin','Patrick','Connor','Dylan','Tristan','Caleb','Gavin','Cole','Logan','Brayden','Carson','Cameron','Kyle','Sean','Bryce','Colton','Derek','Grant','Russell','Mitchell','Travis','Spencer','Nolan','Curtis'], last: ['Smith','Brown','Tremblay','Martin','Roy','Wilson','MacDonald','Taylor','Campbell','Anderson','Johnson','Thompson','Robertson','Stewart','Scott','Morrison','Murray','Reid','Clark','Fraser','Mitchell','Ross','Hamilton','Graham','Johnston','Kennedy','Gordon','Thomson','Henderson','Clarke','Sinclair','Watson','McLean','Young','Ferguson','MacLeod','Cameron','Cunningham','Douglas','Craig','Grant','Simpson','Mackenzie','Russell','Mackay','Bell','Duncan','Nicholson','Graham','Lawson','Beaulieu','Gagnon','Côté','Gagné','Bouchard','Morin','Lavoie','Fortin','Pelletier','Gauthier'] },
  UA: { first: ['Andriy','Oleksandr','Mykola','Viktor','Serhiy','Dmytro','Taras','Vitaliy','Yevhen','Artem','Ruslan','Bohdan','Denys','Vladyslav','Oleh','Roman','Anatoliy','Ihor','Mykhailo','Maksym','Vasyl','Pavlo','Yaroslav','Hryhoriy','Stepan','Volodymyr','Kostiantyn','Petro','Ivan','Leonid','Oleksiy','Valentin','Gennadiy','Yuriy','Borys','Sviatoslav','Ostap','Nazar','Kyrylo','Danylo','Timur','Vadym','Eduard','Stanislav','Vitaly','Fedir','Markian','Tymofiy','Illia','Zakhar','Matviy','Rostyslav','Hlib','Yehor','Marian','Adrián','Zinovy','Lyubomyr','Orest','Myron'], last: ['Melnyk','Shevchenko','Boyko','Kovalenko','Bondarenko','Tkachenko','Kravchenko','Oliynyk','Shevchuk','Polishchuk','Lysenko','Savchenko','Kravets','Moroz','Marchenko','Rudenko','Ponomarenko','Kyrychenko','Petrenko','Khomenko','Hrytsenko','Tymoshenko','Ivanenko','Koval','Pavlenko','Vasylenko','Sydorenko','Klymenko','Mazur','Zinchenko','Yurchenko','Tarasenko','Nazarenko','Bilous','Honcharenko','Tkachuk','Horbachuk','Romanenko','Mykhalchuk','Kostenko','Dmytrenko','Baranets','Chernenko','Serhienko','Oleksiienko','Panchenko','Fedorenko','Makarenko','Mykytenko','Andrienko','Korolenko','Levchenko','Yakovenko','Danylenko','Zhuravel','Havryliuk','Zaytsev','Kuzmenko','Hryhorenko','Prykhodko'] },
  PL: { first: ['Robert','Kamil','Jakub','Wojciech','Piotr','Grzegorz','Krzysztof','Łukasz','Tomasz','Arkadiusz','Maciej','Bartosz','Dawid','Mateusz','Sebastian','Damian','Karol','Michał','Marcin','Przemysław','Szymon','Jan','Marek','Rafał','Zbigniew','Leszek','Dariusz','Paweł','Filip','Konrad','Adam','Dominik','Radosław','Patryk','Norbert','Mariusz','Mirosław','Ryszard','Tadeusz','Jacek','Wiesław','Bogdan','Stanisław','Andrzej','Jerzy','Henryk','Kazimierz','Roman','Janusz','Zenon','Igor','Adrian','Kacper','Hubert','Wiktor','Oliwier','Mikołaj','Aleksander','Marcel','Oskar'], last: ['Nowak','Kowalski','Wiśniewski','Wójcik','Kamiński','Kozłowski','Jankowski','Zając','Mazur','Krawczyk','Piotrowski','Grabowski','Pawlak','Michalski','Król','Jabłoński','Zieliński','Szymański','Woźniak','Dąbrowski','Stępień','Pawłowski','Adamczyk','Dudek','Pietrzak','Walczak','Górski','Sikora','Baran','Rutkowski','Michalak','Kwiatkowski','Lis','Zawadzki','Szewczyk','Ostrowski','Jasiński','Malinowski','Bąk','Cieślak','Kubiak','Szczepański','Kaczmarek','Marciniak','Wieczorek','Borkowski','Urbański','Czarnecki','Sawicki','Maciejewski','Kalinowski','Krupa','Sobczak','Głowacki','Zakrzewski','Kowalczyk','Wasilewski','Tomczak','Krajewski','Wilk'] },
  JP: { first: ['Takumi','Kaoru','Daichi','Takehiro','Wataru','Ritsu','Junya','Hidemasa','Yuto','Keisuke','Makoto','Yuya','Genki','Gaku','Koji','Hiroshi','Masato','Daiki','Kento','Shogo','Yuki','Hayato','Sho','Haruki','Ren','Sota','Riku','Minato','Hinata','Yuma','Souta','Haruto','Yuuto','Aoi','Asahi','Yamato','Itsuki','Kaito','Ryota','Akira','Naoki','Kazuki','Tsubasa','Ryusei','Kosei','Taiga','Shota','Takuya','Kenichi','Satoshi','Daisuke','Tomoya','Masaki','Yosuke','Tatsuya','Koki','Ryohei','Shunsuke','Fumiya','Kosuke'], last: ['Tanaka','Suzuki','Sato','Watanabe','Takahashi','Kobayashi','Yoshida','Inoue','Kimura','Yamamoto','Nakamura','Hayashi','Shimizu','Yamazaki','Mori','Abe','Ikeda','Hashimoto','Yamashita','Ishikawa','Ogawa','Maeda','Fujita','Okada','Goto','Hasegawa','Murakami','Kondo','Ishii','Saito','Sakamoto','Endo','Aoki','Fujii','Nishimura','Fukuda','Ota','Miura','Matsumoto','Nakagawa','Okamoto','Matsuda','Iwasaki','Nakata','Ueda','Morita','Harada','Kato','Ando','Takagi','Murata','Otsuka','Sugiyama','Kaneko','Iida','Hirano','Noguchi','Chiba','Matsui','Kitamura'] },
  CN: { first: ['Wei','Lei','Hao','Jun','Tao','Peng','Xiang','Zheng','Ming','Yong','Jian','Long','Chao','Feng','Lin','Gang','Bin','Liang','Bo','Kai','Zhi','Hang','Rui','Yi','Cheng','Yang','Dong','Ke','Qiang','Xin','Hua','Ning','Fei','Guang','Shan','Hong','Biao','Lun','Da','Ping','Wen','Shuai','Tian','Nan','Yu','Hai','Sheng','Kun','Zhe','Jie','Heng','Xu','Ce','Xuan','Song','Ran','Chen','Huan','Yao','Dian'], last: ['Wu','Li','Zhang','Wang','Liu','Chen','Yang','Huang','Zhao','Zhou','Xu','Sun','Ma','Zhu','Lin','He','Gao','Zheng','Luo','Song','Xie','Tang','Han','Feng','Deng','Cao','Peng','Zeng','Jiang','Yu','Pan','Cheng','Shen','Lu','Su','Ye','Yan','Lü','Ren','Yao','Wei','Gu','Shi','Dong','Dai','Fan','Xia','Qiu','Wan','Jin','Tian','Du','Yin','Kong','Bai','Cui','Qin','Chang','Meng','Liao'] },
  AD: { first: ['Marc','Jordi','Àlex','Ilde','Sergi','Cristian','Èric','Jesús','Máximo','Ludovic','Adrián','Emili','Óscar','Moisés','Rubén','Gabi','Juli','Víctor','Albert','Ricard','Joan','David','Ferran','Xavier','Arnau','Pau','Carles','Antoni','Bernat','Martí','Oriol','Gerard','Roger','Guillem','Aleix','Enric','Miquel','Francesc','Ramon','Salvador','Andreu','Llorenç','Narcís','Pere','Quim','Tomàs','Biel','Pol','Jan','Nil','Eloi','Jaume','Ignasi','Manel','Eugeni','Dídac','Marcel','Lluís','Esteve','Isidre'], last: ['Lima','Vieira','Rubio','Riera','Vales','Rebes','Cervós','García','Llovera','Alavedra','Pujol','Clemente','Moreno','San Nicolás','Martínez','Fernández','Jiménez','Silva','Maneiro','Ayala','Lorenzo','Sánchez','Gómez','Torres','Navarro','Domínguez','Pérez','Rodríguez','Montaner','Solé','Pla','Ferrer','Serra','Font','Sala','Mas','Vidal','Roca','Soler','Bonet','Camps','Puig','Coll','Gibert','Riba','Costa','Pascual','Grau','Armengol','Palau','Casals','Vilanova','Duran','Badia','Estrada','Pons','Colom','Morera','Figueras','Molins'] },
  FK: { first: ['James','William','John','Robert','David','Thomas','Michael','George','Ian','Peter','Andrew','Richard','Paul','Mark','Stephen','Simon','Timothy','Philip','Keith','Colin','Ewan','Graham','Alan','Edward','Oliver','Christopher','Roger','Derek','Stuart','Neil','Brian','Patrick','Douglas','Kenneth','Gordon','Malcolm','Hugh','Nigel','Gerald','Ralph','Clive','Barry','Trevor','Norman','Dennis','Terence','Leslie','Leonard','Ronald','Raymond','Bruce','Gavin','Craig','Angus','Ross','Hamish','Murray','Callum','Lachlan','Alistair'], last: ['Morrison','Stewart','Peck','Clarke','Felton','Sheridan','Luxton','Binnie','Watson','Aldridge','Henderson','Goodwin','Halford','Rendell','Gilbert','McLeod','Harper','Barkman','Curtis','Ross','Newman','Summers','Langdon','Adams','Roberts','Campbell','Duncan','Mitchell','Grant','Smith','Brown','Taylor','Wilson','Anderson','Sinclair','Scott','Reid','Fraser','Murray','Thomson','Hamilton','Gordon','Crawford','Wallace','Paterson','Douglas','MacDonald','Shepherd','Turner','Walker','Hall','King','Barton','Miller','Short','Lee','Biggs','Sherwood','Goss','Middleton'] },
  AR: { first: ['Santiago','Matías','Tomás','Agustín','Facundo','Nicolás','Emiliano','Leandro','Julián','Enzo','Alexis','Rodrigo','Maximiliano','Mauro','Lucas','Roberto','Javier','Hernán','Gabriel','Claudio','Fernando','Esteban','Federico','Joaquín','Ramiro','Cristian','Gonzalo','Juan','Martín','Sebastián','Ignacio','Marcos','Valentín','Franco','Lautaro','Nahuel','Ezequiel','Damián','Darío','Iván','Andrés','Marcelo','Pablo','Ariel','Sergio','Gustavo','Raúl','Alberto','Hugo','Oscar','Manuel','Ricardo','Daniel','Miguel','Fabián','Germán','Lisandro','Luciano','Adrián','Ismael'], last: ['Fernández','Martínez','López','González','Rodríguez','Gómez','Pérez','Díaz','Sánchez','Romero','Álvarez','Torres','Ruiz','Medina','Sosa','Domínguez','Rossi','Acosta','Herrera','Molina','Castro','Ortiz','Moreno','Ríos','Vázquez','Flores','Rojas','Luna','Navarro','Campos','Cabrera','Gutiérrez','Méndez','Silva','Giménez','Peralta','Juárez','Figueroa','Ibáñez','Quiroga','Aguirre','Villalba','Arias','Blanco','Pereyra','Suárez','Contreras','Bravo','Delgado','Vera','Ramos','Paredes','Paz','Benítez','Cardozo','Ledesma','Córdoba','Mansilla','Vargas','Orozco'] },
  CO: { first: ['Juan','Carlos','David','Luis','Mario','Wilmar','Mateus','Jhon','Edwin','Jefferson','Adrián','Daniel','Andrés','Sebastián','Harold','Jorge','Gustavo','Oscar','Camilo','Santiago','Álvaro','Rafael','Miguel','Fernando','Diego','Pablo','Nicolás','Esteban','Sergio','Cristian','Alejandro','Ricardo','Mauricio','Fabián','Héctor','Jaime','Iván','Leonardo','Roberto','Manuel','Gonzalo','César','Víctor','Ernesto','Ramón','Tomás','Felipe','Gabriel','Hernán','Óscar','Germán','Darío','Brayan','Stiven','Yesid','Fredy','Wilson','Arley','Duván','Roger'], last: ['Rodríguez','García','Martínez','López','Sánchez','Hernández','Díaz','Moreno','Arias','Gómez','González','Ramírez','Torres','Ospina','Zapata','Barrios','Uribe','Quintero','Castillo','Vargas','Rojas','Ortiz','Jiménez','Cruz','Reyes','Medina','Peña','Pardo','Herrera','Ramos','Flórez','Castaño','Mejía','Cardona','Giraldo','Salazar','Ríos','Escobar','Valencia','Londoño','Cárdenas','Muñoz','Montoya','Ochoa','Gutiérrez','Sierra','Marín','Álvarez','Duarte','Suárez','Correa','Pineda','Delgado','Contreras','Aguilar','Bernal','León','Vera','Soto','Acosta'] },
  CL: { first: ['Arturo','Eduardo','Claudio','Mauricio','Gonzalo','Jorge','Iván','Marcelo','Matías','Diego','Pablo','Felipe','Fabián','Víctor','Esteban','Guillermo','Leonardo','Rodrigo','Francisco','Nicolás','Sebastián','Tomás','Cristián','Carlos','Andrés','Fernando','Miguel','Alejandro','Roberto','Javier','Sergio','Daniel','Ignacio','Martín','Benjamín','Joaquín','Emilio','Hernán','Gaspar','Renato','Álvaro','Camilo','Hugo','Salvador','Manuel','Raúl','Ramón','Patricio','Germán','Ricardo','Agustín','Ismael','Oscar','Héctor','Jaime','Luciano','Maximiliano','Vicente','Simón','Gabriel'], last: ['González','Muñoz','Rojas','Díaz','Pérez','Soto','Contreras','Silva','Martínez','Sepúlveda','Morales','Rodríguez','López','Fuentes','Hernández','García','Gatica','Bravo','Reyes','Núñez','Jara','Vera','Torres','Sánchez','Castillo','Araya','Fernández','Flores','Espinoza','Valenzuela','Tapia','Figueroa','Cortés','Cáceres','Aravena','Gutiérrez','Pizarro','Henríquez','Paredes','Carrasco','Vargas','Cerda','Vega','Campos','Molina','Riquelme','Orellana','Zúñiga','Leiva','Alarcón','Herrera','Navarrete','Sandoval','Poblete','Villanueva','Lagos','Cárdenas','Moya','Bustos','Valdés'] },
  NL: { first: ['Johan','Marco','Ruud','Dennis','Edgar','Matthijs','Daley','Wesley','Stefan','Rafael','Patrick','Cody','Teun','Micky','Nathan','Ryan','Luuk','Wout','Jan','Pieter','Willem','Hendrik','Cornelis','Gerrit','Dirk','Jacobus','Johannes','Petrus','Adrianus','Theodorus','Martinus','Antonius','Franciscus','Nicolaas','Laurens','Maarten','Bart','Joost','Bram','Jeroen','Sander','Thijs','Daan','Sem','Lars','Stijn','Thomas','Tim','Max','Jesse','Niels','Wouter','Jasper','Rick','Bas','Koen','Michiel','Gijs','Rens','Hugo'], last: ['de Jong','de Vries','van den Berg','van Dijk','Bakker','Janssen','Visser','Smit','Meijer','de Boer','Mulder','de Groot','Bos','Vos','Peters','Hendriks','van Leeuwen','Dekker','Brouwer','de Wit','Dijkstra','Smeets','de Graaf','van der Meer','van der Linden','Jansen','Willems','Stolk','van Dam','Vermeer','van der Heijden','Schouten','Kuijpers','Molenaar','van de Ven','Groen','Koster','van der Berg','Scholten','van Beek','Kramer','Timmermans','Huisman','van Dijk','Geerts','Bosman','Jacobs','van Vliet','van der Wal','Wolters','van Houten','Prins','Post','Veenstra','Brands','Schipper','Aerts','Hermans','Peeters','Claessen'] },
  HR: { first: ['Luka','Ivan','Mateo','Mario','Nikola','Ante','Borna','Andrej','Duje','Josip','Šime','Mislav','Dominik','Bruno','Lovro','Kristijan','Marko','Davor','Robert','Zvonimir','Igor','Stipe','Vedran','Danijel','Niko','Dario','Tin','Tomislav','Branimir','Mirko','Hrvoje','Zlatko','Goran','Dragan','Zoran','Mladen','Darko','Zdravko','Boris','Vjekoslav','Krunoslav','Slavko','Petar','Stjepan','Marin','Filip','Luka','Fran','Jakov','Leon','David','Roko','Matija','Patrik','Sandro','Toni','Viktor','Domagoj','Alen','Karlo'], last: ['Horvat','Kovačević','Babić','Marić','Novak','Jurić','Knežević','Vuković','Matić','Tomić','Barić','Pavlović','Perić','Šimić','Filipović','Blažević','Katić','Radić','Vidović','Milić','Golubić','Grgić','Pavić','Lovrić','Čolić','Petrović','Nikolić','Mandić','Kovač','Tadić','Ivanović','Bošnjak','Popović','Dragović','Klarić','Jukić','Matijević','Lukić','Šarić','Ivković','Pranjić','Brkić','Zovko','Krstić','Mirić','Domjanović','Buljat','Turkalj','Cindrić','Magdić','Kolić','Škoro','Mlinarić','Sokol','Valentić','Čavlek','Špoljarić','Brlečić','Hudak','Žagar'] },
  TR: { first: ['Hakan','Burak','Emre','Ozan','Ferdi','Kerem','Barış','Merih','Zeki','Yusuf','Abdülkadir','Enes','Serdar','Cenk','Kaan','Orkun','Halil','Altay','Berkan','Taylan','Salih','Yunus','Kenan','Mehmet','Mustafa','Ali','Ahmet','Hüseyin','İbrahim','İsmail','Murat','Ömer','Fatih','Onur','Tolga','Volkan','Gökhan','Ümit','Ercan','Tuncay','Bülent','Sinan','Uğur','Necati','Selçuk','Adem','Batuhan','Berkay','Furkan','Görkem','Mert','Umut','Buğra','Emir','Cem','Tarık','Alper','Deniz','Koray','Tunç'], last: ['Yılmaz','Kaya','Demir','Çelik','Şahin','Yıldız','Yıldırım','Öztürk','Aydın','Özdemir','Arslan','Doğan','Kılıç','Aslan','Çetin','Kara','Kurt','Özkan','Şimşek','Polat','Koç','Erdoğan','Korkmaz','Yalçın','Aktaş','Kaplan','Tekin','Duman','Acar','Bulut','Güneş','Turan','Aksoy','Karaca','Ceylan','Coşkun','Bayrak','Karataş','Taş','Karadağ','Başaran','Ateş','Uçar','Çakır','Güler','Gündüz','Sarı','Bozkurt','Sönmez','Balcı','Erdem','Kahraman','Peker','Alkan','Işık','Durmaz','Sezer','Güngör','Topal','Akyüz'] },
  SE: { first: ['Alexander','Emil','Viktor','Sebastian','Robin','Albin','Mattias','Ludwig','Jesper','Jens','Marcus','Gustav','Hugo','Patrik','Henrik','Fredrik','Kristoffer','Oscar','Carl','Mikael','Pontus','Andreas','Per','Erik','Linus','Joel','Lars','Nils','Anders','Johan','Magnus','Tobias','Daniel','Niklas','David','Martin','Simon','Axel','Elias','Lucas','William','Oliver','Filip','Anton','Adam','Rasmus','Isak','Jakob','Felix','Oskar','Edvin','Arvid','Theodor','Malte','Viggo','Melker','Love','Valter','Leo','Casper'], last: ['Svensson','Johansson','Nilsson','Andersson','Eriksson','Karlsson','Pettersson','Lindqvist','Persson','Berglund','Larsson','Olsson','Lindström','Gustafsson','Jonsson','Lindgren','Magnusson','Jakobsson','Olofsson','Björk','Bergström','Sandström','Nordin','Holmberg','Nyström','Lundberg','Eklund','Forsberg','Hedlund','Sundberg','Wallin','Engström','Danielsson','Lundin','Håkansson','Björklund','Bergman','Mattsson','Fransson','Ström','Sjöberg','Lind','Henriksson','Åberg','Hermansson','Nyberg','Löfgren','Samuelsson','Åström','Mårtensson','Isaksson','Sandberg','Norberg','Häggström','Holmgren','Axelsson','Sjögren','Sundström','Ekström','Abrahamsson'] },
  KR: { first: ['Min-jun','Seo-jun','Do-yun','Ye-jun','Si-woo','Ha-jun','Ji-ho','Jun-seo','Geon-woo','Hyun-woo','Seung-hyun','Min-seok','Ji-hoon','Dong-hyun','Tae-hyun','Jun-hyuk','Sang-woo','Young-ho','Jae-min','Sung-ho','Woo-jin','Hyun-jun','Chan-ho','Ki-hyun','Tae-woo','Seung-woo','In-sung','Dae-ho','Byung-ho','Jin-woo','Kyung-ho','Yong-jin','Hwan','Jun-ho','Dong-wook','Soo-hyun','Tae-min','Se-hyun','Joon-young','Hyuk-jin','Min-ho','Sung-jin','Won-bin','Jae-hyun','Dong-jun','Seung-min','Gi-tae','Chang-min','Yoon-ho','Jin-hyuk','Myung-ho','Han-sol','Il-sung','Kwang-hyun','Bong-jun','Chul-soo','Nam-gil','Joon-ki','Dong-won','Ho-young'], last: ['Kim','Lee','Park','Choi','Jung','Kang','Cho','Yoon','Jang','Lim','Han','Oh','Seo','Shin','Kwon','Hwang','Ahn','Song','Yoo','Hong','Moon','Yang','Bae','Baek','Heo','Nam','Shim','Noh','Ha','Jeon','Ko','Ryu','Woo','Son','Do','Cha','Goo','Min','Byun','Uhm','Gong','Yeo','Cheon','Gil','Bang','Sul','Pi','Jin','Eum','Tak','Maeng','Chu','Seong','Pyo','On','Sa','Hyun','Hahn','Won','Tae'] },
  EG: { first: ['Mohamed','Ahmed','Mahmoud','Omar','Ali','Mostafa','Amr','Ramadan','Tarek','Karim','Marwan','Ayman','Nabil','Abdallah','Ibrahim','Hassan','Hussein','Emad','Walid','Hazem','Wael','Essam','Hamdi','Galal','Saad','Youssef','Adel','Khaled','Hossam','Ashraf','Reda','Sherif','Tamer','Hisham','Sayed','Magdi','Medhat','Alaa','Ehab','Sameh','Gamal','Fathy','Ramy','Hatem','Basem','Osama','Hesham','Amir','Abdel Rahman','Ismail','Mazen','Farouk','Shady','Ziad','Fares','Yasser','Adham','Nour','Seif','Badr'], last: ['Ibrahim','Hassan','Mohamed','Ali','Ahmed','Mahmoud','Mustafa','Hussein','Abdallah','Ismail','Osman','Salem','Farag','Mansour','Khalil','Nasser','Kamel','Abbas','Youssef','Tawfik','Gaber','Amin','Hamed','Sayed','Othman','Fawzy','Shehata','Barakat','Fouad','Abdelaziz','Morsi','Soliman','Nasr','Rashed','Rizk','Badawi','Saleh','Tantawy','Khamis','Darwish','Shaaban','Attia','Maged','Hegazy','Samir','Farid','Bakr','Abdel Nabi','Zaki','Shafik','Habib','Haroun','Ghoneim','Abdel Hamid','Moussa','Ragab','Nassar','Fahmy','Safwat','Awad'] },
  UY: { first: ['Luis','Diego','Federico','Rodrigo','José','Martín','Sebastián','Matías','Nicolás','Álvaro','Lucas','Facundo','Fernando','Agustín','Manuel','Guillermo','Marcelo','Gonzalo','Gastón','Jonathan','Juan','Carlos','Daniel','Andrés','Santiago','Gabriel','Pablo','Alejandro','Sergio','Emiliano','Maximiliano','Ignacio','Rafael','Tomás','Joaquín','Valentín','Bruno','Franco','Leandro','Cristian','Mauricio','Adrián','Ricardo','Javier','Leonardo','Esteban','Ramón','Héctor','Gonzalo','Oscar','Darío','Claudio','Germán','Iván','Raúl','Miguel','Hugo','Alberto','Jorge','Enrique'], last: ['González','Rodríguez','Martínez','López','Fernández','García','Pérez','Sánchez','Suárez','Gómez','Díaz','Silva','Torres','Álvarez','Sosa','Romero','Acosta','Castro','Hernández','Moreno','Vázquez','Medina','Cabrera','Giménez','Araújo','Núñez','Pereyra','Olivera','Ferreira','Ríos','Cardozo','Méndez','Duarte','Flores','Rojas','Blanco','Vargas','Delgado','Ramos','Benítez','Correa','Vera','Campos','Ortiz','Herrera','Ibáñez','Aguirre','Navarro','Cáceres','Viera','Piriz','Bentancur','Valdez','Ponce','Techera','Pírez','Reyes','Peluffo','Lemos','Godín'] },
  AU: { first: ['Aaron','Mathew','Mitchell','Harry','Martin','Jason','Bailey','Thomas','Craig','Tim','Mark','Lucas','Riley','Connor','Cameron','Jackson','Joel','Jamie','Joshua','Trent','Brandon','Liam','Oliver','Jack','Noah','William','James','Ethan','Alexander','Daniel','Samuel','Ryan','Nathan','Ben','Angus','Cooper','Lachlan','Harrison','Finn','Archie','Oscar','Leo','Max','Charlie','Kai','Tyler','Jayden','Caleb','Isaac','Dylan','Brodie','Heath','Shane','Darren','Scott','Brett','Todd','Glen','Dean','Troy'], last: ['Smith','Jones','Williams','Brown','Wilson','Taylor','Johnson','White','Martin','Anderson','Thompson','Walker','Harris','Lee','Ryan','Robinson','Kelly','King','Davis','Wright','Evans','Roberts','Green','Hall','Campbell','Mitchell','Clark','Young','Hill','Moore','Baker','Turner','Collins','Stewart','Murphy','Morris','Cook','Bell','Ward','Watson','Morgan','Palmer','Gray','James','Simpson','Reid','McDonald','Fraser','Hamilton','Hunt','Graham','Scott','Gibson','Barker','Hart','Gardner','Chapman','Lloyd','Stone','Dixon'] },
  IL: { first: ['Eran','Yossi','Eli','Omer','Dor','Lior','Manor','Shon','Gadi','Tomer','Sagiv','Nir','Raz','Eden','Tal','Liel','Oscar','Eyal','Ofir','Gil','Ram','Idan','Itay','David','Noam','Yoav','Amit','Ori','Alon','Nadav','Rotem','Avi','Shai','Moshe','Ariel','Yonatan','Elad','Matan','Yuval','Oren','Asher','Barak','Gal','Dan','Ido','Yaniv','Ronen','Nimrod','Omri','Shachar','Uri','Doron','Yarden','Netanel','Ron','Hen','Ophir','Guy','Dvir','Maor'], last: ['Cohen','Levi','Mizrachi','Peretz','Biton','Dahan','Azulay','Friedman','Avraham','Ben David','Shapira','Malka','Amar','Katz','Yosef','Gabay','Hadad','Ben Ari','Ochana','Shalom','Segal','Mor','Golan','Edri','Maman','Sasson','Elbaz','Ohana','Shriki','Naim','Berger','Klein','Schwartz','Rosen','Goldstein','Feldman','Weiss','Stern','Blau','Kaplan','Zohar','Haim','Almog','Baruch','Shimon','Tadmor','Ashkenazi','Dayan','Raz','Tzur','Shaul','Barak','Lavi','Ben Simon','Turgeman','Sabag','Marciano','Harari','Ohayon','Toledano'] },
  IT: { first: ['Marco','Andrea','Alessandro','Lorenzo','Federico','Leonardo','Giovanni','Sandro','Ciro','Francesco','Roberto','Fabio','Matteo','Giacomo','Davide','Gianluca','Claudio','Daniele','Filippo','Riccardo','Simone','Luca','Antonio','Giorgio','Emanuele','Salvatore','Angelo','Vincenzo','Giuseppe','Mario','Stefano','Michele','Nicola','Massimo','Paolo','Pietro','Tommaso','Edoardo','Gabriele','Alessio','Enrico','Carlo','Sergio','Alberto','Dario','Giulio','Umberto','Renato','Enzo','Valerio','Diego','Samuele','Cristiano','Raffaele','Pasquale','Domenico','Gennaro','Luciano','Adriano','Vittorio'], last: ['Rossi','Bianchi','Romano','Ferrari','Esposito','Colombo','Ricci','Moretti','Marchetti','Barbieri','Fontana','Galli','Conti','Costa','Marini','Bruno','Mancini','Leone','Longo','Greco','Rinaldi','Serra','Ferrara','Pellegrini','Gentile','Martinelli','Caruso','Vitale','Benedetti','Montanari','Russo','Lombardi','Gallo','De Luca','Giordano','Mazza','Riva','Cattaneo','Testa','Sala','Basile','Parisi','Amato','Santoro','Farina','D\'Angelo','Silvestri','Palumbo','Mazza','Coppola','Messina','Orlando','Grasso','De Rosa','Sorrentino','Valentini','Rizzi','Bianco','Neri','Monti'] },
};

/** Fallback generic first names for any unmapped country */
export const GENERIC_FIRST: readonly string[] = [
  'Carlos','Ahmed','Wei','Diego','Omar','Ivan','Mateo','Felix','Leon','Oscar',
  'Pedro','Lucas','Bruno','Andre','James','Jack','Harry','Max','Marco','Luca',
  'Yuki','Aleksandr','Henrik','Emre','Kwame','Ravi','Ali','Niko','Rafael','Stefan',
] as const;

/** Fallback generic last names for any unmapped country */
export const GENERIC_LAST: readonly string[] = [
  'Silva','Santos','Garcia','Martinez','Mueller','Schmidt','Petrov','Rossi','Tanaka','Kim',
  'Fernandes','Costa','Torres','Ramos','Weber','Klein','Brown','Taylor','Park','Chen',
  'Johansson','Novak','Horvat','Ali','Okafor','Singh','Nakamura','Popov','Hansen','Moreau',
] as const;

/* ================================================================
   MORALE SYSTEM (#4)
   ================================================================ */

/** Morale gained per win */
export const MORALE_WIN = 1;
/** Morale lost per loss */
export const MORALE_LOSS = -1;
/** Morale boost for promotion */
export const MORALE_PROMOTION = 5;
/** Morale penalty for relegation */
export const MORALE_RELEGATION = -5;
/** Maximum morale value */
export const MORALE_MAX = 10;
/** Minimum morale value */
export const MORALE_MIN = -10;
/** Morale effect on team strength per point (0.5%) */
export const MORALE_STRENGTH_PCT = 0.005;

/* ================================================================
   PLAYER ROLES (#5)
   ================================================================ */

/** Available player roles by position */
export const ROLES_BY_POSITION: Readonly<Record<Position, readonly PlayerRole[]>> = {
  GK: ['anchor', null],
  DEF: ['ballWinner', 'anchor', null],
  MID: ['playmaker', 'creator', 'ballWinner', null],
  STR: ['targetMan', 'speedster', 'creator', null],
} as const;

/** Tactic-role synergy bonuses (fractional, e.g. 0.03 = +3%) */
export const ROLE_TACTIC_SYNERGY: Readonly<Partial<Record<PlayerRole & string, Partial<Record<TacticId, number>>>>> = {
  playmaker: { balanced: 0.03 },
  targetMan: { attack: 0.05 },
  ballWinner: { defensive: 0.04 },
  speedster: { counter: 0.05 },
  creator: { attack: 0.03 },
  anchor: { defensive: 0.03 },
} as const;

/* ================================================================
   SPONSORSHIP DEALS (#6)
   ================================================================ */

/** Available sponsorship tiers */
export const SPONSORSHIP_TIERS: readonly Sponsorship[] = [
  { tier: 'small', incomePerSeason: 500, requiredDiv: 4 },
  { tier: 'medium', incomePerSeason: 1000, requiredDiv: 3 },
  { tier: 'large', incomePerSeason: 2000, requiredDiv: 1 },
] as const;

/* ================================================================
   STADIUM FACILITIES (#7)
   ================================================================ */

/** Cost per facility level upgrade [level1, level2, level3] */
export const FACILITY_COSTS: Readonly<Record<string, readonly number[]>> = {
  trainingFacility: [5000, 8000, 12000],
  youthAcademy: [8000, 13000, 20000],
  stadium: [3000, 5000, 8000],
} as const;

/** Training facility effectiveness bonus per level */
export const TRAINING_FACILITY_BONUS = 0.03;
/** Youth academy regen skill bonus per level */
export const YOUTH_ACADEMY_SKILL_BONUS = 2;
/** Stadium income per home game, per level (paid immediately after each home match) */
export const STADIUM_HOME_GAME_BONUS = 150;
/** Stadium end-of-season income bonus per level */
export const STADIUM_INCOME_BONUS = 500;

/* ================================================================
   LOAN SYSTEM (#8)
   ================================================================ */

/** Loan fee as fraction of market value */
export const LOAN_FEE_RATIO = 0.30;

/* ================================================================
   RIVAL PAIRS (#13)
   ================================================================ */

/** Rival team pairs (by team name) */
export const RIVAL_PAIRS: readonly [string, string][] = [
  ['Barcelona', 'Madrid'],
  ['Manchester', 'Liverpool'],
  ['Porto', 'Lisbon'],
  ['Berlin', 'Dortmund'],
  ['Paris', 'Lyon'],
  ['São Paulo', 'Santos'],
  ['Chicago', 'Los Angeles'],
  ['Vancouver', 'Toronto'],
  ['Tokyo', 'Beijing'],
  ['Buenos Aires', 'Montevideo'],
] as const;

/** Derby form multiplier (doubles form changes) */
export const DERBY_FORM_MULT = 2;
/** Derby morale bonus for winning */
export const DERBY_MORALE_BONUS = 2;

/* ================================================================
   SCOUT NETWORK (#18)
   ================================================================ */

/** Scout upgrade costs by level */
export const SCOUT_COSTS: readonly number[] = [0, 2000, 3000] as const;

/* ================================================================
   TRANSFER NEGOTIATION (#17)
   ================================================================ */

/** Maximum negotiation rounds */
export const NEGOTIATION_MAX_ROUNDS = 3;
/** AI seller initial markup range (10-30% above minimum) */
export const NEGOTIATION_MARKUP_MIN = 0.10;
export const NEGOTIATION_MARKUP_MAX = 0.30;
/** Each counter-offer reduces the gap by this fraction */
export const NEGOTIATION_REDUCTION = 0.50;

/* ================================================================
   MATCH NARRATIVE TEMPLATES (#excitement)
   ================================================================ */

/**
 * Goal narrative templates by position.
 * Placeholders: {name} = scorer name, {minute} = minute of goal.
 */
export const GOAL_NARRATIVES: Readonly<Record<Position, readonly string[]>> = {
  STR: [
    '{name} fires it into the bottom corner!',
    '{name} beats the keeper with a clinical finish!',
    '{name} volleys it home from close range!',
    '{name} rounds the goalkeeper and slots it in!',
    'A brilliant solo run by {name} — GOAL!',
    '{name} rises highest and heads it in!',
    '{name} smashes it into the roof of the net!',
    'Cool as you like, {name} chips the keeper!',
    '{name} pounces on a defensive error — GOAL!',
    '{name} with a thunderbolt from 20 yards!',
  ],
  MID: [
    '{name} unleashes a screamer from distance!',
    '{name} curls one in from 25 yards!',
    'A perfectly-timed run by {name} — taps it in!',
    '{name} picks up a loose ball and drives it home!',
    '{name} threads it through a crowd of defenders!',
    '{name} with a stunning long-range strike!',
    'Great link-up play and {name} finishes it off!',
    '{name} arrives late in the box — what a goal!',
  ],
  DEF: [
    '{name} heads in from a corner!',
    '{name} rises above everyone at the set piece — GOAL!',
    'A towering header from {name}!',
    '{name} smashes it in from a free kick!',
    '{name} ghosting in at the back post — unlikely scorer!',
    'Nobody picked up {name} at the corner — 1-0!',
  ],
  GK: [
    '{name} — yes the goalkeeper — scores from a free kick!',
    'Incredible! {name} runs the length of the pitch and scores!',
  ],
} as const;

/** Late-goal narrative suffixes (appended for goals 85'+) */
export const LATE_GOAL_SUFFIXES: readonly string[] = [
  ' A dramatic late goal!',
  ' The stadium erupts!',
  ' Scenes of delirium!',
  ' Heartbreak for the opposition!',
  ' What a time to score!',
  ' It\'s a last-gasp thriller!',
  ' Written in the stars!',
  ' You couldn\'t script it!',
] as const;

/** Yellow card narrative templates */
export const YELLOW_NARRATIVES: readonly string[] = [
  '{name} is booked for a late challenge.',
  '{name} picks up a yellow for persistent fouling.',
  'The referee shows {name} a yellow card.',
  '{name} goes into the book after a cynical foul.',
  'A reckless tackle from {name} — yellow card.',
] as const;

/** Red card narrative templates */
export const RED_NARRATIVES: readonly string[] = [
  '{name} is sent off! A terrible challenge!',
  'Straight red for {name} — violent conduct!',
  '{name} sees red after a two-footed lunge!',
  '{name} receives a second yellow — off you go!',
  'The referee has no choice — {name} is dismissed!',
] as const;

/** Probability of a goal occurring in the final 10 minutes (85-93) — adds drama */
export const LATE_GOAL_BIAS = 0.20;

/* ================================================================
   TITLE RACE / RELEGATION PRESSURE (#excitement)
   ================================================================ */

/** Weeks remaining in season when pressure kicks in */
export const PRESSURE_THRESHOLD_WEEKS = 4;
/** Form multiplier for teams in title race or relegation battle */
export const PRESSURE_FORM_MULT = 1.5;
/** Strength variance boost for pressure matches (more unpredictable) */
export const PRESSURE_VARIANCE = 0.08;

/* ================================================================
   TRANSFER DEADLINE DAY (#excitement)
   ================================================================ */

/** Week number that acts as transfer deadline day (last chance to buy) */
export const TRANSFER_DEADLINE_WEEK = 3;
/** Price discount on deadline day */
export const DEADLINE_DAY_DISCOUNT = 0.20;
/** Extra free agents spawned on deadline day */
export const DEADLINE_DAY_EXTRA_AGENTS = 4;

/* ================================================================
   HOT STREAK / ON FIRE (#excitement)
   ================================================================ */

/** Minimum form to trigger "On Fire" status */
export const ON_FIRE_FORM_MIN = 3;
/** Minimum recent goals to trigger "On Fire" status */
export const ON_FIRE_GOALS_MIN = 3;
/** OVR bonus multiplier when "On Fire" */
export const ON_FIRE_BONUS = 1.08;

/* ================================================================
   MAN OF THE MATCH (#excitement)
   ================================================================ */

/** MOTM is tracked per fixture — stored transiently on the fixture */
export const MOTM_GOAL_WEIGHT = 3;
export const MOTM_FORM_WEIGHT = 1;
export const MOTM_SKILL_WEIGHT = 1;

/* ================================================================
   AGGREGATE CONFIG OBJECT
   ================================================================ */

/**
 * GAME_CONFIG — a single object bundling all constants for convenience.
 * Individual named exports above are preferred for tree-shaking,
 * but this object is useful when passing config around as a whole.
 */
export const GAME_CONFIG = {
  version: GAME_VERSION,
  saveKey: SAVE_KEY,
  settingsKey: SETTINGS_KEY,

  // League
  teamsPerDiv: TEAMS_PER_DIV,
  seasonWeeks: SEASON_WEEKS,
  totalSeasonWeeks: TOTAL_SEASON_WEEKS,

  // Formations & tactics
  formations: FORMATIONS,
  defaultFormationIdx: DEFAULT_FORMATION_IDX,
  tactics: TACTICS,

  // Positions
  posOrder: POS_ORDER,
  posCss: POS_CSS,
  posDistance: POS_DISTANCE,
  oopPenaltyPerStep: OOP_PENALTY_PER_STEP,
  squadComp: SQUAD_COMP,
  goalPosWeight: GOAL_POS_WEIGHT,

  // Training
  trainingSkillChance: TRAINING_SKILL_CHANCE,
  trainingFocusBonus: TRAINING_FOCUS_BONUS,
  trainingFocuses: TRAINING_FOCUSES,

  // Discipline
  yellowCardChance: YELLOW_CARD_CHANCE,
  redCardChance: RED_CARD_CHANCE,
  yellowAccumulation: YELLOW_ACCUMULATION,
  redSuspension: RED_SUSPENSION,

  // Form
  formWinBoost: FORM_WIN_BOOST,
  formGoalBoost: FORM_GOAL_BOOST,
  formLossPenalty: FORM_LOSS_PENALTY,
  formMax: FORM_MAX,
  formMin: FORM_MIN,
  formOvrPct: FORM_OVR_PCT,

  // Division ranges & income
  divRange: DIV_RANGE,
  divSeasonIncome: DIV_SEASON_INCOME,
  divWinBonus: DIV_WIN_BONUS,
  divDrawBonus: DIV_DRAW_BONUS,

  // Prize money
  prizeMoney: PRIZE_MONEY,
  parachutePayment: PARACHUTE_PAYMENT,
  solidarityPayment: SOLIDARITY_PAYMENT,
  aiTargetSquad: AI_TARGET_SQUAD,

  // Transfer market
  startingBudget: STARTING_BUDGET,
  freeAgentsPerSeason: FREE_AGENTS_PER_SEASON,
  maxFreeAgentPool: MAX_FREE_AGENT_POOL,
  freeAgentSkillRange: FREE_AGENT_SKILL_RANGE,
  sellValueRatio: SELL_VALUE_RATIO,
  squadMin: SQUAD_MIN,
  squadMax: SQUAD_MAX,

  // New features
  difficultySettings: DIFFICULTY_SETTINGS,
  developmentCurves: DEVELOPMENT_CURVES,
} as const;
