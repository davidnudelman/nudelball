import { describe, expect, it } from 'vitest';
import { derivePitchState, deriveTacticalFrame } from '../src/engine/match-animation';

describe('match animation pitch state', () => {
  it('starts balanced when score and event bias are neutral', () => {
    const state = derivePitchState(0, 0, 0, 0);
    expect(state.homePressure).toBe(50);
    expect(state.awayPressure).toBe(50);
    expect(state.zone).toBe('mid');
  });

  describe('match animation tactical frame', () => {
    it('creates complete tactical dots and ball trail', () => {
      const frame = deriveTacticalFrame(12, 'mid', 50, 0, []);
      expect(frame.homeDots.length).toBe(11);
      expect(frame.awayDots.length).toBe(11);
      expect(frame.trail.length).toBe(1);
      expect(frame.ball.x).toBeGreaterThanOrEqual(2);
      expect(frame.ball.x).toBeLessThanOrEqual(98);
    });

    it('pushes ball deeper into away half when home pressure is high', () => {
      const base = deriveTacticalFrame(20, 'mid', 50, 0, []);
      const attacking = deriveTacticalFrame(20, 'away', 78, 10, []);
      expect(attacking.ball.x).toBeGreaterThan(base.ball.x);
    });

    it('keeps only recent tactical trail points', () => {
      let trail: Array<{ x: number; y: number }> = [];
      for (let minute = 1; minute <= 18; minute++) {
        const frame = deriveTacticalFrame(minute, 'mid', 52, 0, trail);
        trail = frame.trail;
      }
      expect(trail.length).toBe(10);
    });
  });

  it('shifts toward away zone when home team controls momentum', () => {
    const state = derivePitchState(2, 0, 32, 12);
    expect(state.homePressure).toBeGreaterThan(state.awayPressure);
    expect(state.zone).toBe('away');
  });

  it('shifts toward home zone when away team controls momentum', () => {
    const state = derivePitchState(0, 1, 28, -18);
    expect(state.awayPressure).toBeGreaterThan(state.homePressure);
    expect(state.zone).toBe('home');
  });
});
