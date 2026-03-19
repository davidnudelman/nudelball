/**
 * Player engine module — handles player creation, migration, rating
 * calculations, out-of-position penalties, and development curves.
 *
 * All player-related logic that was previously inlined in index.html
 * is centralised here so the rest of the engine can import cleanly.
 */

import type { Player, PlayerExtra, PlayerRole, Position } from '../types';
import {
  COUNTRY_NAMES,
  GENERIC_FIRST,
  GENERIC_LAST,
  DIV_RANGE,
  POS_DISTANCE,
  OOP_PENALTY_PER_STEP,
  FORM_OVR_PCT,
  DEVELOPMENT_CURVE_TABLE,
  RETIREMENT_AGE,
  ROLES_BY_POSITION,
} from '../config';

// ---------------------------------------------------------------------------
// Utility helpers (pure, no side-effects)
// ---------------------------------------------------------------------------

/** Random integer in [a, b] inclusive. */
const rand = (a: number, b: number): number =>
  Math.floor(Math.random() * (b - a + 1)) + a;

/** Clamp and round a value to [lo, hi]. */
const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, Math.round(v)));

/** Pick a random element from an array. */
const pick = <T>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

// ---------------------------------------------------------------------------
// Name Generation
// ---------------------------------------------------------------------------

/**
 * Generate a culturally-appropriate player name based on a country code.
 *
 * If the country code has a name pool defined in `COUNTRY_NAMES`, a random
 * first + last name is drawn from that pool. Otherwise, the generic fallback
 * pools are used.
 *
 * @param country - Two-letter country code (e.g. "ES", "EN", "BR").
 * @returns A full name string like "Carlos García".
 */
export const genName = (country: string): string => {
  const pool = COUNTRY_NAMES[country];
  if (pool) {
    return pick(pool.first) + ' ' + pick(pool.last);
  }
  return pick(GENERIC_FIRST) + ' ' + pick(GENERIC_LAST);
};

// ---------------------------------------------------------------------------
// Skill Generation
// ---------------------------------------------------------------------------

/**
 * Generate a single skill value appropriate for a division tier.
 *
 * Higher divisions produce players with higher skill ranges. The value is
 * clamped to the [1, 50] skill scale.
 *
 * @param div - Division number (1 = top, 4 = bottom).
 * @returns A skill value in [1, 50].
 */
export const genSkill = (div: number): number => {
  const [lo, hi] = DIV_RANGE[div] || DIV_RANGE[4];
  return clamp(rand(lo, hi), 1, 50);
};

// ---------------------------------------------------------------------------
// Out-of-Position Penalty
// ---------------------------------------------------------------------------

/**
 * Calculate the OOP (out-of-position) multiplier for a player.
 *
 * Simplified system:
 * - Natural position (or unassigned) = 1.0 (full strength)
 * - GK ↔ outfield = 0 (completely locked)
 * - Adjacent position (1 step) = 0.90 (-10%)
 * - 2+ steps away = 0 (can't play there)
 *
 * @param naturalPos - The player's natural position.
 * @param assignedPos - The position they are currently assigned to (null = natural).
 * @returns A multiplier: 1.0, 0.90, or 0.
 */
export const getOopPenalty = (naturalPos: Position, assignedPos: Position | null): number => {
  if (!assignedPos || assignedPos === naturalPos) return 1.0;
  /* GK is locked — cannot play outfield, outfield cannot play GK */
  if (naturalPos === 'GK' || assignedPos === 'GK') return 0;
  const steps = Math.abs(POS_DISTANCE[naturalPos] - POS_DISTANCE[assignedPos]);
  if (steps === 1) return 0.90;
  return 0; /* 2+ steps away = can't play */
};

// ---------------------------------------------------------------------------
// Effective Overall Rating
// ---------------------------------------------------------------------------

/**
 * Calculate a player's effective overall rating.
 *
 * The formula accounts for:
 * - **Stamina**: performance scales from 50% to 100% of base skill.
 * - **Fresh bonus**: +10% if the player has rested for 3+ matches and is selected.
 * - **OOP penalty**: reduced effectiveness when playing out of natural position.
 * - **Form**: each form point (range -3 to +3) adjusts OVR by ±5%.
 *
 * The result is capped at the player's base skill (no exceeding 50).
 *
 * @param p - The player object.
 * @returns Effective rating in [1, player.skill].
 */
export const playerOvr = (p: Player): number => {
  const stam = p.stamina != null ? p.stamina : 100;
  const base = p.skill * (0.5 + 0.5 * stam / 100); /* stamina impact: range 50%-100% */
  const freshBonus = (p.benchStreak >= 3 && p.selected) ? 1.10 : 1.0;
  const oopMult = getOopPenalty(p.pos, p.assignedPos);
  const formMult = 1.0 + ((p.form || 0) * FORM_OVR_PCT); /* ±5% per form point */
  const raw = Math.round(base * freshBonus * oopMult * formMult);
  return Math.max(1, Math.min(raw, p.skill)); /* cap at base skill (50 max) */
};

// ---------------------------------------------------------------------------
// Player Creation
// ---------------------------------------------------------------------------

/**
 * Create a new player object with all fields properly initialised.
 *
 * The skill value is clamped to [1, 50]. If no age is provided, a random
 * age between 18-33 is assigned. Extra fields can be merged via the `extra`
 * parameter for special cases (academy players, regens, etc.).
 *
 * @param name  - Full player name.
 * @param pos   - Natural position.
 * @param skill - Base skill (will be clamped to [1, 50]).
 * @param age   - Player age (defaults to random 18-33).
 * @param extra - Optional partial player fields to merge in.
 * @returns A fully-initialised Player object.
 */
export const makePlayer = (
  name: string,
  pos: Position,
  skill: number,
  age?: number,
  extra?: PlayerExtra,
): Player => {
  const player: Player = {
    name,
    pos,
    skill: clamp(skill, 1, 50),
    stamina: 100,
    benchStreak: 0,
    assignedPos: null,
    selected: false,
    age: age || rand(18, 33),
    injuredFor: 0,
    /* v2.0 stats */
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
    /* Assign a random role based on position (#5) */
    role: pick(ROLES_BY_POSITION[pos] || [null]) as PlayerRole,
  };

  if (extra) {
    Object.assign(player, extra);
  }

  return player;
};

// ---------------------------------------------------------------------------
// Player Migration (backward compatibility)
// ---------------------------------------------------------------------------

/**
 * Ensure an old save's player object has all v2.0 fields.
 *
 * When loading a save from an older version, some player properties may be
 * missing. This function patches in defaults without overwriting existing
 * values, preserving backward compatibility.
 *
 * @param p - The player object (mutated in-place).
 * @returns The same player reference with all fields guaranteed to exist.
 */
export const migratePlayer = (p: Player): Player => {
  if (p.careerGoals == null) p.careerGoals = 0;
  if (p.careerApps == null) p.careerApps = 0;
  if (p.seasonGoals == null) p.seasonGoals = 0;
  if (p.seasonApps == null) p.seasonApps = 0;
  if (p.seasonYellows == null) p.seasonYellows = 0;
  if (p.seasonReds == null) p.seasonReds = 0;
  if (p.form == null) p.form = 0;
  if (p.formStreak == null) p.formStreak = 0;
  if (p.suspendedFor == null) p.suspendedFor = 0;
  if (p.isAcademy == null) p.isAcademy = false;
  if (p.injuredFor == null) p.injuredFor = 0;
  return p;
};

// ---------------------------------------------------------------------------
// Player Development Curve (NEW)
// ---------------------------------------------------------------------------

/**
 * Apply age-based development effects to a player at season end.
 *
 * Uses the `DEVELOPMENT_CURVE_TABLE` from config to determine probability
 * and magnitude of skill changes:
 * - Players under 26 have a meaningful chance to improve (up to +3 for teens).
 * - Players 26-29 are in their prime — minimal change in either direction.
 * - Players 30+ face increasing decline probability and magnitude.
 *
 * The function rolls against the improvement/decline chance independently,
 * so a player in the 26-29 bracket could theoretically improve AND decline
 * in the same season (net zero or ±1).
 *
 * @param player - The player to develop (mutated in-place).
 * @returns The same player reference after development is applied.
 */
export const applyDevelopmentCurve = (player: Player): Player => {
  const age = player.age || 25;

  /* Find the matching curve bracket for this player's age */
  const curve = DEVELOPMENT_CURVE_TABLE.find(c => age >= c.minAge && age <= c.maxAge);

  if (!curve) {
    /* No curve defined for this age — no development change */
    return player;
  }

  /* Improvement roll */
  if (curve.improvementChance > 0 && Math.random() < curve.improvementChance) {
    const gain = rand(1, curve.maxGain);
    player.skill = clamp(player.skill + gain, 1, 50);
  }

  /* Decline roll */
  if (curve.declineChance > 0 && Math.random() < curve.declineChance) {
    const loss = rand(1, curve.maxLoss);
    player.skill = Math.max(1, player.skill - loss);
  }

  return player;
};

// ---------------------------------------------------------------------------
// Player Aging & Retirement (NEW)
// ---------------------------------------------------------------------------

/**
 * Increment a player's age and check whether they should retire.
 *
 * Players at or above `RETIREMENT_AGE` (38) are flagged for retirement.
 * The caller is responsible for removing the player from the squad and
 * generating a replacement (regen) if needed.
 *
 * @param player - The player to age (mutated in-place).
 * @returns An object containing the aged player and a `retired` flag.
 */
export const agePlayer = (player: Player): { player: Player; retired: boolean } => {
  player.age = (player.age || 25) + 1;
  const retired = player.age >= RETIREMENT_AGE;
  return { player, retired };
};

// ---------------------------------------------------------------------------
// Re-exported Utilities (used by other engine modules)
// ---------------------------------------------------------------------------

export { rand, clamp, pick };
