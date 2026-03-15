/**
 * tests/helpers.test.ts — Unit tests for src/utils/helpers.ts
 *
 * Covers: rand, clamp, pick, shuffle, hexToRgb, rgbToHex,
 *         srgbLum, cRatio, plateColors, clearPlateCache
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  rand,
  clamp,
  pick,
  shuffle,
  hexToRgb,
  rgbToHex,
  srgbLum,
  cRatio,
  plateColors,
  clearPlateCache,
  lightenRgb,
  darkenRgb,
} from '../src/utils/helpers';

/* ================================================================
   rand() — random integer in [a, b] inclusive
   ================================================================ */
describe('rand()', () => {
  it('returns a value within the given range', () => {
    for (let i = 0; i < 200; i++) {
      const v = rand(5, 15);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(15);
    }
  });

  it('returns an integer', () => {
    for (let i = 0; i < 50; i++) {
      const v = rand(1, 100);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('handles a single-value range (a === b)', () => {
    for (let i = 0; i < 20; i++) {
      expect(rand(7, 7)).toBe(7);
    }
  });

  it('handles zero-based ranges', () => {
    for (let i = 0; i < 50; i++) {
      const v = rand(0, 3);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(3);
    }
  });
});

/* ================================================================
   clamp() — clamp and round to [lo, hi]
   ================================================================ */
describe('clamp()', () => {
  it('returns the value when within range', () => {
    expect(clamp(5, 1, 10)).toBe(5);
  });

  it('clamps below the minimum', () => {
    expect(clamp(-5, 0, 100)).toBe(0);
  });

  it('clamps above the maximum', () => {
    expect(clamp(150, 0, 100)).toBe(100);
  });

  it('rounds the value to the nearest integer', () => {
    expect(clamp(5.7, 1, 10)).toBe(6);
    expect(clamp(5.3, 1, 10)).toBe(5);
  });

  it('rounds and then clamps (rounding could push above max)', () => {
    /* 9.6 rounds to 10, which is within [1, 10] */
    expect(clamp(9.6, 1, 10)).toBe(10);
  });

  it('handles equal lo and hi', () => {
    expect(clamp(50, 10, 10)).toBe(10);
    expect(clamp(5, 10, 10)).toBe(10);
  });
});

/* ================================================================
   pick() — random element from array
   ================================================================ */
describe('pick()', () => {
  it('returns an element that exists in the source array', () => {
    const arr = ['a', 'b', 'c', 'd', 'e'];
    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(pick(arr));
    }
  });

  it('returns the only element when array has length 1', () => {
    expect(pick([42])).toBe(42);
  });

  it('works with typed arrays (readonly)', () => {
    const positions = ['GK', 'DEF', 'MID', 'STR'] as const;
    const result = pick(positions);
    expect(positions).toContain(result);
  });
});

/* ================================================================
   shuffle() — Fisher-Yates shuffle
   ================================================================ */
describe('shuffle()', () => {
  it('returns a new array (does not mutate the original)', () => {
    const original = [1, 2, 3, 4, 5];
    const copy = [...original];
    shuffle(original);
    expect(original).toEqual(copy);
  });

  it('returns an array with the same elements', () => {
    const arr = [10, 20, 30, 40, 50];
    const result = shuffle(arr);
    expect(result.sort((a, b) => a - b)).toEqual(arr.sort((a, b) => a - b));
  });

  it('returns an array of the same length', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(shuffle(arr)).toHaveLength(arr.length);
  });

  it('handles an empty array', () => {
    expect(shuffle([])).toEqual([]);
  });

  it('handles a single-element array', () => {
    expect(shuffle([99])).toEqual([99]);
  });

  it('eventually produces a different order (statistical)', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let diffFound = false;
    /* Run enough shuffles that at least one should differ from the original */
    for (let i = 0; i < 50; i++) {
      const s = shuffle(arr);
      if (s.some((v, idx) => v !== arr[idx])) {
        diffFound = true;
        break;
      }
    }
    expect(diffFound).toBe(true);
  });
});

/* ================================================================
   hexToRgb() — hex colour string to RGB tuple
   ================================================================ */
describe('hexToRgb()', () => {
  it('parses a 6-character hex with #', () => {
    expect(hexToRgb('#ff6b35')).toEqual([255, 107, 53]);
  });

  it('parses a 6-character hex without #', () => {
    expect(hexToRgb('ff6b35')).toEqual([255, 107, 53]);
  });

  it('parses a 3-character shorthand hex', () => {
    /* #abc => #aabbcc => [170, 187, 204] */
    expect(hexToRgb('#abc')).toEqual([170, 187, 204]);
  });

  it('parses black (#000000)', () => {
    expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
  });

  it('parses white (#ffffff)', () => {
    expect(hexToRgb('#ffffff')).toEqual([255, 255, 255]);
  });

  it('parses a standard red (#ff0000)', () => {
    expect(hexToRgb('#ff0000')).toEqual([255, 0, 0]);
  });

  it('is case-insensitive', () => {
    expect(hexToRgb('#FF6B35')).toEqual([255, 107, 53]);
  });
});

/* ================================================================
   rgbToHex() — RGB values to hex string
   ================================================================ */
describe('rgbToHex()', () => {
  it('converts RGB to hex with leading #', () => {
    expect(rgbToHex(255, 107, 53)).toBe('#ff6b35');
  });

  it('converts black (0, 0, 0)', () => {
    expect(rgbToHex(0, 0, 0)).toBe('#000000');
  });

  it('converts white (255, 255, 255)', () => {
    expect(rgbToHex(255, 255, 255)).toBe('#ffffff');
  });

  it('clamps values above 255', () => {
    expect(rgbToHex(300, 0, 0)).toBe('#ff0000');
  });

  it('clamps values below 0', () => {
    expect(rgbToHex(-10, 0, 0)).toBe('#000000');
  });
});

/* ================================================================
   srgbLum() — relative luminance calculation
   ================================================================ */
describe('srgbLum()', () => {
  it('returns 0 for black', () => {
    expect(srgbLum(0, 0, 0)).toBeCloseTo(0, 5);
  });

  it('returns 1 for white', () => {
    expect(srgbLum(255, 255, 255)).toBeCloseTo(1, 2);
  });

  it('returns a value between 0 and 1 for any colour', () => {
    const lum = srgbLum(128, 64, 200);
    expect(lum).toBeGreaterThanOrEqual(0);
    expect(lum).toBeLessThanOrEqual(1);
  });
});

/* ================================================================
   cRatio() — WCAG contrast ratio
   ================================================================ */
describe('cRatio()', () => {
  it('returns 21:1 for black vs white', () => {
    const l1 = srgbLum(0, 0, 0);
    const l2 = srgbLum(255, 255, 255);
    expect(cRatio(l1, l2)).toBeCloseTo(21, 0);
  });

  it('returns 1:1 for identical luminances', () => {
    const lum = srgbLum(128, 128, 128);
    expect(cRatio(lum, lum)).toBeCloseTo(1, 2);
  });

  it('is commutative (order does not matter)', () => {
    const l1 = srgbLum(200, 100, 50);
    const l2 = srgbLum(50, 100, 200);
    expect(cRatio(l1, l2)).toBeCloseTo(cRatio(l2, l1), 5);
  });
});

/* ================================================================
   lightenRgb() / darkenRgb()
   ================================================================ */
describe('lightenRgb()', () => {
  it('returns pure white when amount is 1', () => {
    expect(lightenRgb([100, 100, 100], 1)).toEqual([255, 255, 255]);
  });

  it('returns the same colour when amount is 0', () => {
    expect(lightenRgb([100, 150, 200], 0)).toEqual([100, 150, 200]);
  });
});

describe('darkenRgb()', () => {
  it('returns pure black when amount is 1', () => {
    expect(darkenRgb([100, 200, 50], 1)).toEqual([0, 0, 0]);
  });

  it('returns the same colour when amount is 0', () => {
    expect(darkenRgb([100, 150, 200], 0)).toEqual([100, 150, 200]);
  });
});

/* ================================================================
   plateColors() — WCAG-aware team plate colours
   ================================================================ */
describe('plateColors()', () => {
  beforeEach(() => {
    clearPlateCache();
  });

  it('returns an object with bg and txt properties', () => {
    const result = plateColors('#ad1519', '#fcdd09');
    expect(result).toHaveProperty('bg');
    expect(result).toHaveProperty('txt');
  });

  it('returns valid hex colour strings', () => {
    const result = plateColors('#ad1519', '#fcdd09');
    expect(result.bg).toMatch(/^#[0-9a-f]{6}$/);
    expect(result.txt).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('uses the darker colour as background', () => {
    const result = plateColors('#000000', '#ffffff');
    /* Black (luminance 0) should be bg, white should be txt */
    const bgLum = srgbLum(...hexToRgb(result.bg));
    const txtLum = srgbLum(...hexToRgb(result.txt));
    expect(bgLum).toBeLessThanOrEqual(txtLum);
  });

  it('produces sufficient contrast ratio (>= 4.2)', () => {
    const testPairs: [string, string][] = [
      ['#ad1519', '#fcdd09'], /* Spain colours */
      ['#006600', '#ff0000'], /* Portugal colours */
      ['#000000', '#ffcc00'], /* Germany colours */
      ['#ffffff', '#cd2e3a'], /* South Korea colours */
      ['#005bbb', '#ffd500'], /* Ukraine colours */
    ];

    for (const [c1, c2] of testPairs) {
      const { bg, txt } = plateColors(c1, c2);
      const bgLum = srgbLum(...hexToRgb(bg));
      const txtLum = srgbLum(...hexToRgb(txt));
      const ratio = cRatio(bgLum, txtLum);
      expect(ratio).toBeGreaterThanOrEqual(4.2);
    }
  });

  it('caches results for repeated calls', () => {
    const first = plateColors('#ad1519', '#fcdd09');
    const second = plateColors('#ad1519', '#fcdd09');
    /* Should be the exact same object reference (from cache) */
    expect(first).toBe(second);
  });

  it('clearPlateCache() causes fresh computation', () => {
    const first = plateColors('#ad1519', '#fcdd09');
    clearPlateCache();
    const second = plateColors('#ad1519', '#fcdd09');
    /* Same values but NOT the same reference (cache was cleared) */
    expect(second).not.toBe(first);
    expect(second.bg).toBe(first.bg);
    expect(second.txt).toBe(first.txt);
  });
});
