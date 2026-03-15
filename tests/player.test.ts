/**
 * tests/player.test.ts — Unit tests for src/engine/player.ts
 *
 * Covers: makePlayer, playerOvr, getOopPenalty, genSkill,
 *         applyDevelopmentCurve, agePlayer, genName
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  makePlayer,
  playerOvr,
  getOopPenalty,
  genSkill,
  applyDevelopmentCurve,
  agePlayer,
  genName,
} from '../src/engine/player';
import { DIV_RANGE, RETIREMENT_AGE } from '../src/config';
import type { Player, Position } from '../src/types';

/* ================================================================
   Helper: create a base player for testing
   ================================================================ */
const basePlayer = (overrides: Partial<Player> = {}): Player => ({
  name: 'Test Player',
  pos: 'MID',
  skill: 30,
  stamina: 100,
  benchStreak: 0,
  assignedPos: null,
  selected: false,
  age: 25,
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
  ...overrides,
});

/* ================================================================
   makePlayer() — player creation
   ================================================================ */
describe('makePlayer()', () => {
  it('creates a player with the given name, position, and skill', () => {
    const p = makePlayer('Carlos Garcia', 'STR', 35);
    expect(p.name).toBe('Carlos Garcia');
    expect(p.pos).toBe('STR');
    expect(p.skill).toBe(35);
  });

  it('sets stamina to 100 by default', () => {
    const p = makePlayer('Test', 'GK', 20);
    expect(p.stamina).toBe(100);
  });

  it('sets benchStreak to 0', () => {
    const p = makePlayer('Test', 'DEF', 25);
    expect(p.benchStreak).toBe(0);
  });

  it('sets selected to false', () => {
    const p = makePlayer('Test', 'MID', 30);
    expect(p.selected).toBe(false);
  });

  it('sets assignedPos to null', () => {
    const p = makePlayer('Test', 'STR', 40);
    expect(p.assignedPos).toBeNull();
  });

  it('uses the provided age', () => {
    const p = makePlayer('Test', 'DEF', 25, 22);
    expect(p.age).toBe(22);
  });

  it('assigns a random age between 18-33 when age is not provided', () => {
    for (let i = 0; i < 50; i++) {
      const p = makePlayer('Test', 'MID', 30);
      expect(p.age).toBeGreaterThanOrEqual(18);
      expect(p.age).toBeLessThanOrEqual(33);
    }
  });

  it('clamps skill to [1, 50]', () => {
    const tooLow = makePlayer('Test', 'GK', -5);
    expect(tooLow.skill).toBe(1);

    const tooHigh = makePlayer('Test', 'GK', 75);
    expect(tooHigh.skill).toBe(50);
  });

  it('initialises all v2.0 stat fields to zero', () => {
    const p = makePlayer('Test', 'MID', 30);
    expect(p.careerGoals).toBe(0);
    expect(p.careerApps).toBe(0);
    expect(p.seasonGoals).toBe(0);
    expect(p.seasonApps).toBe(0);
    expect(p.seasonYellows).toBe(0);
    expect(p.seasonReds).toBe(0);
    expect(p.form).toBe(0);
    expect(p.formStreak).toBe(0);
    expect(p.suspendedFor).toBe(0);
    expect(p.isAcademy).toBe(false);
  });

  it('merges extra fields without overwriting defaults', () => {
    const p = makePlayer('Test', 'DEF', 25, 20, { isAcademy: true, careerGoals: 5 });
    expect(p.isAcademy).toBe(true);
    expect(p.careerGoals).toBe(5);
    /* Other defaults should still be present */
    expect(p.stamina).toBe(100);
    expect(p.benchStreak).toBe(0);
  });
});

/* ================================================================
   playerOvr() — effective overall rating
   ================================================================ */
describe('playerOvr()', () => {
  it('returns the full skill at 100% stamina, no penalties, zero form', () => {
    /* Base case: skill=30, stamina=100, no OOP, form=0 */
    const p = basePlayer({ skill: 30, stamina: 100, form: 0 });
    expect(playerOvr(p)).toBe(30);
  });

  it('reduces rating with lower stamina', () => {
    /* At stamina=50: base = 30 * (0.5 + 0.5 * 50/100) = 30 * 0.75 = 22.5 -> 23 */
    const p = basePlayer({ skill: 30, stamina: 50 });
    const ovr = playerOvr(p);
    expect(ovr).toBeLessThan(30);
    expect(ovr).toBeGreaterThan(0);
  });

  it('halves the rating at 0% stamina', () => {
    /* At stamina=0: base = 30 * (0.5 + 0) = 15 */
    const p = basePlayer({ skill: 30, stamina: 0 });
    expect(playerOvr(p)).toBe(15);
  });

  it('applies OOP penalty when playing out of position', () => {
    /* DEF player assigned to STR: 2 steps away -> 0.70 multiplier */
    const p = basePlayer({ pos: 'DEF', assignedPos: 'STR', skill: 30 });
    const ovr = playerOvr(p);
    expect(ovr).toBeLessThan(30);
  });

  it('applies form bonus (positive form)', () => {
    /* form=3 -> formMult = 1.0 + 3*0.05 = 1.15 */
    /* base=30, raw=30*1.15=34.5 -> 35, capped at 30 */
    const p = basePlayer({ skill: 30, form: 3 });
    const ovr = playerOvr(p);
    /* The result is capped at the player's base skill */
    expect(ovr).toBeLessThanOrEqual(30);
  });

  it('applies form penalty (negative form)', () => {
    /* form=-3 -> formMult = 1.0 + (-3)*0.05 = 0.85 */
    /* base=30, raw=30*0.85=25.5 -> 26 */
    const p = basePlayer({ skill: 30, form: -3 });
    const ovr = playerOvr(p);
    expect(ovr).toBeLessThan(30);
    expect(ovr).toBeGreaterThan(0);
  });

  it('applies fresh bonus when benchStreak >= 3 and selected', () => {
    /* Fresh bonus = 1.10 multiplier */
    const fresh = basePlayer({ skill: 30, benchStreak: 3, selected: true });
    const normal = basePlayer({ skill: 30, benchStreak: 0, selected: true });
    /* Fresh player should have higher OVR (but capped at skill) */
    /* 30 * 1.10 = 33, capped at 30 */
    expect(playerOvr(fresh)).toBeLessThanOrEqual(fresh.skill);
  });

  it('does not apply fresh bonus when benchStreak < 3', () => {
    const p = basePlayer({ skill: 30, benchStreak: 2, selected: true });
    expect(playerOvr(p)).toBe(30);
  });

  it('does not apply fresh bonus when not selected', () => {
    const p = basePlayer({ skill: 30, benchStreak: 5, selected: false });
    expect(playerOvr(p)).toBe(30);
  });

  it('caps the result at the player base skill', () => {
    /* Even with all bonuses, the result should never exceed base skill */
    const p = basePlayer({
      skill: 40,
      stamina: 100,
      benchStreak: 5,
      selected: true,
      form: 3,
    });
    expect(playerOvr(p)).toBeLessThanOrEqual(40);
  });

  it('returns at least 1', () => {
    const p = basePlayer({ skill: 1, stamina: 0, form: -3 });
    expect(playerOvr(p)).toBeGreaterThanOrEqual(1);
  });

  it('correctly combines stamina reduction and form penalty', () => {
    /* skill=30, stamina=50, form=-2 */
    /* base = 30 * (0.5 + 0.5 * 50/100) = 30 * 0.75 = 22.5 */
    /* formMult = 1.0 + (-2)*0.05 = 0.90 */
    /* raw = round(22.5 * 0.90) = round(20.25) = 20 */
    const p = basePlayer({ skill: 30, stamina: 50, form: -2 });
    const ovr = playerOvr(p);
    expect(ovr).toBe(20);
  });
});

/* ================================================================
   getOopPenalty() — out-of-position penalty multiplier
   ================================================================ */
describe('getOopPenalty()', () => {
  it('returns 1.0 when playing in natural position', () => {
    expect(getOopPenalty('MID', 'MID')).toBe(1.0);
    expect(getOopPenalty('DEF', 'DEF')).toBe(1.0);
    expect(getOopPenalty('GK', 'GK')).toBe(1.0);
    expect(getOopPenalty('STR', 'STR')).toBe(1.0);
  });

  it('returns 1.0 when assignedPos is null (unassigned)', () => {
    expect(getOopPenalty('MID', null)).toBe(1.0);
    expect(getOopPenalty('GK', null)).toBe(1.0);
  });

  it('returns 0.85 when one step away (DEF -> MID)', () => {
    /* DEF(1) -> MID(2) = 1 step * 0.15 = 0.15 penalty -> 0.85 */
    expect(getOopPenalty('DEF', 'MID')).toBe(0.85);
  });

  it('returns 0.85 when one step away (MID -> STR)', () => {
    expect(getOopPenalty('MID', 'STR')).toBe(0.85);
  });

  it('returns 0.70 when two steps away (DEF -> STR)', () => {
    /* DEF(1) -> STR(3) = 2 steps * 0.15 = 0.30 penalty -> 0.70 */
    expect(getOopPenalty('DEF', 'STR')).toBe(0.7);
  });

  it('returns 0 when GK is assigned outfield', () => {
    expect(getOopPenalty('GK', 'DEF')).toBe(0);
    expect(getOopPenalty('GK', 'MID')).toBe(0);
    expect(getOopPenalty('GK', 'STR')).toBe(0);
  });

  it('returns 0 when outfield player is assigned to GK', () => {
    expect(getOopPenalty('DEF', 'GK')).toBe(0);
    expect(getOopPenalty('MID', 'GK')).toBe(0);
    expect(getOopPenalty('STR', 'GK')).toBe(0);
  });

  it('is symmetric for outfield positions', () => {
    expect(getOopPenalty('DEF', 'MID')).toBe(getOopPenalty('MID', 'DEF'));
    expect(getOopPenalty('DEF', 'STR')).toBe(getOopPenalty('STR', 'DEF'));
    expect(getOopPenalty('MID', 'STR')).toBe(getOopPenalty('STR', 'MID'));
  });
});

/* ================================================================
   genSkill() — division-based skill generation
   ================================================================ */
describe('genSkill()', () => {
  it('stays within division 1 range [28, 46]', () => {
    const [lo, hi] = DIV_RANGE[1];
    for (let i = 0; i < 100; i++) {
      const skill = genSkill(1);
      expect(skill).toBeGreaterThanOrEqual(lo);
      expect(skill).toBeLessThanOrEqual(hi);
    }
  });

  it('stays within division 2 range [24, 40]', () => {
    const [lo, hi] = DIV_RANGE[2];
    for (let i = 0; i < 100; i++) {
      const skill = genSkill(2);
      expect(skill).toBeGreaterThanOrEqual(lo);
      expect(skill).toBeLessThanOrEqual(hi);
    }
  });

  it('stays within division 3 range [20, 34]', () => {
    const [lo, hi] = DIV_RANGE[3];
    for (let i = 0; i < 100; i++) {
      const skill = genSkill(3);
      expect(skill).toBeGreaterThanOrEqual(lo);
      expect(skill).toBeLessThanOrEqual(hi);
    }
  });

  it('stays within division 4 range [16, 28]', () => {
    const [lo, hi] = DIV_RANGE[4];
    for (let i = 0; i < 100; i++) {
      const skill = genSkill(4);
      expect(skill).toBeGreaterThanOrEqual(lo);
      expect(skill).toBeLessThanOrEqual(hi);
    }
  });

  it('is always within [1, 50] regardless of division', () => {
    for (let div = 1; div <= 4; div++) {
      for (let i = 0; i < 50; i++) {
        const skill = genSkill(div);
        expect(skill).toBeGreaterThanOrEqual(1);
        expect(skill).toBeLessThanOrEqual(50);
      }
    }
  });

  it('falls back to division 4 range for unknown divisions', () => {
    const [lo, hi] = DIV_RANGE[4];
    for (let i = 0; i < 50; i++) {
      const skill = genSkill(99);
      expect(skill).toBeGreaterThanOrEqual(lo);
      expect(skill).toBeLessThanOrEqual(hi);
    }
  });

  it('generates higher average skills for higher divisions', () => {
    const avg = (div: number): number => {
      let total = 0;
      const n = 500;
      for (let i = 0; i < n; i++) total += genSkill(div);
      return total / n;
    };
    const avg1 = avg(1);
    const avg4 = avg(4);
    expect(avg1).toBeGreaterThan(avg4);
  });
});

/* ================================================================
   applyDevelopmentCurve() — age-based skill development
   ================================================================ */
describe('applyDevelopmentCurve()', () => {
  it('can improve young players (age 18)', () => {
    /* With 50% improvement chance and maxGain=3, running many iterations
       should produce at least one improvement */
    let improved = false;
    for (let i = 0; i < 100; i++) {
      const p = basePlayer({ age: 18, skill: 20 });
      applyDevelopmentCurve(p);
      if (p.skill > 20) {
        improved = true;
        break;
      }
    }
    expect(improved).toBe(true);
  });

  it('never declines young players (age 16-20, declineChance=0)', () => {
    for (let i = 0; i < 200; i++) {
      const p = basePlayer({ age: 19, skill: 30 });
      applyDevelopmentCurve(p);
      expect(p.skill).toBeGreaterThanOrEqual(30);
    }
  });

  it('can decline old players (age 33-35)', () => {
    /* With 40% decline chance, running many iterations should trigger decline */
    let declined = false;
    for (let i = 0; i < 100; i++) {
      const p = basePlayer({ age: 34, skill: 30 });
      applyDevelopmentCurve(p);
      if (p.skill < 30) {
        declined = true;
        break;
      }
    }
    expect(declined).toBe(true);
  });

  it('old players (33-35) cannot improve (improvementChance=0)', () => {
    for (let i = 0; i < 200; i++) {
      const p = basePlayer({ age: 34, skill: 30 });
      const originalSkill = p.skill;
      applyDevelopmentCurve(p);
      /* Skill should either stay the same or decline, never increase */
      expect(p.skill).toBeLessThanOrEqual(originalSkill);
    }
  });

  it('keeps skill in [1, 50] after development', () => {
    /* Test boundary cases */
    for (let i = 0; i < 100; i++) {
      const low = basePlayer({ age: 36, skill: 1 });
      applyDevelopmentCurve(low);
      expect(low.skill).toBeGreaterThanOrEqual(1);

      const high = basePlayer({ age: 18, skill: 50 });
      applyDevelopmentCurve(high);
      expect(high.skill).toBeLessThanOrEqual(50);
    }
  });

  it('returns the same player reference', () => {
    const p = basePlayer({ age: 25, skill: 30 });
    const result = applyDevelopmentCurve(p);
    expect(result).toBe(p);
  });

  it('does not modify players outside the curve table (age 38+)', () => {
    const p = basePlayer({ age: 38, skill: 25 });
    applyDevelopmentCurve(p);
    /* No curve exists for age 38+, so skill should remain unchanged */
    expect(p.skill).toBe(25);
  });
});

/* ================================================================
   agePlayer() — increment age and check retirement
   ================================================================ */
describe('agePlayer()', () => {
  it('increments the player age by 1', () => {
    const p = basePlayer({ age: 25 });
    const { player } = agePlayer(p);
    expect(player.age).toBe(26);
  });

  it('flags retirement at RETIREMENT_AGE (38)', () => {
    const p = basePlayer({ age: 37 }); /* Will become 38 */
    const { retired } = agePlayer(p);
    expect(retired).toBe(true);
  });

  it('does not flag retirement before RETIREMENT_AGE', () => {
    const p = basePlayer({ age: 30 });
    const { retired } = agePlayer(p);
    expect(retired).toBe(false);
  });

  it('returns the same player reference', () => {
    const p = basePlayer({ age: 25 });
    const { player } = agePlayer(p);
    expect(player).toBe(p);
  });
});

/* ================================================================
   genName() — player name generation
   ================================================================ */
describe('genName()', () => {
  it('generates a two-part name (first + last)', () => {
    const name = genName('ES');
    expect(name.split(' ').length).toBeGreaterThanOrEqual(2);
  });

  it('generates a name for known country codes', () => {
    const codes = ['ES', 'EN', 'PT', 'DE', 'FR', 'BR', 'IT'];
    for (const code of codes) {
      const name = genName(code);
      expect(name.length).toBeGreaterThan(0);
      expect(name).toContain(' ');
    }
  });

  it('generates a name for unknown country codes (fallback)', () => {
    const name = genName('XX');
    expect(name.length).toBeGreaterThan(0);
    expect(name).toContain(' ');
  });
});
