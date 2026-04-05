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
import { teamLabel, teamPlate } from '../../utils/helpers';
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
  finalH: number;
  finalA: number;
  goalEvents: Array<{ min: number; teamId: number }>;
  homeId: number;
  awayId: number;
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
      `<div><span class="mp-label">&#9889;</span></div>` +
      `<div><span class="mp-value" style="color:var(--accent)">${aa}</span><span class="mp-label"> ${t(settings, 'avgRating')}</span></div></div>`;
  }

  /* Derby banner (#13) */
  const isDerby = (homeTeam.rivals?.includes(awayTeam.id)) || (awayTeam.rivals?.includes(homeTeam.id));
  const derbyBanner = isDerby ? '<div style="text-align:center;padding:6px;font-weight:700;color:#fff;background:linear-gradient(90deg,#e53935,#ff6f00);border-radius:6px;margin-bottom:8px">&#128293; DERBY MATCH &#128293;</div>' : '';

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
        `<div class="subs-title">&#128260; Substitutions (<span id="subs-remaining">3</span>/3 remaining)</div>` +
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
    `<div id="ht-continue-container" style="display:none"></div>` +
    tacticsBar +
    `<div class="match-events" id="match-events"></div>` +
    `<div class="rival-results" id="rival-results-panel" style="display:none">` +
    `<div class="rr-title">&#128202; Other Results</div>` +
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
    rh += `<div class="rival-result">${teamPlate(rr.homeC1, rr.homeC2, rr.home, true)}` +
      `<span class="rr-score">${rH} — ${rA}${done ? ' (FT)' : ''}</span>` +
      `${teamPlate(rr.awayC1, rr.awayC2, rr.away, true)}</div>`;
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
