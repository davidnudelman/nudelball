/**
 * tests/config.test.ts — Sanity tests for src/config.ts
 *
 * Validates that game constants are correctly defined and internally consistent.
 * These tests catch accidental edits to game balance constants.
 */

import { describe, it, expect } from 'vitest';
import {
  FORMATIONS,
  TACTICS,
  DIV_RANGE,
  DIFFICULTY_SETTINGS,
  TEAMS_DATA,
  TEAMS_PER_DIV,
  SEASON_WEEKS,
  TOTAL_SEASON_WEEKS,
  POS_ORDER,
  SQUAD_COMP,
  CUP_ROUNDS,
  CUP_WEEKS,
  TRAINING_FOCUSES,
  DEFAULT_FORMATION_IDX,
  STARTING_BUDGET,
  FREE_AGENTS_PER_SEASON,
  FREE_AGENT_SKILL_RANGE,
  SQUAD_MIN,
  SQUAD_MAX,
  DEVELOPMENT_CURVE_TABLE,
  RETIREMENT_AGE,
  WAITING_TEAMS_DATA,
  COUNTRY_NAMES,
  GENERIC_FIRST,
  GENERIC_LAST,
  FORM_MAX,
  FORM_MIN,
  FORM_OVR_PCT,
  OOP_PENALTY_PER_STEP,
} from '../src/config';

/* ================================================================
   FORMATIONS
   ================================================================ */
describe('FORMATIONS', () => {
  it('has 8 formations', () => {
    expect(FORMATIONS).toHaveLength(8);
  });

  it('each formation has a label and slots', () => {
    for (const f of FORMATIONS) {
      expect(f.label).toBeDefined();
      expect(f.label.length).toBeGreaterThan(0);
      expect(f.slots).toBeDefined();
      expect(f.slots).toHaveProperty('GK');
      expect(f.slots).toHaveProperty('DEF');
      expect(f.slots).toHaveProperty('MID');
      expect(f.slots).toHaveProperty('STR');
    }
  });

  it('each formation totals 11 players', () => {
    for (const f of FORMATIONS) {
      const total = f.slots.GK + f.slots.DEF + f.slots.MID + f.slots.STR;
      expect(total).toBe(11);
    }
  });

  it('every formation has exactly 1 GK', () => {
    for (const f of FORMATIONS) {
      expect(f.slots.GK).toBe(1);
    }
  });

  it('every formation has >= 3 DEF and >= 3 MID', () => {
    for (const f of FORMATIONS) {
      expect(f.slots.DEF).toBeGreaterThanOrEqual(3);
      expect(f.slots.MID).toBeGreaterThanOrEqual(3);
    }
  });

  it('every formation has >= 1 STR', () => {
    for (const f of FORMATIONS) {
      expect(f.slots.STR).toBeGreaterThanOrEqual(1);
    }
  });

  it('DEFAULT_FORMATION_IDX points to 4-4-2', () => {
    expect(FORMATIONS[DEFAULT_FORMATION_IDX].label).toBe('4-4-2');
  });
});

/* ================================================================
   TACTICS
   ================================================================ */
describe('TACTICS', () => {
  it('has the expected keys: attack, balanced, defensive, counter', () => {
    expect(TACTICS).toHaveProperty('attack');
    expect(TACTICS).toHaveProperty('balanced');
    expect(TACTICS).toHaveProperty('defensive');
    expect(TACTICS).toHaveProperty('counter');
  });

  it('has exactly 4 tactics', () => {
    expect(Object.keys(TACTICS)).toHaveLength(4);
  });

  it('each tactic has required properties', () => {
    for (const [key, tac] of Object.entries(TACTICS)) {
      expect(tac).toHaveProperty('homeBonus');
      expect(tac).toHaveProperty('awayBonus');
      expect(tac).toHaveProperty('defPenalty');
      expect(tac).toHaveProperty('label');
      expect(tac).toHaveProperty('icon');
      expect(tac.homeBonus).toBeGreaterThan(0);
      expect(tac.awayBonus).toBeGreaterThan(0);
      expect(tac.defPenalty).toBeGreaterThan(0);
    }
  });

  it('balanced tactic has neutral values', () => {
    expect(TACTICS.balanced.homeBonus).toBe(1.15);
    expect(TACTICS.balanced.awayBonus).toBe(1.00);
    expect(TACTICS.balanced.defPenalty).toBe(1.00);
  });

  it('attack tactic has higher offensive bonuses than balanced', () => {
    expect(TACTICS.attack.homeBonus).toBeGreaterThan(TACTICS.balanced.homeBonus);
    expect(TACTICS.attack.awayBonus).toBeGreaterThan(TACTICS.balanced.awayBonus);
  });

  it('defensive tactic has lower offensive bonuses than balanced', () => {
    expect(TACTICS.defensive.homeBonus).toBeLessThan(TACTICS.balanced.homeBonus);
    expect(TACTICS.defensive.awayBonus).toBeLessThan(TACTICS.balanced.awayBonus);
  });
});

/* ================================================================
   DIV_RANGE
   ================================================================ */
describe('DIV_RANGE', () => {
  it('covers divisions 1-4', () => {
    expect(DIV_RANGE).toHaveProperty('1');
    expect(DIV_RANGE).toHaveProperty('2');
    expect(DIV_RANGE).toHaveProperty('3');
    expect(DIV_RANGE).toHaveProperty('4');
  });

  it('has exactly 4 divisions', () => {
    expect(Object.keys(DIV_RANGE)).toHaveLength(4);
  });

  it('each division has a [min, max] range', () => {
    for (let d = 1; d <= 4; d++) {
      const [lo, hi] = DIV_RANGE[d];
      expect(lo).toBeLessThan(hi);
      expect(lo).toBeGreaterThanOrEqual(1);
      expect(hi).toBeLessThanOrEqual(50);
    }
  });

  it('higher divisions have higher skill ranges', () => {
    const [lo1, hi1] = DIV_RANGE[1];
    const [lo4, hi4] = DIV_RANGE[4];
    expect(lo1).toBeGreaterThan(lo4);
    expect(hi1).toBeGreaterThan(hi4);
  });

  it('division ranges overlap to allow competition', () => {
    /* Division 1 bottom should overlap with Division 2 top */
    expect(DIV_RANGE[1][0]).toBeLessThanOrEqual(DIV_RANGE[2][1]);
    expect(DIV_RANGE[2][0]).toBeLessThanOrEqual(DIV_RANGE[3][1]);
    expect(DIV_RANGE[3][0]).toBeLessThanOrEqual(DIV_RANGE[4][1]);
  });
});

/* ================================================================
   DIFFICULTY_SETTINGS
   ================================================================ */
describe('DIFFICULTY_SETTINGS', () => {
  it('has easy, normal, and hard', () => {
    expect(DIFFICULTY_SETTINGS).toHaveProperty('easy');
    expect(DIFFICULTY_SETTINGS).toHaveProperty('normal');
    expect(DIFFICULTY_SETTINGS).toHaveProperty('hard');
  });

  it('has exactly 3 difficulty levels', () => {
    expect(Object.keys(DIFFICULTY_SETTINGS)).toHaveLength(3);
  });

  it('each difficulty has aiStrengthMult, budgetMult, trainingMult', () => {
    for (const [_, settings] of Object.entries(DIFFICULTY_SETTINGS)) {
      expect(settings).toHaveProperty('aiStrengthMult');
      expect(settings).toHaveProperty('budgetMult');
      expect(settings).toHaveProperty('trainingMult');
    }
  });

  it('normal difficulty has all multipliers at 1.0', () => {
    expect(DIFFICULTY_SETTINGS.normal.aiStrengthMult).toBe(1.0);
    expect(DIFFICULTY_SETTINGS.normal.budgetMult).toBe(1.0);
    expect(DIFFICULTY_SETTINGS.normal.trainingMult).toBe(1.0);
  });

  it('easy gives weaker AI, more budget, better training', () => {
    expect(DIFFICULTY_SETTINGS.easy.aiStrengthMult).toBeLessThan(1.0);
    expect(DIFFICULTY_SETTINGS.easy.budgetMult).toBeGreaterThan(1.0);
    expect(DIFFICULTY_SETTINGS.easy.trainingMult).toBeGreaterThan(1.0);
  });

  it('hard gives stronger AI, less budget, worse training', () => {
    expect(DIFFICULTY_SETTINGS.hard.aiStrengthMult).toBeGreaterThan(1.0);
    expect(DIFFICULTY_SETTINGS.hard.budgetMult).toBeLessThan(1.0);
    expect(DIFFICULTY_SETTINGS.hard.trainingMult).toBeLessThan(1.0);
  });
});

/* ================================================================
   TEAMS_DATA
   ================================================================ */
describe('TEAMS_DATA', () => {
  it('has 32 teams', () => {
    expect(TEAMS_DATA).toHaveLength(32);
  });

  it('has 8 teams per division', () => {
    for (let d = 1; d <= 4; d++) {
      const count = TEAMS_DATA.filter(t => t.div === d).length;
      expect(count).toBe(TEAMS_PER_DIV);
    }
  });

  it('each team has name, div, c1, c2, country', () => {
    for (const t of TEAMS_DATA) {
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.div).toBeGreaterThanOrEqual(1);
      expect(t.div).toBeLessThanOrEqual(4);
      expect(t.c1).toMatch(/^#/);
      expect(t.c2).toMatch(/^#/);
      expect(t.country.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('all team names are unique', () => {
    const names = TEAMS_DATA.map(t => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

/* ================================================================
   SQUAD_COMP
   ================================================================ */
describe('SQUAD_COMP', () => {
  it('has all 4 positions', () => {
    expect(SQUAD_COMP).toHaveProperty('GK');
    expect(SQUAD_COMP).toHaveProperty('DEF');
    expect(SQUAD_COMP).toHaveProperty('MID');
    expect(SQUAD_COMP).toHaveProperty('STR');
  });

  it('totals 22 players', () => {
    const total = SQUAD_COMP.GK + SQUAD_COMP.DEF + SQUAD_COMP.MID + SQUAD_COMP.STR;
    expect(total).toBe(22);
  });

  it('has 2 GKs', () => {
    expect(SQUAD_COMP.GK).toBe(2);
  });
});

/* ================================================================
   SEASON & CALENDAR
   ================================================================ */
describe('Season & Calendar constants', () => {
  it('SEASON_WEEKS = 14 (for 8 teams)', () => {
    expect(SEASON_WEEKS).toBe(14);
  });

  it('TOTAL_SEASON_WEEKS >= SEASON_WEEKS', () => {
    expect(TOTAL_SEASON_WEEKS).toBeGreaterThanOrEqual(SEASON_WEEKS);
  });

  it('CUP_ROUNDS has 5 entries', () => {
    expect(CUP_ROUNDS).toHaveLength(5);
  });

  it('CUP_WEEKS has 5 entries matching CUP_ROUNDS', () => {
    expect(CUP_WEEKS).toHaveLength(CUP_ROUNDS.length);
  });

  it('CUP_WEEKS are in ascending order', () => {
    for (let i = 1; i < CUP_WEEKS.length; i++) {
      expect(CUP_WEEKS[i]).toBeGreaterThan(CUP_WEEKS[i - 1]);
    }
  });
});

/* ================================================================
   POSITIONS
   ================================================================ */
describe('POS_ORDER', () => {
  it('has 4 positions: GK, DEF, MID, STR', () => {
    expect(POS_ORDER).toEqual(['GK', 'DEF', 'MID', 'STR']);
  });
});

/* ================================================================
   TRAINING
   ================================================================ */
describe('TRAINING_FOCUSES', () => {
  it('has 3 options', () => {
    expect(TRAINING_FOCUSES).toHaveLength(3);
  });

  it('includes balanced, fitness, development', () => {
    expect(TRAINING_FOCUSES).toContain('balanced');
    expect(TRAINING_FOCUSES).toContain('fitness');
    expect(TRAINING_FOCUSES).toContain('development');
  });
});

/* ================================================================
   TRANSFER MARKET CONSTANTS
   ================================================================ */
describe('Transfer market constants', () => {
  it('STARTING_BUDGET is 10000', () => {
    expect(STARTING_BUDGET).toBe(10000);
  });

  it('FREE_AGENTS_PER_SEASON is 16', () => {
    expect(FREE_AGENTS_PER_SEASON).toBe(16);
  });

  it('FREE_AGENT_SKILL_RANGE is [10, 35]', () => {
    expect(FREE_AGENT_SKILL_RANGE).toEqual([10, 35]);
  });

  it('SQUAD_MIN < SQUAD_MAX', () => {
    expect(SQUAD_MIN).toBeLessThan(SQUAD_MAX);
  });

  it('SQUAD_MIN is 19', () => {
    expect(SQUAD_MIN).toBe(19);
  });

  it('SQUAD_MAX is 25', () => {
    expect(SQUAD_MAX).toBe(25);
  });
});

/* ================================================================
   DEVELOPMENT CURVES
   ================================================================ */
describe('DEVELOPMENT_CURVE_TABLE', () => {
  it('covers ages 16-37 without gaps', () => {
    const coveredAges = new Set<number>();
    for (const curve of DEVELOPMENT_CURVE_TABLE) {
      for (let age = curve.minAge; age <= curve.maxAge; age++) {
        coveredAges.add(age);
      }
    }
    for (let age = 16; age <= 37; age++) {
      expect(coveredAges.has(age)).toBe(true);
    }
  });

  it('each entry has valid probability values (0-1)', () => {
    for (const curve of DEVELOPMENT_CURVE_TABLE) {
      expect(curve.improvementChance).toBeGreaterThanOrEqual(0);
      expect(curve.improvementChance).toBeLessThanOrEqual(1);
      expect(curve.declineChance).toBeGreaterThanOrEqual(0);
      expect(curve.declineChance).toBeLessThanOrEqual(1);
    }
  });

  it('young players have higher improvement chance than old', () => {
    const youngest = DEVELOPMENT_CURVE_TABLE[0]; /* 16-20 */
    const oldest = DEVELOPMENT_CURVE_TABLE[DEVELOPMENT_CURVE_TABLE.length - 1]; /* 36-37 */
    expect(youngest.improvementChance).toBeGreaterThan(oldest.improvementChance);
  });

  it('old players have higher decline chance than young', () => {
    const youngest = DEVELOPMENT_CURVE_TABLE[0]; /* 16-20 */
    const oldest = DEVELOPMENT_CURVE_TABLE[DEVELOPMENT_CURVE_TABLE.length - 1]; /* 36-37 */
    expect(oldest.declineChance).toBeGreaterThan(youngest.declineChance);
  });

  it('RETIREMENT_AGE is 38', () => {
    expect(RETIREMENT_AGE).toBe(38);
  });
});

/* ================================================================
   FORM CONSTANTS
   ================================================================ */
describe('Form constants', () => {
  it('FORM_MAX is 3 and FORM_MIN is -3', () => {
    expect(FORM_MAX).toBe(3);
    expect(FORM_MIN).toBe(-3);
  });

  it('FORM_OVR_PCT is 0.05 (5%)', () => {
    expect(FORM_OVR_PCT).toBe(0.05);
  });

  it('OOP_PENALTY_PER_STEP is 0.15 (15%)', () => {
    expect(OOP_PENALTY_PER_STEP).toBe(0.15);
  });
});

/* ================================================================
   WAITING_TEAMS_DATA
   ================================================================ */
describe('WAITING_TEAMS_DATA', () => {
  it('has 4 waiting teams', () => {
    expect(WAITING_TEAMS_DATA).toHaveLength(4);
  });

  it('each waiting team has name, c1, c2, country', () => {
    for (const t of WAITING_TEAMS_DATA) {
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.c1).toMatch(/^#/);
      expect(t.c2).toMatch(/^#/);
      expect(t.country.length).toBeGreaterThanOrEqual(2);
    }
  });
});

/* ================================================================
   COUNTRY_NAMES
   ================================================================ */
describe('COUNTRY_NAMES', () => {
  it('has at least 20 country pools', () => {
    expect(Object.keys(COUNTRY_NAMES).length).toBeGreaterThanOrEqual(20);
  });

  it('each pool has first and last name arrays with >= 10 entries', () => {
    for (const [code, pool] of Object.entries(COUNTRY_NAMES)) {
      expect(pool.first.length).toBeGreaterThanOrEqual(10);
      expect(pool.last.length).toBeGreaterThanOrEqual(10);
    }
  });

  it('GENERIC_FIRST and GENERIC_LAST are non-empty fallbacks', () => {
    expect(GENERIC_FIRST.length).toBeGreaterThan(0);
    expect(GENERIC_LAST.length).toBeGreaterThan(0);
  });
});
