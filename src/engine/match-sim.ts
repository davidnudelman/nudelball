/**
 * match-sim.ts — Possession-based match timeline generator.
 *
 * Instead of rolling a Poisson number of goals and inventing scorers after
 * the fact, a match is generated as a sequence of *plays*. Each play is a
 * chain of passes (and the odd dribble) that ends either in a shot or in a
 * turnover. Goals, scorers and assists fall out of those shots, so what the
 * pitch view draws is exactly what produced the scoreline.
 *
 * Balance is preserved by calibration: the caller passes the expected goals
 * each side earned from the tactical model (`match.ts`), and shot volume
 * and conversion are tuned so that the *mean* goals per team equals that
 * number. Shot quality still varies with distance, angle and the shooter
 * vs keeper matchup, so individual chances look and feel different.
 *
 * All coordinates are in metres on a 105 x 68 pitch. The home team always
 * attacks left-to-right (towards x = 105); the away team attacks towards
 * x = 0. Lineup base positions are stored in "own orientation" and mirrored
 * for the away side via `slotPoint()`.
 */

import type {
  LineupSlot,
  MatchPlay,
  MatchTimeline,
  PitchPoint,
  PlayOutcome,
  PlaySegment,
  Position,
  SentOff,
  TacticId,
  Team,
} from '../types';
import { GOAL_POS_WEIGHT, LATE_GOAL_BIAS, POS_ORDER } from '../config';
import { playerOvr } from './player';

/* ================================================================
   PITCH GEOMETRY
   ================================================================ */

/** Pitch length in metres (goal line to goal line). */
export const PITCH_LENGTH = 105;
/** Pitch width in metres (touchline to touchline). */
export const PITCH_WIDTH = 68;
/** Goal mouth width in metres. */
export const GOAL_WIDTH = 7.32;

/** Centre of the goal on the y axis. */
const GOAL_Y = PITCH_WIDTH / 2;

/** Base x (distance from own goal) for each line of the formation. */
const LINE_X: Readonly<Record<Position, number>> = { GK: 5, DEF: 20, MID: 40, STR: 60 };
/** How wide each line spreads across the pitch. */
const LINE_WIDTH: Readonly<Record<Position, number>> = { GK: 0, DEF: 44, MID: 48, STR: 32 };
/** How strongly each line drifts with the ball (0 = pinned, 1 = follows the ball). */
const LINE_DRIFT: Readonly<Record<Position, number>> = { GK: 0.06, DEF: 0.2, MID: 0.26, STR: 0.3 };

/* ================================================================
   TUNING
   ================================================================ */

/** Mean fraction of shots that become goals. Shot volume is derived from this. */
export const SHOT_CONVERSION = 0.115;
/** Hard cap on goals per team (matches the legacy Poisson cap). */
const MAX_GOALS = 8;
/** Hard cap on shots per team so a freak match stays watchable. */
const MAX_SHOTS = 24;
/** Fraction of match minutes that contain a play. */
const PLAY_DENSITY = 0.64;
/** Expected goals the opponent gains over a full match from a red card. */
const RED_CARD_EXTRA_XG = 0.4;
/** Upper bound on any single shot's goal probability. */
const MAX_SHOT_PROBABILITY = 0.8;

/** Possession-share nudges by tactic (added to the home side, subtracted for away). */
const TACTIC_POSSESSION: Readonly<Record<TacticId, number>> = {
  attack: 0.03,
  balanced: 0,
  counter: -0.03,
  defensive: -0.05,
};

/** Pass-chain length ranges by tactic: [min, max]. */
const CHAIN_LENGTH: Readonly<Record<TacticId, readonly [number, number]>> = {
  attack: [2, 7],
  balanced: [2, 6],
  counter: [1, 4],
  defensive: [1, 4],
};

/* ================================================================
   INPUT TYPES
   ================================================================ */

/** Everything the engine needs to know about one side. */
export interface SimTeamInput {
  team: Team;
  teamId: number;
  tactic: TacticId;
  /** Expected goals from the tactical model — the calibration target */
  expGoals: number;
  /** Overall strength, used only for possession share */
  strength: number;
}

/** A card already decided by the card model, so the engine can react to it. */
export interface SimCardInput {
  teamId: number;
  minute: number;
  type: 'yellow' | 'red';
  playerName: string;
}

/* ================================================================
   SMALL HELPERS
   ================================================================ */

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const rnd = (a: number, b: number): number => a + Math.random() * (b - a);
const dist = (a: PitchPoint, b: PitchPoint): number => Math.hypot(a.x - b.x, a.y - b.y);

/** Sample a Poisson-distributed integer with the given mean. */
const poisson = (lambda: number): number => {
  if (lambda <= 0) return 0;
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > limit);
  return k - 1;
};

/** Fisher-Yates shuffle (returns a new array). */
const shuffled = <T>(arr: readonly T[]): T[] => {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/* ================================================================
   LINEUPS & LAYOUT
   ================================================================ */

/**
 * Build the on-pitch lineup for a team from its selected starters.
 *
 * Players are grouped by their assigned position and spread evenly across
 * their line. Wide players sit a few metres further forward than central
 * ones so a back four reads as full-backs and centre-backs.
 */
export const buildLineup = (team: Team): LineupSlot[] => {
  const starters = team.players.filter(p => p.selected);
  const slots: LineupSlot[] = [];
  let shirt = 2;

  for (const pos of POS_ORDER) {
    const group = starters.filter(p => (p.assignedPos || p.pos) === pos);
    const n = group.length;
    group.forEach((p, i) => {
      /* rel runs from -1 (one touchline) to +1 (the other); 0 for a lone player */
      const rel = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
      const y = GOAL_Y + rel * (LINE_WIDTH[pos] / 2);
      const x = LINE_X[pos] + Math.abs(rel) * 3;
      slots.push({
        name: p.name,
        pos,
        number: pos === 'GK' ? 1 : shirt++,
        rating: playerOvr(p),
        base: { x, y },
      });
    });
  }
  return slots;
};

/**
 * Absolute pitch position of a lineup slot for a given ball position.
 *
 * The whole game drifts towards the ball: when the home side has the ball
 * deep in the away half, both teams shift right. Lines drift by different
 * amounts (keepers barely move, strikers follow the play). A small
 * seed-based wobble keeps the dots from looking like a diagram.
 *
 * @param slot   - The lineup slot
 * @param home   - Whether the slot belongs to the home team (attacks right)
 * @param ballX  - Absolute x of the ball
 * @param seed   - Per-play random seed for the wobble
 * @param idx    - Slot index (de-correlates the wobble between players)
 */
export const slotPoint = (
  slot: LineupSlot,
  home: boolean,
  ballX: number,
  seed: number,
  idx: number,
): PitchPoint => {
  const drift = (ballX - PITCH_LENGTH / 2) * LINE_DRIFT[slot.pos];
  const wobbleX = Math.sin(seed + idx * 1.7) * 1.2;
  const wobbleY = Math.cos(seed * 0.7 + idx * 2.3) * 1.6;
  const ownX = slot.base.x + wobbleX;
  const x = (home ? ownX : PITCH_LENGTH - ownX) + drift;
  const y = slot.base.y + wobbleY;
  return {
    x: clamp(x, 1.5, PITCH_LENGTH - 1.5),
    y: clamp(y, 1.5, PITCH_WIDTH - 1.5),
  };
};

/**
 * Pick a shooter slot weighted by position and skill — the same weighting
 * the legacy `pickScorer()` used, so scorer distributions are unchanged.
 */
export const pickShooterSlot = (lineup: readonly LineupSlot[], active: readonly number[]): number => {
  if (!active.length) return -1;
  const weights = active.map(i => (GOAL_POS_WEIGHT[lineup[i].pos] || 1) * Math.max(1, lineup[i].rating));
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let k = 0; k < active.length; k++) {
    r -= weights[k];
    if (r <= 0) return active[k];
  }
  return active[active.length - 1];
};

/* ================================================================
   PLAY CONSTRUCTION
   ================================================================ */

/** Internal spec for a play before its geometry is built. */
interface PlaySpec {
  home: boolean;
  shot: boolean;
  /** Earliest minute this play may occur (used for post-red-card chances) */
  minMinute: number;
  minute: number;
}

/** Scratch state shared while building one side's plays. */
interface SideContext {
  input: SimTeamInput;
  lineup: LineupSlot[];
  home: boolean;
  /** Opponent context (set after both sides are created) */
  opp: SideContext;
  sentOff: SentOff[];
}

/** Slots still on the pitch at a given minute. */
const activeSlots = (ctx: SideContext, minute: number): number[] =>
  ctx.lineup
    .map((_, i) => i)
    .filter(i => !ctx.sentOff.some(so => so.slot === i && so.minute < minute));

/** Direction of attack along x: +1 for home, -1 for away. */
const attackDir = (home: boolean): number => (home ? 1 : -1);

/** Convert an own-orientation x into an absolute x. */
const toAbsX = (home: boolean, ownX: number): number => (home ? ownX : PITCH_LENGTH - ownX);

/** The next line up the pitch (STR stays STR). */
const nextLine = (pos: Position): Position =>
  pos === 'GK' ? 'DEF' : pos === 'DEF' ? 'MID' : 'STR';

/** The previous line (GK stays GK). */
const prevLine = (pos: Position): Position =>
  pos === 'STR' ? 'MID' : pos === 'MID' ? 'DEF' : 'GK';

/** Random active slot in a given line, excluding one slot; falls back to any active slot. */
const pickInLine = (ctx: SideContext, active: readonly number[], line: Position, exclude: number): number => {
  const pool = active.filter(i => i !== exclude && ctx.lineup[i].pos === line);
  const fallback = active.filter(i => i !== exclude);
  const src = pool.length ? pool : fallback;
  if (!src.length) return exclude;
  return src[Math.floor(Math.random() * src.length)];
};

/** Nearest active opponent slot to a point (and that opponent's position). */
const nearestOpponent = (
  opp: SideContext,
  point: PitchPoint,
  ballX: number,
  seed: number,
  minute: number,
): { slot: number; at: PitchPoint } | null => {
  let best: { slot: number; at: PitchPoint } | null = null;
  let bestD = Infinity;
  for (const i of activeSlots(opp, minute)) {
    const at = slotPoint(opp.lineup[i], opp.home, ballX, seed, i);
    const d = dist(at, point);
    if (d < bestD) {
      bestD = d;
      best = { slot: i, at };
    }
  }
  return best;
};

/**
 * Where a shot from a given line is taken, in own orientation.
 * Strikers shoot from inside the box; defenders from distance.
 */
const shotOrigin = (pos: Position): PitchPoint => {
  let x: number;
  switch (pos) {
    case 'STR': x = rnd(85, 99); break;
    case 'MID': x = rnd(78, 92); break;
    case 'DEF': x = rnd(72, 84); break;
    default: x = rnd(45, 62); break;
  }
  /* Closer shots are more central */
  const spread = x > 92 ? 7 : x > 84 ? 11 : 15;
  return { x, y: GOAL_Y + rnd(-spread, spread) };
};

/**
 * Raw (uncalibrated) quality of a shot: distance, angle and shooter vs keeper.
 * Later normalised so the team's mean conversion matches SHOT_CONVERSION.
 */
const rawShotQuality = (originOwn: PitchPoint, shooterRating: number, keeperRating: number): number => {
  const d = Math.hypot(PITCH_LENGTH - originOwn.x, GOAL_Y - originOwn.y);
  const angle = 1 - Math.min(Math.abs(originOwn.y - GOAL_Y), 20) / 40; /* 0.5 .. 1 */
  const base = clamp(1.25 - d / 30, 0.2, 1.2) * angle;
  const matchup = clamp(Math.sqrt(Math.max(1, shooterRating) / Math.max(1, keeperRating)), 0.6, 1.6);
  return base * matchup;
};

/** Rating of the opponent's keeper (first GK slot), or a neutral fallback. */
const keeperRating = (ctx: SideContext): number => {
  const gk = ctx.lineup.find(s => s.pos === 'GK');
  return gk ? gk.rating : 25;
};

/**
 * Build one play's geometry. Shot plays end with a `shot` segment whose
 * `to` point is finalised later once the outcome is known.
 */
const buildPlay = (ctx: SideContext, spec: PlaySpec): MatchPlay | null => {
  const { home, lineup } = ctx;
  const minute = spec.minute;
  const seed = Math.random() * 1000;
  const active = activeSlots(ctx, minute);
  if (active.length < 2) return null;

  const dir = attackDir(home);
  const segments: PlaySegment[] = [];

  /* --- Where the move starts --- */
  const r = Math.random();
  const startLine: Position = r < 0.2 ? 'GK' : r < 0.75 ? 'DEF' : 'MID';
  let current = pickInLine(ctx, active, startLine, -1);
  let ballX = toAbsX(home, LINE_X[lineup[current].pos] + 4);
  let point = slotPoint(lineup[current], home, ballX, seed, current);
  ballX = point.x;

  /* --- Pass chain --- */
  const [minLen, maxLen] = CHAIN_LENGTH[ctx.input.tactic];
  const length = Math.floor(rnd(minLen, maxLen + 1));
  for (let i = 0; i < length; i++) {
    const line = lineup[current].pos;
    const roll = Math.random();
    const targetLine: Position =
      line === 'STR'
        ? (roll < 0.6 ? 'STR' : 'MID')
        : (roll < 0.7 ? nextLine(line) : roll < 0.9 ? line : prevLine(line));
    const receiver = pickInLine(ctx, active, targetLine, current);
    if (receiver === current) break;
    const to = slotPoint(lineup[receiver], home, ballX, seed, receiver);
    segments.push({ kind: 'pass', from: point, to, fromSlot: current, toSlot: receiver });
    current = receiver;
    point = to;
    ballX = to.x;
  }

  /* --- Shot --- */
  if (spec.shot) {
    const shooter = pickShooterSlot(lineup, active);
    if (shooter < 0) return null;
    let assistSlot: number | undefined;
    const originOwn = shotOrigin(lineup[shooter].pos);
    const origin: PitchPoint = { x: toAbsX(home, originOwn.x), y: originOwn.y };

    if (shooter !== current) {
      /* Final ball is delivered into the shooting position — the shooter makes the run */
      segments.push({ kind: 'pass', from: point, to: origin, fromSlot: current, toSlot: shooter });
      assistSlot = current;
    } else if (dist(point, origin) <= 18) {
      /* Shooter already has it close enough: drive at goal */
      if (dist(point, origin) > 3) {
        segments.push({ kind: 'carry', from: point, to: origin, fromSlot: shooter, toSlot: shooter });
      }
      if (segments.length > 1) assistSlot = segments[segments.length - 2].fromSlot;
    } else {
      /* Too far to dribble: play a one-two with a teammate and arrive in the box */
      const mateLine: Position = lineup[shooter].pos === 'STR' ? 'MID' : nextLine(lineup[shooter].pos);
      const mate = pickInLine(ctx, active, mateLine, shooter);
      const matePoint = slotPoint(lineup[mate], home, ballX, seed, mate);
      segments.push({ kind: 'pass', from: point, to: matePoint, fromSlot: shooter, toSlot: mate });
      segments.push({ kind: 'pass', from: matePoint, to: origin, fromSlot: mate, toSlot: shooter });
      assistSlot = mate;
    }
    current = shooter;
    point = origin;
    ballX = origin.x;
    /* Provisional target: dead centre of the goal; resolved in resolveShots() */
    const goalX = home ? PITCH_LENGTH : 0;
    segments.push({ kind: 'shot', from: origin, to: { x: goalX, y: GOAL_Y }, fromSlot: shooter, toSlot: null });

    return {
      minute,
      teamId: ctx.input.teamId,
      home,
      segments,
      outcome: 'saved',
      shooterSlot: shooter,
      assistSlot,
      xg: rawShotQuality(originOwn, lineup[shooter].rating, keeperRating(ctx.opp)),
      seed,
    };
  }

  /* --- Turnover --- */
  const tackled = Math.random() < 0.4;
  if (tackled) {
    /* Carrier runs a few metres and is dispossessed */
    const probe: PitchPoint = {
      x: clamp(point.x + dir * rnd(3, 7), 1, PITCH_LENGTH - 1),
      y: clamp(point.y + rnd(-3, 3), 1, PITCH_WIDTH - 1),
    };
    const def = nearestOpponent(ctx.opp, probe, probe.x, seed, minute);
    const end = def ? def.at : probe;
    segments.push({ kind: 'carry', from: point, to: end, fromSlot: current, toSlot: null });
    return {
      minute, teamId: ctx.input.teamId, home, segments,
      outcome: 'tackled', defenderSlot: def?.slot, seed,
    };
  }

  /* Intercepted pass: aimed at a teammate, cut out part-way */
  const line = lineup[current].pos;
  const targetLine: Position = line === 'STR' ? 'STR' : nextLine(line);
  const receiver = pickInLine(ctx, active, targetLine, current);
  const intended = slotPoint(lineup[receiver], home, ballX, seed, receiver);
  const t = rnd(0.45, 0.8);
  const cut: PitchPoint = { x: point.x + (intended.x - point.x) * t, y: point.y + (intended.y - point.y) * t };
  const def = nearestOpponent(ctx.opp, cut, cut.x, seed, minute);
  const end = def && dist(def.at, cut) < 9 ? def.at : cut;
  segments.push({ kind: 'pass', from: point, to: end, fromSlot: current, toSlot: null });
  return {
    minute, teamId: ctx.input.teamId, home, segments,
    outcome: 'intercepted', defenderSlot: def?.slot, seed,
  };
};

/* ================================================================
   SHOT RESOLUTION
   ================================================================ */

/**
 * Decide the outcome of every shot for one side.
 *
 * Each shot's probability is its raw quality scaled so the side's *mean*
 * probability equals SHOT_CONVERSION. Because shot count was drawn with
 * mean expGoals / SHOT_CONVERSION, expected goals come out at expGoals.
 */
const resolveShots = (plays: MatchPlay[], home: boolean): number => {
  const shots = plays.filter(p => p.home === home && p.shooterSlot != null);
  if (!shots.length) return 0;
  const meanQ = shots.reduce((s, p) => s + (p.xg || 0), 0) / shots.length;
  let goals = 0;

  for (const play of shots) {
    const prob = Math.min(MAX_SHOT_PROBABILITY, (SHOT_CONVERSION * (play.xg || 0)) / Math.max(meanQ, 1e-6));
    play.xg = Math.round(prob * 100) / 100;
    let outcome: PlayOutcome;
    if (goals < MAX_GOALS && Math.random() < prob) {
      outcome = 'goal';
      goals++;
    } else {
      const roll = Math.random();
      outcome = roll < 0.45 ? 'saved' : roll < 0.83 ? 'off' : 'blocked';
    }
    play.outcome = outcome;

    /* Finalise the shot line's end point to match the outcome */
    const shot = play.segments[play.segments.length - 1];
    const goalX = home ? PITCH_LENGTH : 0;
    const beyond = home ? PITCH_LENGTH + 2.5 : -2.5;
    const side = Math.random() < 0.5 ? -1 : 1;
    switch (outcome) {
      case 'goal':
        shot.to = { x: goalX, y: GOAL_Y + side * rnd(0.4, GOAL_WIDTH / 2 - 0.4) };
        break;
      case 'saved':
        shot.to = { x: home ? goalX - 1 : goalX + 1, y: GOAL_Y + side * rnd(0, GOAL_WIDTH / 2 - 0.2) };
        break;
      case 'off':
        shot.to = { x: beyond, y: GOAL_Y + side * rnd(GOAL_WIDTH / 2 + 0.8, GOAL_WIDTH / 2 + 7) };
        break;
      case 'blocked':
      default:
        shot.to = {
          x: shot.from.x + (goalX - shot.from.x) * rnd(0.25, 0.45),
          y: shot.from.y + (GOAL_Y - shot.from.y) * rnd(0.25, 0.45),
        };
        break;
    }
  }
  return goals;
};

/* ================================================================
   TIMELINE ASSEMBLY
   ================================================================ */

/**
 * Generate the complete play-by-play timeline for a match.
 *
 * @param homeIn - Home side input (team, tactic, expected goals, strength)
 * @param awayIn - Away side input
 * @param cards  - Cards already decided by the card model; red cards remove
 *                 the player from later plays and hand the opponent extra chances
 */
export const buildMatchTimeline = (
  homeIn: SimTeamInput,
  awayIn: SimTeamInput,
  cards: readonly SimCardInput[] = [],
): MatchTimeline => {
  const homeCtx = { input: homeIn, lineup: buildLineup(homeIn.team), home: true, sentOff: [] } as unknown as SideContext;
  const awayCtx = { input: awayIn, lineup: buildLineup(awayIn.team), home: false, sentOff: [] } as unknown as SideContext;
  homeCtx.opp = awayCtx;
  awayCtx.opp = homeCtx;

  /* --- Dismissals --- */
  const sentOff: SentOff[] = [];
  for (const c of cards) {
    if (c.type !== 'red') continue;
    const ctx = c.teamId === homeIn.teamId ? homeCtx : awayCtx;
    const slot = ctx.lineup.findIndex(s => s.name === c.playerName);
    if (slot >= 0) {
      const so = { teamId: c.teamId, slot, minute: c.minute };
      sentOff.push(so);
      ctx.sentOff.push(so);
    }
  }

  /* --- Shot volume (calibrated) --- */
  const homeShots = Math.min(MAX_SHOTS, poisson(Math.max(0, homeIn.expGoals) / SHOT_CONVERSION));
  const awayShots = Math.min(MAX_SHOTS, poisson(Math.max(0, awayIn.expGoals) / SHOT_CONVERSION));

  /* --- Possession share → play counts --- */
  const totalStrength = Math.max(1, homeIn.strength + awayIn.strength);
  const share = clamp(
    homeIn.strength / totalStrength + TACTIC_POSSESSION[homeIn.tactic] - TACTIC_POSSESSION[awayIn.tactic],
    0.3, 0.7,
  );
  const totalPlays = Math.round(90 * PLAY_DENSITY);
  const homePlays = Math.max(homeShots, Math.round(totalPlays * share));
  const awayPlays = Math.max(awayShots, totalPlays - Math.round(totalPlays * share));

  const specs: PlaySpec[] = [];
  const addSpecs = (home: boolean, shots: number, plays: number): void => {
    for (let i = 0; i < shots; i++) specs.push({ home, shot: true, minMinute: 1, minute: 0 });
    for (let i = 0; i < plays - shots; i++) specs.push({ home, shot: false, minMinute: 1, minute: 0 });
  };
  addSpecs(true, homeShots, homePlays);
  addSpecs(false, awayShots, awayPlays);

  /* Red card impact: the opponent gets extra chances for the rest of the match */
  for (const so of sentOff) {
    const remaining = (90 - so.minute) / 90;
    const extra = poisson((remaining * RED_CARD_EXTRA_XG) / SHOT_CONVERSION);
    const oppHome = so.teamId !== homeIn.teamId;
    for (let i = 0; i < extra; i++) specs.push({ home: oppHome, shot: true, minMinute: so.minute + 1, minute: 0 });
  }

  /* --- Minute assignment: one play per minute, constrained plays first --- */
  const pool = shuffled(Array.from({ length: 90 }, (_, i) => i + 1));
  const ordered = [...specs].sort((a, b) => b.minMinute - a.minMinute || Number(b.shot) - Number(a.shot));
  const scheduled: PlaySpec[] = [];
  for (const spec of ordered) {
    const idx = pool.findIndex(m => m >= spec.minMinute);
    if (idx < 0) continue; /* No minute left — drop the (non-essential) play */
    spec.minute = pool.splice(idx, 1)[0];
    scheduled.push(spec);
  }

  /* --- Build geometry --- */
  const plays: MatchPlay[] = [];
  for (const spec of scheduled) {
    const play = buildPlay(spec.home ? homeCtx : awayCtx, spec);
    if (play) plays.push(play);
  }

  /* --- Resolve shots into goals / saves / misses --- */
  const homeGoals = resolveShots(plays, true);
  const awayGoals = resolveShots(plays, false);

  /* --- Late drama: nudge some goals into the final minutes --- */
  for (const play of plays) {
    if (play.outcome !== 'goal' || Math.random() >= LATE_GOAL_BIAS) continue;
    const late = 85 + Math.floor(Math.random() * 6);
    const holder = plays.find(p => p.minute === late);
    if (holder === play) continue;
    const constrained = sentOff.some(so => so.minute >= Math.min(play.minute, late));
    if (constrained) continue;
    if (holder) holder.minute = play.minute;
    play.minute = late;
  }

  plays.sort((a, b) => a.minute - b.minute);

  return {
    homeTeamId: homeIn.teamId,
    awayTeamId: awayIn.teamId,
    homeTactic: homeIn.tactic,
    awayTactic: awayIn.tactic,
    home: homeCtx.lineup,
    away: awayCtx.lineup,
    plays,
    sentOff,
    homeGoals,
    awayGoals,
  };
};

/* ================================================================
   DERIVED STATS
   ================================================================ */

/** Running match statistics derived from the plays seen so far. */
export interface MatchStats {
  homePossession: number;
  awayPossession: number;
  homeShots: number;
  awayShots: number;
  homeOnTarget: number;
  awayOnTarget: number;
  homeXg: number;
  awayXg: number;
}

/**
 * Compute match stats from the plays up to (and including) a minute.
 * Possession is weighted by the number of ball movements in each play.
 */
export const computeStats = (timeline: MatchTimeline, upToMinute: number): MatchStats => {
  let hw = 0;
  let aw = 0;
  const stats: MatchStats = {
    homePossession: 50, awayPossession: 50,
    homeShots: 0, awayShots: 0,
    homeOnTarget: 0, awayOnTarget: 0,
    homeXg: 0, awayXg: 0,
  };
  for (const play of timeline.plays) {
    if (play.minute > upToMinute) break;
    const weight = play.segments.length + 1;
    if (play.home) hw += weight; else aw += weight;
    if (play.shooterSlot == null) continue;
    const onTarget = play.outcome === 'goal' || play.outcome === 'saved';
    if (play.home) {
      stats.homeShots++;
      if (onTarget) stats.homeOnTarget++;
      stats.homeXg += play.xg || 0;
    } else {
      stats.awayShots++;
      if (onTarget) stats.awayOnTarget++;
      stats.awayXg += play.xg || 0;
    }
  }
  if (hw + aw > 0) {
    stats.homePossession = Math.round((hw / (hw + aw)) * 100);
    stats.awayPossession = 100 - stats.homePossession;
  }
  stats.homeXg = Math.round(stats.homeXg * 100) / 100;
  stats.awayXg = Math.round(stats.awayXg * 100) / 100;
  return stats;
};
