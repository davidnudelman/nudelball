/**
 * match-view.ts — Match day screen renderer.
 *
 * Builds the match UI layout:
 * - Broadcast-style scoreboard (logos, names, formation/tactic, live score, clock)
 * - SVG pitch with both lineups as dots, animated pass/shot lines, shot map
 * - Live match stats (possession, shots, on target, xG) and momentum bar
 * - Speed / skip controls, mid-match tactics bar
 * - Match events feed, half-time panel, rival results, substitutions bench
 *
 * The minute-by-minute loop lives in `src/engine/match-animation.ts`; this
 * module owns the DOM and exposes small update helpers for it.
 */

import type {
  GameState, Settings, Team, Player, Position, PowerLevels,
  MatchTimeline, MatchPlay, PlaySegment, PitchPoint, TacticId,
} from '../../types';
import { TACTICS, POS_CSS, FORMATIONS, DEFAULT_FORMATION_IDX } from '../../config';
import { teamLabelSm, teamLogo, hexToRgb } from '../../utils/helpers';
import { icon } from '../../assets/icons';
import { t } from '../../data/i18n';
import {
  slotPoint, PITCH_LENGTH, PITCH_WIDTH, GOAL_WIDTH,
} from '../../engine/match-sim';
import type { MatchStats } from '../../engine/match-sim';

/* ================================================================
   HELPERS (duplicated from squad.ts for self-containment)
   ================================================================ */

import { POS_DISTANCE, OOP_PENALTY_PER_STEP, FORM_OVR_PCT } from '../../config';

/** OOP penalty */
function getOopPenalty(naturalPos: Position, assignedPos: Position | null): number {
  if (!assignedPos || assignedPos === naturalPos) return 1.0;
  if (naturalPos === 'GK' || assignedPos === 'GK') return 0;
  const steps = Math.abs(POS_DISTANCE[naturalPos] - POS_DISTANCE[assignedPos]);
  return 1.0 - (steps * OOP_PENALTY_PER_STEP);
}

/** Effective OVR */
function playerOvr(p: Player): number {
  const stam = p.stamina != null ? p.stamina : 100;
  const base = p.skill * (0.5 + 0.5 * stam / 100);
  const freshBonus = (p.benchStreak >= 3 && p.selected) ? 1.10 : 1.0;
  const oopMult = getOopPenalty(p.pos, p.assignedPos);
  const formMult = 1.0 + ((p.form || 0) * FORM_OVR_PCT);
  const raw = Math.round(base * freshBonus * oopMult * formMult);
  return Math.max(1, Math.min(raw, p.skill));
}

/** Team strength = average OVR of 11 starters */
export function teamStrength(team: Team): number {
  const starters = team.players.filter(p => p.selected);
  if (starters.length < 11) return 10;
  return starters.reduce((s, p) => s + playerOvr(p) * (p.subbedIn ? 1.10 : 1.0), 0) / 11;
}

/** Power levels per position */
export function getTeamPowerLevels(team: Team): PowerLevels {
  const starters = team.players.filter(p => p.selected);
  const levels: PowerLevels = { GK: 0, DEF: 0, MID: 0, STR: 0, total: 0 };
  for (const p of starters) {
    const pos = (p.assignedPos || p.pos) as Position;
    const eff = playerOvr(p) * (p.subbedIn ? 1.10 : 1.0);
    levels[pos] = (levels[pos] || 0) + eff;
    levels.total += eff;
  }
  return levels;
}

/** Average rating of starters */
export function getTeamAvgRating(team: Team): number {
  const starters = team.players.filter(p => p.selected);
  if (!starters.length) return 0;
  return Math.round(starters.reduce((s, p) => s + playerOvr(p) * (p.subbedIn ? 1.10 : 1.0), 0) / starters.length);
}

/** Escape text for safe insertion into innerHTML. */
const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ================================================================
   PUBLIC TYPES
   ================================================================ */

/** Options for setting up the match UI. */
export interface MatchUIOptions {
  /** @deprecated Cup system removed — kept for interface compatibility */
  isCupFinal?: boolean;
  /** Whether the player is a neutral spectator (not participating) */
  isNeutral?: boolean;
  /** Pre-computed play-by-play timeline (drives the pitch) */
  timeline?: MatchTimeline;
  /** Tactic ids shown under each team name */
  homeTactic?: TacticId;
  awayTactic?: TacticId;
}

/** Pre-computed rival result data for the live ticker. */
export interface RivalResult {
  home: string;
  away: string;
  homeC1: string;
  homeC2: string;
  awayC1: string;
  awayC2: string;
  /** Optional country codes so the live ticker can show flags */
  homeCountry?: string;
  awayCountry?: string;
  finalH: number;
  finalA: number;
  goalEvents: Array<{ min: number; teamId: number }>;
  homeId: number;
  awayId: number;
}

export type MatchZone = 'home' | 'mid' | 'away';

/* ================================================================
   KIT COLOURS
   ================================================================ */

/** Colours used for a team's dots on the pitch. */
export interface KitColors {
  fill: string;
  stroke: string;
  text: string;
}

const colorDistance = (a: string, b: string): number => {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
};

const isLight = (hex: string): boolean => {
  const [r, g, b] = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 150;
};

/**
 * Pick kit colours for both sides so their dots never look alike.
 * The away side switches to its second colour (or white) when its
 * primary clashes with the home primary.
 */
export function pickKitColors(home: Team, away: Team): { home: KitColors; away: KitColors } {
  const homeFill = home.c1;
  const awayCandidates = [away.c1, away.c2, '#f4f4f4'];
  let awayFill = awayCandidates[0];
  for (const c of awayCandidates) {
    awayFill = c;
    if (colorDistance(homeFill, c) > 110) break;
  }
  const homeStroke = isLight(homeFill) ? '#1a1a1a' : '#ffffff';
  const awayStroke = isLight(awayFill) ? '#1a1a1a' : '#ffffff';
  return {
    home: { fill: homeFill, stroke: homeStroke, text: homeStroke },
    away: { fill: awayFill, stroke: awayStroke, text: awayStroke },
  };
}

/* ================================================================
   PITCH MARKUP
   ================================================================ */

/** Build the static SVG pitch (grass, markings, layers for dynamic content). */
function pitchSvg(): string {
  const L = PITCH_LENGTH;
  const W = PITCH_WIDTH;
  const gy = W / 2;
  const boxD = 16.5;
  const boxH = 40.3;
  const sixD = 5.5;
  const sixH = 18.3;
  const gw = GOAL_WIDTH;
  const stripes = Array.from({ length: 10 }, (_, i) =>
    `<rect x="${(i * L / 10).toFixed(2)}" y="0" width="${(L / 10).toFixed(2)}" height="${W}" class="pitch-stripe ${i % 2 ? 'alt' : ''}"/>`,
  ).join('');

  return `<svg class="pitch" id="match-pitch" viewBox="-5 -4 ${L + 10} ${W + 8}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">` +
    `<rect x="-5" y="-4" width="${L + 10}" height="${W + 8}" class="pitch-surround"/>` +
    `<g class="pitch-grass">${stripes}</g>` +
    `<g class="pitch-marks">` +
    `<rect x="0" y="0" width="${L}" height="${W}"/>` +
    `<line x1="${L / 2}" y1="0" x2="${L / 2}" y2="${W}"/>` +
    `<circle cx="${L / 2}" cy="${gy}" r="9.15"/>` +
    `<circle cx="${L / 2}" cy="${gy}" r="0.5" class="spot"/>` +
    `<rect x="0" y="${gy - boxH / 2}" width="${boxD}" height="${boxH}"/>` +
    `<rect x="${L - boxD}" y="${gy - boxH / 2}" width="${boxD}" height="${boxH}"/>` +
    `<rect x="0" y="${gy - sixH / 2}" width="${sixD}" height="${sixH}"/>` +
    `<rect x="${L - sixD}" y="${gy - sixH / 2}" width="${sixD}" height="${sixH}"/>` +
    `<circle cx="11" cy="${gy}" r="0.5" class="spot"/>` +
    `<circle cx="${L - 11}" cy="${gy}" r="0.5" class="spot"/>` +
    `<path d="M ${boxD} ${gy - 7.3} A 9.15 9.15 0 0 1 ${boxD} ${gy + 7.3}"/>` +
    `<path d="M ${L - boxD} ${gy - 7.3} A 9.15 9.15 0 0 0 ${L - boxD} ${gy + 7.3}"/>` +
    `<path d="M 0 1.5 A 1.5 1.5 0 0 0 1.5 0"/><path d="M ${L - 1.5} 0 A 1.5 1.5 0 0 0 ${L} 1.5"/>` +
    `<path d="M 0 ${W - 1.5} A 1.5 1.5 0 0 1 1.5 ${W}"/><path d="M ${L - 1.5} ${W} A 1.5 1.5 0 0 1 ${L} ${W - 1.5}"/>` +
    `<rect x="-2.2" y="${gy - gw / 2}" width="2.2" height="${gw}" class="goal"/>` +
    `<rect x="${L}" y="${gy - gw / 2}" width="2.2" height="${gw}" class="goal"/>` +
    `</g>` +
    `<g id="pitch-shotmap"></g>` +
    `<g id="pitch-lines-old" class="pitch-lines fading"></g>` +
    `<g id="pitch-lines" class="pitch-lines"></g>` +
    `<g id="pitch-players"></g>` +
    `<g id="pitch-ball" class="pitch-ball" style="transform:translate(${L / 2}px,${gy}px)"><circle r="1.05"/></g>` +
    `</svg>`;
}

/* ================================================================
   MATCH UI SETUP
   ================================================================ */

/**
 * Set up the match day UI (initial DOM structure).
 *
 * @param G        - The current game state
 * @param settings - User settings
 * @param homeTeam - The home team
 * @param awayTeam - The away team
 * @param options  - Match options (neutral spectator, timeline, tactics)
 * @returns The match sim container element (or null)
 */
export function setupMatchUI(
  G: GameState,
  settings: Settings,
  homeTeam: Team,
  awayTeam: Team,
  options?: MatchUIOptions,
): HTMLElement | null {
  const sim = document.getElementById('match-sim');
  if (!sim) return null;

  const isNeutral = options?.isNeutral ?? false;
  const isPlayerHome = homeTeam.id === G.playerTeamId;
  const playerTeam = isPlayerHome ? homeTeam : awayTeam;

  /* Strength line under each team name (respects the strength display setting) */
  const strengthOf = (team: Team): string => {
    if (settings.strengthDisplay === 'power') return `${t(settings, 'power')} ${getTeamPowerLevels(team).total}`;
    if (settings.strengthDisplay === 'avg') return `${t(settings, 'avgRating')} ${getTeamAvgRating(team)}`;
    return '';
  };

  const formationLabel = (team: Team): string => {
    const idx = team.id === G.playerTeamId
      ? (G.selectedFormationIdx ?? DEFAULT_FORMATION_IDX)
      : (team.aiFormation ?? DEFAULT_FORMATION_IDX);
    return FORMATIONS[idx]?.label ?? FORMATIONS[DEFAULT_FORMATION_IDX].label;
  };

  const tacticLabel = (tac?: TacticId): string => (tac && TACTICS[tac] ? TACTICS[tac].label : '');

  const sideMeta = (team: Team, tac?: TacticId): string => {
    const bits = [formationLabel(team), tacticLabel(tac), strengthOf(team)].filter(Boolean);
    return bits.map(b => `<span>${esc(b)}</span>`).join('<span class="sb-dot">·</span>');
  };

  /* Derby banner (#13) */
  const isDerby = (homeTeam.rivals?.includes(awayTeam.id)) || (awayTeam.rivals?.includes(homeTeam.id));
  const derbyBanner = isDerby
    ? `<div class="derby-banner"><span class="db-icon">${icon('fire', 16)}</span><span class="db-label">${t(settings, 'derbyMatch')}</span><span class="db-icon">${icon('fire', 16)}</span></div>`
    : '';

  /* Tactic buttons for mid-match adjustments */
  const tacticBtns = Object.entries(TACTICS)
    .map(([k, v]) => `<button class="match-tactic-btn${G.tactic === k ? ' active' : ''}" onclick="changeTacticMidMatch('${k}')">${v.icon} ${v.label}</button>`)
    .join('');
  const tacticsBar = isNeutral ? '' : `<div class="match-tactics-bar" id="match-tactics">${tacticBtns}</div>`;

  /* Reset match sub counters */
  G.matchSubs = 0;
  G.matchRedCards = [];

  /* Bench panel for substitutions */
  let benchHTML = '';
  if (!isNeutral) {
    const bench = playerTeam.players.filter(p => !p.selected && !p.injuredFor && !p.suspendedFor);
    if (bench.length > 0) {
      benchHTML = `<div class="subs-panel" id="subs-panel">` +
        `<div class="subs-title"><span class="title-icon">${icon('refresh', 16)}</span> ${t(settings, 'substitutions')} (<span id="subs-remaining">3</span>/3 ${t(settings, 'subsRemaining')})</div>` +
        `<div id="subs-list">`;
      for (const bp of bench) {
        const posClass = POS_CSS[bp.pos];
        const bpIdx = playerTeam.players.indexOf(bp);
        benchHTML += `<div class="sub-row" data-bench-idx="${bpIdx}">` +
          `<span class="sub-pos ${posClass}" style="background:var(--pos-${posClass})">${bp.pos}</span>` +
          `<span class="sub-name">${esc(bp.name)}</span>` +
          `<span class="sub-stats">SKL:${bp.skill} STA:${bp.stamina}%</span>` +
          `<button class="sub-btn" onclick="initSub(${bpIdx})">SUB</button></div>`;
      }
      benchHTML += `</div><div id="sub-confirm-area"></div></div>`;
    }
  }

  const kits = pickKitColors(homeTeam, awayTeam);

  const statRow = (key: string, id: string): string =>
    `<div class="ms-row" id="ms-${id}">` +
    `<span class="ms-val home" id="ms-${id}-home">0</span>` +
    `<span class="ms-mid"><span class="ms-label">${t(settings, key)}</span>` +
    `<span class="ms-bar"><span class="ms-bar-home" id="ms-${id}-bar" style="width:50%"></span></span></span>` +
    `<span class="ms-val away" id="ms-${id}-away">0</span>` +
    `</div>`;

  sim.innerHTML =
    derbyBanner +
    `<div class="match-shell">` +
    /* ---- Scoreboard ---- */
    `<div class="scoreboard" id="scoreboard">` +
    `<div class="sb-team home" id="sb-home" style="--kit:${kits.home.fill}">` +
    `<span class="sb-logo">${teamLogo(homeTeam)}</span>` +
    `<div class="sb-text"><div class="sb-name">${esc(homeTeam.name)}</div>` +
    `<div class="sb-meta">${sideMeta(homeTeam, options?.homeTactic)}</div></div>` +
    `</div>` +
    `<div class="sb-centre">` +
    `<div class="sb-live"><span class="sb-live-dot"></span>${t(settings, 'liveLabel')}</div>` +
    `<div class="sb-score" id="live-score"><span id="score-home">0</span><span class="sb-dash">–</span><span id="score-away">0</span></div>` +
    `<div class="sb-clock" id="match-timer"><span class="minute">0'</span><span class="sb-phase">${t(settings, 'kickOff')}</span></div>` +
    `</div>` +
    `<div class="sb-team away" id="sb-away" style="--kit:${kits.away.fill}">` +
    `<div class="sb-text"><div class="sb-name">${esc(awayTeam.name)}</div>` +
    `<div class="sb-meta">${sideMeta(awayTeam, options?.awayTactic)}</div></div>` +
    `<span class="sb-logo">${teamLogo(awayTeam)}</span>` +
    `</div>` +
    `<div class="match-progress" aria-hidden="true"><div class="match-progress-bar" id="match-bar" style="width:0%"></div></div>` +
    `</div>` +
    /* ---- Pitch ---- */
    `<div class="pitch-card">` +
    `<div class="pitch-wrap" id="pitch-wrap">` +
    pitchSvg() +
    `<div class="pitch-banner" id="pitch-banner" aria-live="polite"></div>` +
    `</div>` +
    `<div class="pitch-footer">` +
    `<div class="match-stats" id="match-stats" aria-label="${t(settings, 'matchStats')}">` +
    statRow('possession', 'poss') + statRow('shots', 'shots') + statRow('onTarget', 'ont') + statRow('expectedGoals', 'xg') +
    `</div>` +
    `<div class="match-momentum" id="match-momentum" aria-label="${t(settings, 'matchMomentum')}">` +
    `<div class="match-momentum-home" id="match-momentum-home" style="width:50%"></div>` +
    `<div class="match-momentum-away" id="match-momentum-away" style="width:50%"></div>` +
    `</div>` +
    `</div>` +
    `</div>` +
    /* ---- Controls ---- */
    `<div class="match-controls" id="match-controls"></div>` +
    tacticsBar +
    `<div id="ht-continue-container" class="ht-continue-container" style="display:none"></div>` +
    `<div class="match-events-card"><div class="match-events" id="match-events"></div></div>` +
    `<div class="match-meta-panels">` +
    `<div class="rival-results" id="rival-results-panel" style="display:none">` +
    `<div class="rr-title"><span class="title-icon">${icon('chartUp', 16)}</span> ${t(settings, 'otherResults')}</div>` +
    `<div id="rival-results-list"></div></div>` +
    benchHTML +
    `</div>` +
    `</div>`;

  /* Draw the lineups once the DOM exists */
  if (options?.timeline) {
    renderPitchLineups(options.timeline, homeTeam, awayTeam, kits);
  }

  return sim;
}

/* ================================================================
   PITCH: PLAYERS & LAYOUT
   ================================================================ */

/** Element id for a player dot. */
const dotId = (home: boolean, slot: number): string => `pdot-${home ? 'h' : 'a'}-${slot}`;

/**
 * Create the 22 player dots and place them in their kick-off shape.
 */
export function renderPitchLineups(
  timeline: MatchTimeline,
  homeTeam: Team,
  awayTeam: Team,
  kits?: { home: KitColors; away: KitColors },
): void {
  const layer = document.getElementById('pitch-players');
  if (!layer) return;
  const k = kits ?? pickKitColors(homeTeam, awayTeam);

  const dots = (home: boolean): string => {
    const lineup = home ? timeline.home : timeline.away;
    const kit = home ? k.home : k.away;
    return lineup.map((slot, i) =>
      `<g class="pdot ${home ? 'home' : 'away'}" id="${dotId(home, i)}" data-slot="${i}">` +
      `<title>${esc(slot.name)} · ${slot.pos} · OVR ${slot.rating}</title>` +
      `<circle class="pdot-ring" r="2.4"/>` +
      `<circle class="pdot-body" r="1.7" fill="${kit.fill}" stroke="${kit.stroke}"/>` +
      `<text class="pdot-num" y="0.55" fill="${kit.text}">${slot.number}</text>` +
      `</g>`,
    ).join('');
  };

  layer.innerHTML = dots(true) + dots(false);
  layoutPitch(timeline, PITCH_LENGTH / 2, 0, 0);
}

/**
 * Move every dot to its position for the given ball x (CSS transition handles the glide).
 *
 * @param timeline   - Match timeline (for lineups and dismissals)
 * @param ballX      - Absolute ball x the shape should react to
 * @param seed       - Current play seed (wobble)
 * @param minute     - Current minute (hides sent-off players)
 * @param durationMs - Transition duration for the glide
 */
export function layoutPitch(
  timeline: MatchTimeline,
  ballX: number,
  seed: number,
  minute: number,
  durationMs = 500,
): void {
  const place = (home: boolean): void => {
    const lineup = home ? timeline.home : timeline.away;
    const teamId = home ? timeline.homeTeamId : timeline.awayTeamId;
    lineup.forEach((slot, i) => {
      const el = document.getElementById(dotId(home, i)) as SVGGElement | null;
      if (!el) return;
      const off = timeline.sentOff.some(so => so.teamId === teamId && so.slot === i && so.minute <= minute);
      el.classList.toggle('off', off);
      const p = slotPoint(slot, home, ballX, seed, i);
      el.style.transitionDuration = `${durationMs}ms`;
      el.style.transform = `translate(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px)`;
    });
  };
  place(true);
  place(false);
}

/**
 * Pin one dot to an exact point (e.g. the shooter arriving at the shot
 * origin). The next `layoutPitch()` call returns it to its shape position.
 */
export function placeDot(home: boolean, slot: number, point: PitchPoint, durationMs: number): void {
  const el = document.getElementById(dotId(home, slot)) as SVGGElement | null;
  if (!el) return;
  el.style.transitionDuration = `${durationMs}ms`;
  el.style.transform = `translate(${point.x.toFixed(2)}px, ${point.y.toFixed(2)}px)`;
}

/** Update the scoreboard status badge ("LIVE", "HT", "FT"). */
export function setLiveBadge(text: string, live: boolean): void {
  const el = document.querySelector('.sb-live') as HTMLElement | null;
  if (!el) return;
  el.innerHTML = `${live ? '<span class="sb-live-dot"></span>' : ''}${esc(text)}`;
  el.classList.toggle('paused', !live);
}

/** Highlight the player currently on the ball (or clear with null). */
export function highlightCarrier(home: boolean | null, slot: number | null): void {
  document.querySelectorAll('.pdot.on-ball').forEach(el => el.classList.remove('on-ball'));
  if (home == null || slot == null) return;
  const el = document.getElementById(dotId(home, slot));
  if (el) el.classList.add('on-ball');
}

/** Flash a card colour on a player dot (and keep a red card marker). */
export function markCardOnPitch(home: boolean, slot: number, type: 'yellow' | 'red'): void {
  const el = document.getElementById(dotId(home, slot));
  if (!el) return;
  el.classList.add(type === 'red' ? 'red-card' : 'yellow-card');
  if (type === 'yellow') {
    window.setTimeout(() => el.classList.remove('yellow-card'), 2500);
  }
}

/** Indicate which side has the ball in the scoreboard. */
export function setPossessionIndicator(home: boolean | null): void {
  const h = document.getElementById('sb-home');
  const a = document.getElementById('sb-away');
  if (h) h.classList.toggle('has-ball', home === true);
  if (a) a.classList.toggle('has-ball', home === false);
}

/* ================================================================
   PITCH: BALL & LINES
   ================================================================ */

/** Move the ball marker to a point over the given duration. */
export function moveBall(to: PitchPoint, durationMs: number): void {
  const ball = document.getElementById('pitch-ball') as SVGGElement | null;
  if (!ball) return;
  ball.style.transitionDuration = `${durationMs}ms`;
  ball.style.transform = `translate(${to.x.toFixed(2)}px, ${to.y.toFixed(2)}px)`;
}

/**
 * Retire the current play's lines: they fade out while the next play draws.
 */
export function retirePlayLines(): void {
  const cur = document.getElementById('pitch-lines');
  const old = document.getElementById('pitch-lines-old');
  if (!cur || !old) return;
  old.innerHTML = cur.innerHTML;
  cur.innerHTML = '';
  /* Restart the fade animation */
  old.classList.remove('fading');
  void (old as unknown as HTMLElement).getBoundingClientRect();
  old.classList.add('fading');
}

/**
 * Draw one ball movement as a line that "draws in" over the given duration.
 *
 * @param seg        - The segment to draw
 * @param play       - Its parent play (for outcome styling on the final segment)
 * @param isLast     - Whether this is the final segment of the play
 * @param durationMs - Draw-in duration (0 = instant)
 */
export function drawSegment(seg: PlaySegment, play: MatchPlay, isLast: boolean, durationMs: number): void {
  const layer = document.getElementById('pitch-lines');
  if (!layer) return;
  const ns = 'http://www.w3.org/2000/svg';
  const len = Math.hypot(seg.to.x - seg.from.x, seg.to.y - seg.from.y);

  const line = document.createElementNS(ns, 'line');
  line.setAttribute('x1', seg.from.x.toFixed(2));
  line.setAttribute('y1', seg.from.y.toFixed(2));
  line.setAttribute('x2', seg.to.x.toFixed(2));
  line.setAttribute('y2', seg.to.y.toFixed(2));
  const side = play.home ? 'home' : 'away';
  let cls = `pline ${seg.kind} ${side}`;
  if (seg.kind === 'shot') cls += ` ${play.outcome}`;
  if (isLast && (play.outcome === 'intercepted' || play.outcome === 'tackled')) cls += ' lost';
  line.setAttribute('class', cls);
  if (seg.kind === 'carry') {
    line.setAttribute('stroke-dasharray', '1.2 1');
  } else {
    line.setAttribute('stroke-dasharray', len.toFixed(2));
    line.setAttribute('stroke-dashoffset', durationMs > 0 ? len.toFixed(2) : '0');
    if (durationMs > 0) line.style.animation = `plineDraw ${durationMs}ms linear forwards`;
  }
  layer.appendChild(line);

  /* End-of-play markers */
  if (isLast) {
    if (play.outcome === 'intercepted' || play.outcome === 'tackled') {
      const mark = document.createElementNS(ns, 'path');
      const { x, y } = seg.to;
      mark.setAttribute('d', `M${x - 1.2} ${y - 1.2} L${x + 1.2} ${y + 1.2} M${x + 1.2} ${y - 1.2} L${x - 1.2} ${y + 1.2}`);
      mark.setAttribute('class', `pmark lost ${side}`);
      if (durationMs > 0) mark.style.animation = `pmarkPop 200ms ${durationMs}ms both`;
      layer.appendChild(mark);
    } else if (seg.kind === 'shot') {
      const mark = document.createElementNS(ns, 'circle');
      mark.setAttribute('cx', seg.to.x.toFixed(2));
      mark.setAttribute('cy', seg.to.y.toFixed(2));
      mark.setAttribute('r', play.outcome === 'goal' ? '1.6' : '1.1');
      mark.setAttribute('class', `pmark shot ${play.outcome} ${side}`);
      if (durationMs > 0) mark.style.animation = `pmarkPop 220ms ${durationMs}ms both`;
      layer.appendChild(mark);
    }
  }
}

/** Add a permanent marker on the shot map for a finished shot. */
export function addShotMapMarker(play: MatchPlay): void {
  const layer = document.getElementById('pitch-shotmap');
  if (!layer || play.shooterSlot == null) return;
  const shot = play.segments[play.segments.length - 1];
  const ns = 'http://www.w3.org/2000/svg';
  const m = document.createElementNS(ns, 'circle');
  m.setAttribute('cx', shot.from.x.toFixed(2));
  m.setAttribute('cy', shot.from.y.toFixed(2));
  m.setAttribute('r', play.outcome === 'goal' ? '1.2' : '0.8');
  m.setAttribute('class', `smap ${play.outcome} ${play.home ? 'home' : 'away'}`);
  layer.appendChild(m);
}

/** Show a short banner over the pitch ("GOAL!", "SAVED", ...). */
export function flashPitchBanner(text: string, kind: 'goal' | 'minor', home: boolean): void {
  const el = document.getElementById('pitch-banner');
  if (!el) return;
  el.textContent = text;
  el.className = `pitch-banner show ${kind} ${home ? 'home' : 'away'}`;
  void el.offsetWidth;
  window.clearTimeout((el as unknown as { _t?: number })._t);
  (el as unknown as { _t?: number })._t = window.setTimeout(() => {
    el.className = 'pitch-banner';
  }, kind === 'goal' ? 1600 : 900);
}

/* ================================================================
   STATS & MOMENTUM
   ================================================================ */

/** Update the stats strip under the pitch. */
export function updateMatchStatsStrip(stats: MatchStats): void {
  const set = (id: string, home: string, away: string, homeShare: number): void => {
    const h = document.getElementById(`ms-${id}-home`);
    const a = document.getElementById(`ms-${id}-away`);
    const bar = document.getElementById(`ms-${id}-bar`) as HTMLElement | null;
    if (h) h.textContent = home;
    if (a) a.textContent = away;
    if (bar) bar.style.width = `${Math.round(homeShare * 100)}%`;
  };
  const share = (x: number, y: number): number => (x + y > 0 ? x / (x + y) : 0.5);
  set('poss', `${stats.homePossession}%`, `${stats.awayPossession}%`, stats.homePossession / 100);
  set('shots', String(stats.homeShots), String(stats.awayShots), share(stats.homeShots, stats.awayShots));
  set('ont', String(stats.homeOnTarget), String(stats.awayOnTarget), share(stats.homeOnTarget, stats.awayOnTarget));
  set('xg', stats.homeXg.toFixed(2), stats.awayXg.toFixed(2), share(stats.homeXg, stats.awayXg));
}

/**
 * Update the momentum bar.
 * The `zone` argument is kept for API compatibility; the pitch itself now shows territory.
 */
export function updatePitchState(homePressure: number, awayPressure: number, zone: MatchZone): void {
  const h = Math.max(0, Math.min(100, homePressure));
  const a = Math.max(0, Math.min(100, awayPressure));
  const total = h + a || 100;
  const hPct = Math.round((h / total) * 100);
  const aPct = Math.max(0, 100 - hPct);

  const homeEl = document.getElementById('match-momentum-home') as HTMLElement | null;
  const awayEl = document.getElementById('match-momentum-away') as HTMLElement | null;
  const wrap = document.getElementById('match-momentum');
  if (homeEl) homeEl.style.width = `${hPct}%`;
  if (awayEl) awayEl.style.width = `${aPct}%`;
  if (wrap) wrap.setAttribute('data-zone', zone);
}

/* ================================================================
   SCOREBOARD, FEED & RIVALS
   ================================================================ */

/**
 * Update the rival results display based on the current match minute.
 */
export function updateRivalResults(rivalResults: RivalResult[], currentMin: number): void {
  if (!rivalResults.length) return;

  const rrPanel = document.getElementById('rival-results-panel');
  const rrList = document.getElementById('rival-results-list');
  if (!rrPanel || !rrList) return;

  rrPanel.style.display = 'block';
  let rh = '';
  for (const rr of rivalResults) {
    let rH = 0;
    let rA = 0;
    for (const ge of rr.goalEvents) {
      if (ge.min <= currentMin) {
        if (ge.teamId === rr.homeId) rH++;
        else rA++;
      }
    }
    const done = currentMin >= 90;
    rh += `<div class="rival-result">${teamLabelSm({ c1: rr.homeC1, c2: rr.homeC2, name: rr.home, country: rr.homeCountry })}` +
      `<span class="rr-score">${rH} — ${rA}${done ? ' (FT)' : ''}</span>` +
      `${teamLabelSm({ c1: rr.awayC1, c2: rr.awayC2, name: rr.away, country: rr.awayCountry })}</div>`;
  }
  rrList.innerHTML = rh;
}

/** Update the live score display. */
export function updateLiveScore(homeGoals: number, awayGoals: number): void {
  const h = document.getElementById('score-home');
  const a = document.getElementById('score-away');
  if (h && a) {
    h.textContent = String(homeGoals);
    a.textContent = String(awayGoals);
    return;
  }
  const el = document.getElementById('live-score');
  if (el) el.textContent = `${homeGoals} — ${awayGoals}`;
}

/** Update the match clock. */
export function updateMatchTimer(minute: number, label?: string): void {
  const el = document.getElementById('match-timer');
  if (el) {
    el.innerHTML = `<span class="minute">${minute}'</span>${label ? `<span class="sb-phase">${esc(label)}</span>` : ''}`;
  }
}

/** Update the progress bar (0-100). */
export function updateProgressBar(percent: number): void {
  const el = document.getElementById('match-bar');
  if (el) (el as HTMLElement).style.width = percent + '%';
}

/** Append an event to the match events feed. */
export function appendMatchEvent(eventHTML: string): void {
  const el = document.getElementById('match-events');
  if (el) {
    el.insertAdjacentHTML('beforeend', eventHTML);
    el.scrollTop = el.scrollHeight;
  }
}
