/**
 * tests/match-sim.test.ts — Unit tests for the possession engine.
 *
 * Covers: lineup layout, calibration of goals to expected goals,
 * play/event consistency, pitch bounds, red-card handling and stats.
 */

import { describe, it, expect } from 'vitest';
import {
  buildLineup,
  buildMatchTimeline,
  computeStats,
  slotPoint,
  PITCH_LENGTH,
  PITCH_WIDTH,
  SHOT_CONVERSION,
} from '../src/engine/match-sim';
import type { SimTeamInput } from '../src/engine/match-sim';
import { makePlayer, genName } from '../src/engine/player';
import { emptyStats } from '../src/state/game-state';
import { DEFAULT_FORMATION_IDX, FORMATIONS } from '../src/config';
import type { Position, Team } from '../src/types';

/** Build a team with an auto-selected 4-4-2 of the given skill. */
const buildTeam = (id: number, skill: number, formationIdx = DEFAULT_FORMATION_IDX): Team => {
  const slots = FORMATIONS[formationIdx].slots;
  const players = [];
  for (const pos of ['GK', 'DEF', 'MID', 'STR'] as Position[]) {
    for (let i = 0; i < slots[pos] + 2; i++) {
      const p = makePlayer(genName('EN') + ' ' + pos + i, pos, skill, 26);
      p.selected = i < slots[pos];
      p.assignedPos = p.selected ? pos : null;
      players.push(p);
    }
  }
  return {
    id, name: `Team ${id}`, div: 1, c1: '#ff0000', c2: '#ffffff', country: 'EN',
    players, stats: emptyStats(), seasonStats: emptyStats(), trophies: [], aiFormation: formationIdx,
  };
};

const sideInput = (team: Team, expGoals: number, strength = 30): SimTeamInput =>
  ({ team, teamId: team.id, tactic: 'balanced', expGoals, strength });

describe('buildLineup()', () => {
  it('creates one slot per starter with positions inside the pitch', () => {
    const team = buildTeam(0, 30);
    const lineup = buildLineup(team);
    expect(lineup).toHaveLength(11);
    expect(lineup.filter(s => s.pos === 'GK')).toHaveLength(1);
    expect(lineup.filter(s => s.pos === 'DEF')).toHaveLength(4);
    for (const s of lineup) {
      expect(s.base.x).toBeGreaterThan(0);
      expect(s.base.x).toBeLessThan(PITCH_LENGTH);
      expect(s.base.y).toBeGreaterThan(0);
      expect(s.base.y).toBeLessThan(PITCH_WIDTH);
    }
    expect(lineup[0].number).toBe(1);
  });

  it('spreads a line evenly across the pitch and pushes wide players forward', () => {
    const lineup = buildLineup(buildTeam(0, 30));
    const defs = lineup.filter(s => s.pos === 'DEF');
    const ys = defs.map(d => d.base.y);
    expect(Math.min(...ys)).toBeLessThan(PITCH_WIDTH / 2);
    expect(Math.max(...ys)).toBeGreaterThan(PITCH_WIDTH / 2);
    expect(defs[0].base.x).toBeGreaterThan(defs[1].base.x);
  });
});

describe('slotPoint()', () => {
  it('mirrors the away team and keeps every point inside the pitch', () => {
    const lineup = buildLineup(buildTeam(0, 30));
    for (const ballX of [0, 20, 52.5, 90, 105]) {
      lineup.forEach((slot, i) => {
        const h = slotPoint(slot, true, ballX, 3, i);
        const a = slotPoint(slot, false, ballX, 3, i);
        for (const p of [h, a]) {
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.x).toBeLessThanOrEqual(PITCH_LENGTH);
          expect(p.y).toBeGreaterThanOrEqual(0);
          expect(p.y).toBeLessThanOrEqual(PITCH_WIDTH);
        }
      });
    }
    const gkHome = slotPoint(lineup[0], true, 52.5, 0, 0);
    const gkAway = slotPoint(lineup[0], false, 52.5, 0, 0);
    expect(gkHome.x).toBeLessThan(PITCH_LENGTH / 2);
    expect(gkAway.x).toBeGreaterThan(PITCH_LENGTH / 2);
  });

  it('drifts both teams towards the ball', () => {
    const lineup = buildLineup(buildTeam(0, 30));
    const mid = lineup.findIndex(s => s.pos === 'MID');
    const deep = slotPoint(lineup[mid], true, 15, 0, mid);
    const high = slotPoint(lineup[mid], true, 90, 0, mid);
    expect(high.x).toBeGreaterThan(deep.x);
  });
});

describe('buildMatchTimeline()', () => {
  it('produces goals that match the goal plays and keeps minutes unique and in range', () => {
    for (let i = 0; i < 40; i++) {
      const tl = buildMatchTimeline(sideInput(buildTeam(0, 30), 1.6), sideInput(buildTeam(1, 30), 1.1));
      const homeGoalPlays = tl.plays.filter(p => p.home && p.outcome === 'goal');
      const awayGoalPlays = tl.plays.filter(p => !p.home && p.outcome === 'goal');
      expect(homeGoalPlays).toHaveLength(tl.homeGoals);
      expect(awayGoalPlays).toHaveLength(tl.awayGoals);
      const minutes = tl.plays.map(p => p.minute);
      expect(new Set(minutes).size).toBe(minutes.length);
      for (const m of minutes) {
        expect(m).toBeGreaterThanOrEqual(1);
        expect(m).toBeLessThanOrEqual(90);
      }
      for (let k = 1; k < tl.plays.length; k++) {
        expect(tl.plays[k].minute).toBeGreaterThan(tl.plays[k - 1].minute);
      }
    }
  });

  it('gives every play a shooter or a turnover, with a shot line towards the right goal', () => {
    const tl = buildMatchTimeline(sideInput(buildTeam(0, 35), 2.0), sideInput(buildTeam(1, 25), 0.8));
    expect(tl.plays.length).toBeGreaterThan(20);
    for (const play of tl.plays) {
      expect(play.segments.length).toBeGreaterThan(0);
      const last = play.segments[play.segments.length - 1];
      if (play.shooterSlot != null) {
        expect(last.kind).toBe('shot');
        expect(['goal', 'saved', 'off', 'blocked']).toContain(play.outcome);
        expect(play.xg).toBeGreaterThan(0);
        /* Home shoots towards x = 105, away towards x = 0 */
        if (play.home) expect(last.to.x).toBeGreaterThan(last.from.x);
        else expect(last.to.x).toBeLessThan(last.from.x);
        if (play.outcome === 'goal') {
          expect(Math.abs(last.to.y - PITCH_WIDTH / 2)).toBeLessThan(3.7);
        }
      } else {
        expect(['intercepted', 'tackled']).toContain(play.outcome);
      }
      for (const seg of play.segments) {
        for (const p of [seg.from, seg.to]) {
          expect(p.x).toBeGreaterThanOrEqual(-3);
          expect(p.x).toBeLessThanOrEqual(PITCH_LENGTH + 3);
          expect(p.y).toBeGreaterThanOrEqual(0);
          expect(p.y).toBeLessThanOrEqual(PITCH_WIDTH);
        }
      }
    }
  });

  it('calibrates mean goals to the expected goals passed in', () => {
    const n = 400;
    let home = 0;
    let away = 0;
    const homeTeam = buildTeam(0, 30);
    const awayTeam = buildTeam(1, 30);
    for (let i = 0; i < n; i++) {
      const tl = buildMatchTimeline(sideInput(homeTeam, 1.8), sideInput(awayTeam, 0.9));
      home += tl.homeGoals;
      away += tl.awayGoals;
    }
    expect(home / n).toBeGreaterThan(1.45);
    expect(home / n).toBeLessThan(2.15);
    expect(away / n).toBeGreaterThan(0.65);
    expect(away / n).toBeLessThan(1.15);
  });

  it('draws roughly expGoals / SHOT_CONVERSION shots per side', () => {
    const n = 200;
    let shots = 0;
    for (let i = 0; i < n; i++) {
      const tl = buildMatchTimeline(sideInput(buildTeam(0, 30), 1.5), sideInput(buildTeam(1, 30), 1.5));
      shots += tl.plays.filter(p => p.home && p.shooterSlot != null).length;
    }
    const expected = 1.5 / SHOT_CONVERSION;
    expect(shots / n).toBeGreaterThan(expected * 0.8);
    expect(shots / n).toBeLessThan(expected * 1.2);
  });

  it('removes a sent-off player from later plays and schedules extra chances for the opponent', () => {
    const homeTeam = buildTeam(0, 30);
    const victim = buildLineup(homeTeam)[5];
    let extraFound = false;
    for (let i = 0; i < 30; i++) {
      const tl = buildMatchTimeline(
        sideInput(homeTeam, 1.2), sideInput(buildTeam(1, 30), 1.2),
        [{ teamId: 0, minute: 20, type: 'red', playerName: victim.name }],
      );
      expect(tl.sentOff).toEqual([{ teamId: 0, slot: 5, minute: 20 }]);
      for (const play of tl.plays) {
        if (!play.home || play.minute <= 20) continue;
        for (const seg of play.segments) {
          expect(seg.fromSlot).not.toBe(5);
          expect(seg.toSlot).not.toBe(5);
        }
      }
      if (tl.plays.filter(p => !p.home && p.shooterSlot != null && p.minute > 20).length > 0) extraFound = true;
    }
    expect(extraFound).toBe(true);
  });

  it('handles a team with no starters without throwing', () => {
    const empty = buildTeam(1, 30);
    empty.players.forEach(p => { p.selected = false; });
    const tl = buildMatchTimeline(sideInput(buildTeam(0, 30), 1.5), sideInput(empty, 1.5));
    expect(tl.awayGoals).toBe(0);
    expect(tl.plays.every(p => p.home)).toBe(true);
  });
});

describe('computeStats()', () => {
  it('counts shots, on-target and possession up to a minute', () => {
    const tl = buildMatchTimeline(sideInput(buildTeam(0, 30), 1.5), sideInput(buildTeam(1, 30), 1.5));
    const full = computeStats(tl, 90);
    expect(full.homeShots).toBe(tl.plays.filter(p => p.home && p.shooterSlot != null).length);
    expect(full.homeOnTarget).toBeLessThanOrEqual(full.homeShots);
    expect(full.homeOnTarget).toBeGreaterThanOrEqual(tl.homeGoals);
    expect(full.homePossession + full.awayPossession).toBe(100);
    const early = computeStats(tl, 0);
    expect(early.homeShots + early.awayShots).toBe(0);
    expect(early.homePossession).toBe(50);
  });
});
