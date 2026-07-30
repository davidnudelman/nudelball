/**
 * match-view.ts — Match animation/simulation view renderer.
 *
 * Builds the match UI layout with:
 * - Cup final banner (if applicable)
 * - Match header (team plates + live score)
 * - Power/AVG strength display
 * - Match timer with progress bar
 * - Mid-match tactics bar
 * - Match events feed
 * - Half-time continue area
 * - Rival results panel
 * - Substitutions bench panel
 *
 * The actual minute-by-minute animation loop is handled by the
 * match engine (in src/engine/). This module only handles the
 * initial DOM setup and provides helpers for building the UI.
 */

import type { GameState, Settings, Team, Player, Position, AnimatedMatchEvent, Fixture, PowerLevels } from '../../types';
import { TACTICS, POS_CSS } from '../../config';
import { teamLabel, teamLabelSm } from '../../utils/helpers';
import { icon } from '../../assets/icons';
import { t } from '../../data/i18n';

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

/* ================================================================
   MATCH UI SETUP
   ================================================================ */

/**
 * Options for setting up the match UI.
 */
export interface MatchUIOptions {
  /** @deprecated Cup system removed — kept for interface compatibility */
  isCupFinal?: boolean;
  /** Whether the player is a neutral spectator (not participating) */
  isNeutral?: boolean;
}

/**
 * Pre-computed rival result data for the live ticker.
 */
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

export interface PitchPoint {
  x: number;
  y: number;
}

/**
 * Set up the match simulation UI (initial DOM structure).
 *
 * This creates the visual layout for the match view:
 * - Header with team plates and live score
 * - Strength display (power or avg, per settings)
 * - Timer, progress bar, events feed
 * - Tactic buttons (if player is participating)
 * - Bench panel for substitutions
 * - Rival results panel
 *
 * The actual animation loop (minute ticking, event processing)
 * is managed by the calling code in the match engine.
 *
 * @param G        - The current game state
 * @param settings - User settings
 * @param homeTeam - The home team
 * @param awayTeam - The away team
 * @param options  - Match options (cup final, neutral spectator)
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

  const isCupFinal = options?.isCupFinal ?? false;
  const isNeutral = options?.isNeutral ?? false;
  const isPlayerHome = homeTeam.id === G.playerTeamId;
  const playerTeam = isPlayerHome ? homeTeam : awayTeam;

  /* Strength display HTML */
  let strengthHTML = '';
  if (settings.strengthDisplay === 'power') {
    const hp = getTeamPowerLevels(homeTeam);
    const ap = getTeamPowerLevels(awayTeam);
    strengthHTML = `<div class="match-power">` +
      `<div><span class="mp-label">${t(settings, 'power')} </span><span class="mp-value" style="color:var(--accent)">${hp.total}</span></div>` +
      `<div><span class="mp-label">${t(settings, 'powerLevel')}</span></div>` +
      `<div><span class="mp-value" style="color:var(--accent)">${ap.total}</span><span class="mp-label"> ${t(settings, 'power')}</span></div></div>`;
  } else if (settings.strengthDisplay === 'avg') {
    const ha = getTeamAvgRating(homeTeam);
    const aa = getTeamAvgRating(awayTeam);
    strengthHTML = `<div class="match-power">` +
      `<div><span class="mp-label">${t(settings, 'avgRating')} </span><span class="mp-value" style="color:var(--accent)">${ha}</span></div>` +
      `<div class="mp-sep"><span class="mp-sep-dot"></span><span class="mp-sep-dot"></span><span class="mp-sep-dot"></span></div>` +
      `<div><span class="mp-value" style="color:var(--accent)">${aa}</span><span class="mp-label"> ${t(settings, 'avgRating')}</span></div></div>`;
  }

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
        const posClass = bp.pos.toLowerCase();
        const bpIdx = playerTeam.players.indexOf(bp);
        benchHTML += `<div class="sub-row" data-bench-idx="${bpIdx}">` +
          `<span class="sub-pos ${posClass}" style="background:var(--pos-${posClass})">${bp.pos}</span>` +
          `<span class="sub-name">${bp.name}</span>` +
          `<span class="sub-stats">SKL:${bp.skill} STA:${bp.stamina}%</span>` +
          `<button class="sub-btn" onclick="initSub(${bpIdx})">SUB</button></div>`;
      }
      benchHTML += `</div><div id="sub-confirm-area"></div></div>`;
    }
  }

  /* Build the full match UI — HT container placed right below timer for visibility */
  sim.innerHTML =
    derbyBanner +
    `<div class="match-header-area">` +
    `<div class="mh-team home">${teamLabel(homeTeam)}</div>` +
    `<div class="match-score-big" id="live-score">0 — 0</div>` +
    `<div class="mh-team away">${teamLabel(awayTeam)}</div>` +
    `</div>` +
    strengthHTML +
    `<div class="match-timer" id="match-timer"><span class="minute">0'</span> — ${t(settings, 'kickOff')}</div>` +
    `<div class="match-progress"><div class="match-progress-bar" id="match-bar" style="width:0%"></div></div>` +
    `<div class="match-momentum" id="match-momentum" aria-label="${t(settings, 'matchMomentum')}">` +
    `<div class="match-momentum-home" id="match-momentum-home" style="width:50%"></div>` +
    `<div class="match-momentum-away" id="match-momentum-away" style="width:50%"></div>` +
    `</div>` +
    `<div class="match-zone-state" id="match-zone-state">` +
    `<div class="match-zone-pitch">` +
    `<span class="zone-seg home"></span><span class="zone-seg mid"></span><span class="zone-seg away"></span>` +
    `<span class="zone-marker" id="match-zone-marker"></span>` +
    `</div>` +
    `<div class="match-zone-label" id="match-zone-label">50 : 50</div>` +
    `</div>` +
    `<div class="match-tactical-wrap" id="match-tactical-wrap">` +
    `<div class="match-tactical-head">` +
    `<span class="inline-icon">${icon('chartUp', 14)}</span> ${t(settings, 'tacticalSimulation')}` +
    `<span class="match-cadence-badge" id="match-cadence-badge">${t(settings, 'standardCadence')}</span>` +
    `</div>` +
    `<svg class="match-tactical-pitch" id="match-tactical-pitch" viewBox="0 0 100 56" preserveAspectRatio="none" aria-hidden="true">` +
    `<rect x="0.8" y="0.8" width="98.4" height="54.4" rx="2" class="mtp-outline" />` +
    `<line x1="50" y1="1.2" x2="50" y2="54.8" class="mtp-line" />` +
    `<circle cx="50" cy="28" r="7" class="mtp-line" fill="none" />` +
    `<rect x="0.8" y="18" width="12" height="20" class="mtp-box" fill="none" />` +
    `<rect x="87.2" y="18" width="12" height="20" class="mtp-box" fill="none" />` +
    `<path id="match-ball-trail" class="mtp-ball-trail" d="" />` +
    `${Array.from({ length: 11 }).map((_, idx) => `<circle id="match-home-dot-${idx}" class="mtp-dot home" cx="20" cy="${4 + idx * 4}" r="1.35" />`).join('')}` +
    `${Array.from({ length: 11 }).map((_, idx) => `<circle id="match-away-dot-${idx}" class="mtp-dot away" cx="80" cy="${4 + idx * 4}" r="1.35" />`).join('')}` +
    `<circle id="match-ball-dot" class="mtp-ball" cx="50" cy="28" r="1.1" />` +
    `</svg>` +
    `</div>` +
    `<div id="ht-continue-container" style="display:none"></div>` +
    tacticsBar +
    `<div class="match-events" id="match-events"></div>` +
    `<div class="rival-results" id="rival-results-panel" style="display:none">` +
    `<div class="rr-title"><span class="title-icon">${icon('chartUp', 16)}</span> ${t(settings, 'otherResults')}</div>` +
    `<div id="rival-results-list"></div></div>` +
    benchHTML;

  return sim;
}

/**
 * Update the rival results display based on the current match minute.
 *
 * @param rivalResults - Pre-computed rival result data
 * @param currentMin   - Current match minute
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

/**
 * Update the live score display.
 *
 * @param homeGoals - Home team's current goals
 * @param awayGoals - Away team's current goals
 */
export function updateLiveScore(homeGoals: number, awayGoals: number): void {
  const el = document.getElementById('live-score');
  if (el) el.textContent = `${homeGoals} — ${awayGoals}`;
}

/**
 * Update the match timer display.
 *
 * @param minute - Current match minute
 * @param label  - Optional label text (e.g. "1st Half", "Half Time")
 */
export function updateMatchTimer(minute: number, label?: string): void {
  const el = document.getElementById('match-timer');
  if (el) {
    el.innerHTML = `<span class="minute">${minute}'</span>${label ? ' — ' + label : ''}`;
  }
}

/**
 * Update the progress bar.
 *
 * @param percent - Percentage completion (0-100)
 */
export function updateProgressBar(percent: number): void {
  const el = document.getElementById('match-bar');
  if (el) (el as HTMLElement).style.width = percent + '%';
}

/**
 * Update momentum bars and pitch-zone marker.
 */
export function updatePitchState(homePressure: number, awayPressure: number, zone: MatchZone): void {
  const h = Math.max(0, Math.min(100, homePressure));
  const a = Math.max(0, Math.min(100, awayPressure));
  const total = h + a || 100;
  const hPct = Math.round((h / total) * 100);
  const aPct = Math.max(0, 100 - hPct);

  const homeEl = document.getElementById('match-momentum-home') as HTMLElement | null;
  const awayEl = document.getElementById('match-momentum-away') as HTMLElement | null;
  const marker = document.getElementById('match-zone-marker') as HTMLElement | null;
  const label = document.getElementById('match-zone-label') as HTMLElement | null;
  const zoneState = document.getElementById('match-zone-state');

  if (homeEl) homeEl.style.width = `${hPct}%`;
  if (awayEl) awayEl.style.width = `${aPct}%`;
  if (label) label.textContent = `${hPct} : ${aPct}`;
  if (zoneState) zoneState.setAttribute('data-zone', zone);

  if (marker) {
    const pos = zone === 'home' ? 20 : zone === 'away' ? 80 : 50;
    marker.style.left = `${pos}%`;
  }
}

export function updateCadenceBadge(label: string): void {
  const badge = document.getElementById('match-cadence-badge');
  if (badge) badge.textContent = label;
}

export function updateTacticalPitch(homeDots: PitchPoint[], awayDots: PitchPoint[], ball: PitchPoint, trail: PitchPoint[]): void {
  const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

  for (let i = 0; i < 11; i++) {
    const home = homeDots[i];
    const away = awayDots[i];
    const homeEl = document.getElementById(`match-home-dot-${i}`);
    const awayEl = document.getElementById(`match-away-dot-${i}`);
    if (homeEl && home) {
      homeEl.setAttribute('cx', String(clamp(home.x, 2, 98)));
      homeEl.setAttribute('cy', String(clamp(home.y, 2, 54)));
    }
    if (awayEl && away) {
      awayEl.setAttribute('cx', String(clamp(away.x, 2, 98)));
      awayEl.setAttribute('cy', String(clamp(away.y, 2, 54)));
    }
  }

  const ballEl = document.getElementById('match-ball-dot');
  if (ballEl) {
    ballEl.setAttribute('cx', String(clamp(ball.x, 2, 98)));
    ballEl.setAttribute('cy', String(clamp(ball.y, 2, 54)));
  }

  const trailEl = document.getElementById('match-ball-trail');
  if (trailEl) {
    const points = trail
      .map((point) => `${clamp(point.x, 2, 98).toFixed(2)},${clamp(point.y, 2, 54).toFixed(2)}`)
      .join(' L ');
    trailEl.setAttribute('d', points.length ? `M ${points}` : '');
  }
}

/**
 * Append an event to the match events feed.
 *
 * @param eventHTML - HTML string for the event
 */
export function appendMatchEvent(eventHTML: string): void {
  const el = document.getElementById('match-events');
  if (el) {
    el.innerHTML += eventHTML;
    el.scrollTop = el.scrollHeight;
  }
}
