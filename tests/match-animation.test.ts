import { describe, expect, it } from 'vitest';
import { derivePitchState } from '../src/engine/match-animation';

describe('match animation pitch state', () => {
  it('starts balanced when score and event advantage are neutral', () => {
    const state = derivePitchState(0, 0, 0);
    expect(state.homePressure).toBe(50);
    expect(state.awayPressure).toBe(50);
    expect(state.zone).toBe('mid');
  });

  it('shifts toward away zone when home team controls momentum', () => {
    const state = derivePitchState(2, 0, 12);
    expect(state.homePressure).toBeGreaterThan(state.awayPressure);
    expect(state.zone).toBe('away');
  });

  it('shifts toward home zone when away team controls momentum', () => {
    const state = derivePitchState(0, 1, -18);
    expect(state.awayPressure).toBeGreaterThan(state.homePressure);
    expect(state.zone).toBe('home');
  });

  it('reflects only score and event advantage (no synthetic time drift)', () => {
    const first = derivePitchState(1, 0, 3);
    const second = derivePitchState(1, 0, 3);
    expect(first).toEqual(second);
  });
});
