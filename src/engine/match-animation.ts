/**
 * match-animation.ts — Minute-by-minute animated match replay.
 *
 * Drives the match day screen with a tick-based loop:
 *   - 1 tick = 1 game minute (780ms at 1x; 2x and 4x available)
 *   - Each minute may hold one *play* from the pre-computed timeline: its
 *     passes and shots are drawn on the pitch as lines, sequentially,
 *     inside the tick, and the ball glides along with them
 *   - Goals fire when the shot line reaches the goal (score, sound, feed)
 *   - Cards are shown on the player's dot and in the feed
 *   - Half-time pause for substitutions and a coach comment
 *   - Skip controls flush pending animation so nothing is lost
 *   - Match summary card at full-time with an auto-exit countdown
 *
 * The result is pre-computed by `simulateMatch()`; this module only reveals
 * it. The timeline is the source of truth for goals when present; without
 * one (legacy fixtures) the goal events on the fixture are used instead.
 */

import type { Fixture, GameState, MatchEvent, MatchPlay, MatchTimeline, Settings, Team } from '../types';
import {
  setupMatchUI,
  updateLiveScore,
  updateMatchTimer,
  updateProgressBar,
  appendMatchEvent,
  updateRivalResults,
  updatePitchState,
  layoutPitch,
  drawSegment,
  retirePlayLines,
  moveBall,
  highlightCarrier,
  markCardOnPitch,
  setPossessionIndicator,
  flashPitchBanner,
  addShotMapMarker,
  updateMatchStatsStrip,
  placeDot,
  setLiveBadge,
} from '../ui/views/match-view';
import type { MatchZone, RivalResult } from '../ui/views/match-view';
import { computeStats } from './match-sim';
import { icon } from '../assets/icons';
import { getCoachComment } from '../data/coach-comments';
import { SFX } from '../audio/sfx';
import { t } from '../data/i18n';

/** Base milliseconds per tick at 1x speed (1 tick = 1 game minute). */
const BASE_TICK_MS = 780;
/** Game minutes advanced per tick. */
const STEP_MINUTES = 1;
/** Share of a tick spent animating the minute's play. */
const PLAY_SHARE = 0.85;

/** Total game minutes (90) */
const TOTAL_MINUTES = 90;

/** Half-time minute */
const HALF_TIME = 45;

/** Options for the animated match. */
export interface AnimatedMatchOptions {
  /** @deprecated Cup system removed */
  isCupFinal?: boolean;
  /** Whether the player is a neutral spectator (not participating) */
  isNeutral?: boolean;
  /** Pre-computed rival results to display live */
  rivalResults?: RivalResult[];
  /** Play-by-play timeline produced by simulateMatch() */
  timeline?: MatchTimeline;
  /** Callback when the full animation completes */
  onComplete: () => void;
}

export interface MatchPitchState {
  homePressure: number;
  awayPressure: number;
  zone: MatchZone;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Derive momentum/zone state from scoreline and real event advantage.
 */
export function derivePitchState(
  homeGoals: number,
  awayGoals: number,
  homeEventAdvantage: number,
): MatchPitchState {
  const scoreBias = (homeGoals - awayGoals) * 12;
  const combined = clamp(scoreBias + homeEventAdvantage, -42, 42);
  const homePressure = clamp(50 + combined, 10, 90);
  const awayPressure = 100 - homePressure;
  const zone: MatchZone = combined >= 14 ? 'away' : combined <= -14 ? 'home' : 'mid';
  return { homePressure, awayPressure, zone };
}

/* ================================================================
   IMMERSIVE MODE HELPERS
   ================================================================ */

/** Enter immersive full-screen match mode: hide chrome, lock nav. */
function enterImmersiveMode(): void {
  document.body.classList.add('match-active');
  const nav = document.getElementById('nav');
  if (nav) nav.classList.add('nav-locked');
}

/** Exit immersive full-screen match mode: restore chrome, unlock nav. */
function exitImmersiveMode(): void {
  document.body.classList.remove('match-active');
  const nav = document.getElementById('nav');
  if (nav) nav.classList.remove('nav-locked');
}

/**
 * Run an animated match replay.
 *
 * The fixture must already be simulated (goals, events populated). When a
 * timeline is supplied the pitch replays every pass and shot; otherwise the
 * screen falls back to revealing the fixture's goal events.
 *
 * @param fixture  - The pre-computed fixture with results and events
 * @param G        - The game state
 * @param settings - User settings
 * @param options  - Animation options (timeline, rival results, callbacks)
 */
export function runAnimatedMatch(
  fixture: Fixture,
  G: GameState,
  settings: Settings,
  options: AnimatedMatchOptions,
): void {
  const homeTeam = G.teams[fixture.home];
  const awayTeam = G.teams[fixture.away];
  const isPlayerHome = fixture.home === G.playerTeamId;
  const timeline = options.timeline;

  /* Enter immersive mode */
  enterImmersiveMode();

  /* Tactic labels for the scoreboard come from the engine (what was actually played) */
  const homeTactic = timeline?.homeTactic ?? (isPlayerHome ? G.tactic : undefined);
  const awayTactic = timeline?.awayTactic ?? (fixture.away === G.playerTeamId ? G.tactic : undefined);

  /* Set up the match UI DOM */
  const sim = setupMatchUI(G, settings, homeTeam, awayTeam, {
    isCupFinal: options.isCupFinal,
    isNeutral: options.isNeutral ?? false,
    timeline,
    homeTactic,
    awayTactic,
  });
  if (!sim) {
    exitImmersiveMode();
    options.onComplete();
    return;
  }

  /* Card events (and legacy goal events when no timeline) by minute */
  const feedEvents = [...fixture.events]
    .filter(ev => ev.type !== 'goal' || !timeline)
    .sort((a, b) => a.minute - b.minute);
  const playsByMinute = new Map<number, MatchPlay>();
  if (timeline) for (const play of timeline.plays) playsByMinute.set(play.minute, play);

  /* Running state */
  let eventIdx = 0;
  let currentMin = 0;
  let homeGoals = 0;
  let awayGoals = 0;
  let currentSpeed = settings.matchSpeed || 1;
  let isPaused = false;
  let timerId: ReturnType<typeof setInterval> | null = null;
  let countdownTimerId: ReturnType<typeof setInterval> | null = null;
  let homeEventAdvantage = 0;
  let lastSeed = 0;
  /** Ball x the current formation shape is laid out for (centre spot at kick-off) */
  let lastBallX = 52.5;

  /** Deferred animation steps for the play currently drawing (flushable on skip). */
  const pending: Array<{ id: number; run: () => void }> = [];

  /* Play kick-off whistle */
  SFX.whistle();
  updateMatchTimer(0, t(settings, 'kickOff'));
  updatePitchState(50, 50, 'mid');

  function tickMs(): number {
    return Math.max(90, Math.round(BASE_TICK_MS / currentSpeed));
  }

  /* ---------------------------------------------------------------
     Deferred step scheduling
     --------------------------------------------------------------- */

  function schedule(delayMs: number, run: () => void): void {
    const entry = { id: 0, run };
    entry.id = window.setTimeout(() => {
      const i = pending.indexOf(entry);
      if (i >= 0) pending.splice(i, 1);
      run();
    }, delayMs);
    pending.push(entry);
  }

  /** Run every pending step now, in order. */
  function flushPending(): void {
    const steps = pending.splice(0, pending.length);
    for (const s of steps) {
      window.clearTimeout(s.id);
      s.run();
    }
  }

  /* ---------------------------------------------------------------
     Controls
     --------------------------------------------------------------- */

  function updateSpeedControlsUI(): void {
    document.querySelectorAll('.match-speed-btn').forEach((btn) => {
      const el = btn as HTMLButtonElement;
      el.classList.toggle('active', Number(el.dataset.speed) === currentSpeed);
    });
    const skipHalfBtn = document.getElementById('match-skip-ht') as HTMLButtonElement | null;
    if (skipHalfBtn) skipHalfBtn.disabled = currentMin >= HALF_TIME;
  }

  function setMatchSpeed(speed: number): void {
    if (speed !== 1 && speed !== 2 && speed !== 4) return;
    currentSpeed = speed;
    settings.matchSpeed = speed as 1 | 2 | 4;
    const persistSpeed = (window as unknown as { setMatchSpeedSetting?: (value: number) => void }).setMatchSpeedSetting;
    if (typeof persistSpeed === 'function') {
      persistSpeed(speed);
    }
    updateSpeedControlsUI();
    if (timerId && !isPaused) {
      clearInterval(timerId);
      startTicker();
    }
  }

  function skipToHalfTime(): void {
    if (currentMin >= HALF_TIME) return;
    if (timerId) clearInterval(timerId);
    flushPending();
    processMinutesUpTo(HALF_TIME, false);
    currentMin = HALF_TIME;
    updateProgressBar((currentMin / TOTAL_MINUTES) * 100);
    showHalfTime();
    updateSpeedControlsUI();
  }

  function skipToFullTime(): void {
    if (currentMin >= TOTAL_MINUTES) return;
    if (timerId) clearInterval(timerId);
    flushPending();
    processMinutesUpTo(TOTAL_MINUTES, false);
    currentMin = TOTAL_MINUTES;
    showFullTime();
    updateSpeedControlsUI();
  }

  function renderSpeedControls(): void {
    const controls = document.getElementById('match-controls');
    if (!controls) return;
    controls.innerHTML =
      `<div class="match-speed-group" role="group" aria-label="${t(settings, 'matchSpeed')}">` +
      `<span class="mp-label">${t(settings, 'matchSpeed')}</span>` +
      `<button class="btn btn-secondary btn-sm match-speed-btn" data-speed="1" onclick="setMatchSpeed(1)">1x</button>` +
      `<button class="btn btn-secondary btn-sm match-speed-btn" data-speed="2" onclick="setMatchSpeed(2)">2x</button>` +
      `<button class="btn btn-secondary btn-sm match-speed-btn" data-speed="4" onclick="setMatchSpeed(4)">4x</button>` +
      `</div>` +
      `<div class="match-skip-group">` +
      `<button class="btn btn-secondary btn-sm match-skip-btn" id="match-skip-ht" onclick="skipToHalfTime()">${t(settings, 'skipHalf')}</button>` +
      `<button class="btn btn-secondary btn-sm match-skip-btn" onclick="skipToFullTime()">${t(settings, 'skipFull')}</button>` +
      `</div>`;
    updateSpeedControlsUI();
  }

  /** Trigger a pulse animation on the live score element. */
  function pulseScore(): void {
    const scoreEl = document.getElementById('live-score');
    if (scoreEl) {
      scoreEl.classList.remove('score-pulse');
      void scoreEl.offsetWidth;
      scoreEl.classList.add('score-pulse');
    }
  }

  /* ---------------------------------------------------------------
     Timeline processing
     --------------------------------------------------------------- */

  function refreshMomentum(): void {
    const pitchState = derivePitchState(homeGoals, awayGoals, homeEventAdvantage);
    updatePitchState(pitchState.homePressure, pitchState.awayPressure, pitchState.zone);
  }

  function refreshStats(minute: number): void {
    if (!timeline) return;
    updateMatchStatsStrip(computeStats(timeline, minute));
  }

  /** Name of the lineup slot (for feed text). */
  function slotName(play: MatchPlay, slot: number | undefined): string {
    if (!timeline || slot == null) return '';
    const lineup = play.home ? timeline.home : timeline.away;
    return lineup[slot]?.name ?? '';
  }

  /** Register a goal: score, sound, feed row, banner. */
  function scoreGoal(teamId: number, minute: number, scorer: string, assist: string | undefined, narrative: string | undefined): void {
    const isHome = teamId === fixture.home;
    if (isHome) homeGoals++; else awayGoals++;
    homeEventAdvantage += isHome ? 10 : -10;
    updateLiveScore(homeGoals, awayGoals);
    pulseScore();
    SFX.goal();
    flashPitchBanner(t(settings, 'goalBanner'), 'goal', isHome);
    const team = isHome ? homeTeam : awayTeam;
    const isPlayerGoal = teamId === G.playerTeamId;
    const assistText = assist ? ` <span class="me-assist">${t(settings, 'assistBy', { name: assist })}</span>` : '';
    const narrativeText = narrative ? `<div class="me-narrative">${narrative}</div>` : '';
    appendMatchEvent(
      `<div class="match-event goal ${isHome ? 'me-home' : 'me-away'}${isPlayerGoal ? ' player-goal' : ''}">` +
      `<span class="me-min">${minute}'</span> <span class="inline-icon">${icon('ball', 14)}</span> ` +
      `<b>${scorer}</b> <span class="me-team">(${team.name})</span>${assistText}` +
      `${narrativeText}</div>`,
    );
    refreshMomentum();
  }

  /** Feed row for a chance that did not go in. */
  function noteChance(play: MatchPlay): void {
    const key = play.outcome === 'saved' ? 'chanceSaved' : play.outcome === 'off' ? 'chanceOff' : 'chanceBlocked';
    const name = slotName(play, play.shooterSlot);
    const sideClass = play.home ? 'me-home' : 'me-away';
    appendMatchEvent(
      `<div class="match-event chance ${sideClass}"><span class="me-min">${play.minute}'</span> ` +
      `<span class="me-chance-text">${t(settings, key, { name })}</span>` +
      `<span class="me-xg">xG ${(play.xg ?? 0).toFixed(2)}</span></div>`,
    );
  }

  /** Apply a finished play's outcome (score, feed, stats). */
  function finishPlay(play: MatchPlay): void {
    if (play.shooterSlot != null) {
      addShotMapMarker(play);
      if (play.outcome === 'goal') {
        const ev = fixture.events.find(e => e.type === 'goal' && e.minute === play.minute && e.teamId === play.teamId);
        scoreGoal(play.teamId, play.minute, slotName(play, play.shooterSlot), slotName(play, play.assistSlot) || undefined, ev?.narrative);
      } else {
        noteChance(play);
        const bannerKey = play.outcome === 'saved' ? 'savedBanner' : play.outcome === 'off' ? 'wideBanner' : 'blockedBanner';
        flashPitchBanner(t(settings, bannerKey), 'minor', play.home);
      }
    }
    highlightCarrier(null, null);
    refreshStats(play.minute);
  }

  /**
   * Draw a play on the pitch. When `animate` is true the segments are
   * scheduled sequentially inside the tick; otherwise everything is drawn
   * instantly (used by the skip controls).
   */
  function showPlay(play: MatchPlay, animate: boolean): void {
    if (!timeline) return;
    retirePlayLines();
    lastSeed = play.seed;
    setPossessionIndicator(play.home);

    const segs = play.segments;
    const total = animate ? tickMs() * PLAY_SHARE : 0;
    const per = segs.length ? total / segs.length : 0;

    segs.forEach((seg, i) => {
      const run = (): void => {
        const isLast = i === segs.length - 1;
        const glide = animate ? Math.max(per, 180) : 0;
        highlightCarrier(play.home, seg.fromSlot);
        drawSegment(seg, play, isLast, animate ? per : 0);
        moveBall(seg.to, animate ? per : 0);
        /* The engine computed this segment's end point from the shape at its start x,
           so laying out for `from.x` puts the receiver exactly on the line's end. */
        layoutPitch(timeline, seg.from.x, play.seed, play.minute, glide);
        lastBallX = seg.from.x;
        /* Pin the passer at the line start and the receiver at its end (runs into the box etc.) */
        placeDot(play.home, seg.fromSlot, seg.from, glide);
        if (seg.toSlot != null) placeDot(play.home, seg.toSlot, seg.to, glide);
      };
      if (animate) schedule(i * per, run); else run();
    });

    if (animate) schedule(total, () => finishPlay(play));
    else finishPlay(play);
  }

  /** Show a card event: feed row, sound, dot marker. */
  function showCard(ev: MatchEvent): void {
    const isHome = ev.teamId === fixture.home;
    const team = isHome ? homeTeam : awayTeam;
    const sideClass = isHome ? 'me-home' : 'me-away';
    const narrativeText = ev.narrative ? `<div class="me-narrative">${ev.narrative}</div>` : '';
    const red = ev.type === 'red';
    homeEventAdvantage += (isHome ? 1 : -1) * (red ? 8 : 3);
    if (red) SFX.redCard(); else SFX.yellowCard();
    appendMatchEvent(
      `<div class="match-event card-event${red ? ' red' : ''} ${sideClass}">` +
      `<span class="me-min">${ev.minute}'</span> <span class="card-rect ${red ? 'red' : 'yellow'}"></span> ` +
      `<b>${ev.playerName}</b> <span class="me-team">(${team.name})</span>` +
      `${narrativeText}</div>`,
    );
    if (timeline) {
      const lineup = isHome ? timeline.home : timeline.away;
      const slot = lineup.findIndex(s => s.name === ev.playerName);
      if (slot >= 0) markCardOnPitch(isHome, slot, red ? 'red' : 'yellow');
    }
    refreshMomentum();
  }

  /** Legacy path (no timeline): reveal a goal straight from the fixture events. */
  function showLegacyGoal(ev: MatchEvent): void {
    scoreGoal(ev.teamId, ev.minute, ev.scorer || '', ev.assist, ev.narrative);
  }

  /** Process everything that happens in one minute. Returns true when a play was drawn. */
  function processMinute(minute: number, animate: boolean): boolean {
    while (eventIdx < feedEvents.length && feedEvents[eventIdx].minute <= minute) {
      const ev = feedEvents[eventIdx];
      if (ev.type === 'goal') showLegacyGoal(ev);
      else showCard(ev);
      eventIdx++;
    }
    const play = playsByMinute.get(minute);
    if (play) {
      showPlay(play, animate);
      return true;
    }
    if (timeline) layoutPitch(timeline, lastBallX, lastSeed, minute, animate ? tickMs() : 0);
    return false;
  }

  /** Process every minute after the current one up to `minute` (instantly). */
  function processMinutesUpTo(minute: number, animate: boolean): void {
    for (let m = currentMin + 1; m <= minute; m++) processMinute(m, animate);
    refreshMomentum();
    refreshStats(minute);
  }

  /* ---------------------------------------------------------------
     Half-time / full-time panels
     --------------------------------------------------------------- */

  /** Build a match summary HTML string for full-time display. */
  function buildMatchSummary(): string {
    const goalEvents = fixture.events.filter(e => e.type === 'goal').sort((a, b) => a.minute - b.minute);
    const cardEvents = fixture.events.filter(e => e.type === 'yellow' || e.type === 'red').sort((a, b) => a.minute - b.minute);

    let html = '<div class="match-summary">';
    html += `<div class="match-summary-title">${t(settings, 'matchSummary')}</div>`;

    if (goalEvents.length > 0) {
      const goalIcon = `<span class="inline-icon">${icon('ball', 14)}</span>`;
      for (const g of goalEvents) {
        const team = g.teamId === fixture.home ? homeTeam : awayTeam;
        const assist = g.assist ? ` <span class="me-assist">${t(settings, 'assistBy', { name: g.assist })}</span>` : '';
        html += `<div class="match-summary-row">${goalIcon} <b>${g.scorer}</b> ${g.minute}' (${team.name})${assist}</div>`;
      }
    } else {
      html += `<div class="match-summary-row">${t(settings, 'noGoalsScored')}</div>`;
    }

    for (const c of cardEvents) {
      const cRect = c.type === 'red' ? '<span class="card-rect red"></span>' : '<span class="card-rect yellow"></span>';
      const team = c.teamId === fixture.home ? homeTeam : awayTeam;
      html += `<div class="match-summary-row">${cRect} <b>${c.playerName}</b> ${c.minute}' (${team.name})</div>`;
    }

    if (timeline) {
      const s = computeStats(timeline, TOTAL_MINUTES);
      html += `<div class="match-summary-row stats">` +
        `<span>${t(settings, 'possession')} ${s.homePossession}% – ${s.awayPossession}%</span>` +
        `<span>${t(settings, 'shots')} ${s.homeShots} – ${s.awayShots}</span>` +
        `<span>${t(settings, 'expectedGoals')} ${s.homeXg.toFixed(2)} – ${s.awayXg.toFixed(2)}</span>` +
        `</div>`;
    }

    if (fixture.motm) {
      html += `<div class="match-summary-row"><span class="inline-icon">${icon('star', 14)}</span> <b>${t(settings, 'manOfTheMatch')}:</b> ${fixture.motm}</div>`;
    }

    if (G.activeTeamTalk) {
      html += `<div class="match-summary-row"><span class="inline-icon">${icon('users', 14)}</span> ${t(settings, 'teamTalkImpact')}</div>`;
    }

    html += '</div>';
    return html;
  }

  /** Show the half-time break with coach comment, auto-sub, and continue button. */
  function showHalfTime(): void {
    isPaused = true;
    if (timerId) clearInterval(timerId);
    flushPending();
    setPossessionIndicator(null);

    SFX.whistle();
    updateMatchTimer(45, t(settings, 'halfTime'));
    setLiveBadge('HT', false);

    const myGoals = isPlayerHome ? homeGoals : awayGoals;
    const theirGoals = isPlayerHome ? awayGoals : homeGoals;
    const comment = getCoachComment(myGoals, theirGoals);

    appendMatchEvent(
      `<div class="match-event ht-event">` +
      `<span class="me-min">45'</span> <span class="inline-icon">${icon('clock', 14)}</span> <b>HALF TIME</b> ` +
      `${homeGoals} &mdash; ${awayGoals}</div>`,
    );

    const htContainer = document.getElementById('ht-continue-container');
    if (htContainer) {
      const isNeutral = options.isNeutral ?? false;
      const subsLeft = 3 - G.matchSubs;
      const autoSubBtn = (!isNeutral && subsLeft > 0)
        ? `<button class="btn btn-secondary auto-sub-btn btn-has-icon" onclick="autoSub()">` +
          `<span class="btn-icon">${icon('refresh', 14)}</span> ${t(settings, 'autoSubWithCount', { count: String(subsLeft) })}</button>`
        : '';

      htContainer.style.display = 'block';
      htContainer.innerHTML =
        `<div class="ht-panel">` +
        `<div class="coach-comment">` +
        `<span class="coach-icon">${icon('user', 18)}</span> ` +
        `<span class="coach-text">"${comment}"</span>` +
        `</div>` +
        `<div class="ht-actions">` +
        `<div class="ht-label"><span class="inline-icon">${icon('clock', 14)}</span> ${t(settings, 'halfTimeBreak')}</div>` +
        `<div class="ht-actions-row">` +
        `<button class="btn btn-success ht-continue-btn btn-has-icon" onclick="continueMatch()">` +
        `<span class="btn-icon">${icon('arrowRight', 14)}</span> ${t(settings, 'continueMatch')}</button>` +
        autoSubBtn +
        `</div>` +
        `</div>` +
        `</div>`;
      htContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /** Resume the match after half-time. */
  function continueMatch(): void {
    if (!isPaused || currentMin >= TOTAL_MINUTES) return;
    isPaused = false;

    const htContainer = document.getElementById('ht-continue-container');
    if (htContainer) {
      htContainer.style.display = 'none';
      htContainer.innerHTML = '';
    }

    const subsRemaining = document.getElementById('subs-remaining');
    if (subsRemaining) {
      subsRemaining.textContent = String(3 - G.matchSubs);
    }

    SFX.whistle();
    setLiveBadge(t(settings, 'liveLabel'), true);
    startTicker();
  }

  /** Show the full-time summary with match summary card. */
  function showFullTime(): void {
    if (timerId) clearInterval(timerId);
    isPaused = false;
    flushPending();
    setPossessionIndicator(null);

    SFX.whistle();
    updateMatchTimer(90, t(settings, 'fullTime'));
    updateProgressBar(100);
    setLiveBadge('FT', false);

    const myGoals = isPlayerHome ? homeGoals : awayGoals;
    const theirGoals = isPlayerHome ? awayGoals : homeGoals;
    const comment = getCoachComment(myGoals, theirGoals);

    appendMatchEvent(
      `<div class="match-event ft-event">` +
      `<span class="me-min">90'</span> <span class="inline-icon">${icon('clock', 14)}</span> <b>FULL TIME</b> ` +
      `${homeGoals} &mdash; ${awayGoals}</div>`,
    );

    if (myGoals > theirGoals) {
      SFX.cheer();
    }

    if (options.rivalResults) {
      updateRivalResults(options.rivalResults, 90);
    }

    const summaryHTML = buildMatchSummary();

    const htContainer = document.getElementById('ht-continue-container');
    if (htContainer) {
      htContainer.style.display = 'block';
      htContainer.innerHTML =
        `<div class="ht-panel">` +
        `<div class="coach-comment">` +
        `<span class="coach-icon">${icon('user', 18)}</span> ` +
        `<span class="coach-text">"${comment}"</span>` +
        `</div>` +
        summaryHTML +
        `<button class="btn btn-success ht-continue-btn ht-finish-btn btn-has-icon" ` +
        `onclick="finishMatch()"><span class="btn-icon">${icon('check', 14)}</span> ${t(settings, 'continueLabel')} <span id="ft-countdown">(15s)</span></button>` +
        `</div>`;
      htContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /* Auto-exit countdown: 15 seconds then auto-call finishMatch */
    let countdown = 15;
    const countdownEl = document.getElementById('ft-countdown');
    countdownTimerId = setInterval(() => {
      countdown--;
      if (countdownEl) {
        countdownEl.textContent = `(${countdown}s)`;
      }
      if (countdown <= 0) {
        if (countdownTimerId) clearInterval(countdownTimerId);
        countdownTimerId = null;
        const finishFn = (window as unknown as Record<string, unknown>).finishMatch as (() => void) | undefined;
        if (finishFn) finishFn();
      }
    }, 1000);
  }

  /* ---------------------------------------------------------------
     Ticker
     --------------------------------------------------------------- */

  /** Start (or restart) the minute ticker interval. */
  function startTicker(): void {
    timerId = setInterval(() => {
      currentMin += STEP_MINUTES;

      if (currentMin >= TOTAL_MINUTES) {
        currentMin = TOTAL_MINUTES;
        if (timerId) clearInterval(timerId);
        const half = t(settings, 'secondHalf');
        updateMatchTimer(currentMin, half);
        updateProgressBar(100);
        const hadPlay = processMinute(currentMin, true);
        /* Let the final play finish drawing before the whistle */
        window.setTimeout(showFullTime, hadPlay ? tickMs() : 0);
        return;
      }

      const half = currentMin <= HALF_TIME ? t(settings, 'firstHalf') : t(settings, 'secondHalf');
      updateMatchTimer(currentMin, half);
      updateProgressBar((currentMin / TOTAL_MINUTES) * 100);

      const hadPlay = processMinute(currentMin, true);
      refreshMomentum();

      if (options.rivalResults) {
        updateRivalResults(options.rivalResults, currentMin);
      }

      if (currentMin === HALF_TIME && !isPaused) {
        isPaused = true;
        if (timerId) clearInterval(timerId);
        window.setTimeout(showHalfTime, hadPlay ? tickMs() : 0);
      }
    }, tickMs());
  }

  /* Track whether onComplete has already been called to prevent double-fire */
  let completeCalled = false;

  /* Expose continue/finish functions on window for onclick handlers */
  (window as unknown as Record<string, unknown>).continueMatch = continueMatch;
  (window as unknown as Record<string, unknown>).setMatchSpeed = setMatchSpeed;
  (window as unknown as Record<string, unknown>).skipToHalfTime = skipToHalfTime;
  (window as unknown as Record<string, unknown>).skipToFullTime = skipToFullTime;
  (window as unknown as Record<string, unknown>).finishMatch = () => {
    if (completeCalled) return;
    completeCalled = true;

    if (timerId) { clearInterval(timerId); timerId = null; }
    if (countdownTimerId) { clearInterval(countdownTimerId); countdownTimerId = null; }
    flushPending();
    G.matchInProgress = false;

    exitImmersiveMode();

    const pt = G.teams[G.playerTeamId!];
    if (pt) {
      for (const p of pt.players) {
        p.subbedIn = false;
      }
    }

    options.onComplete();
  };

  /* Mark match as in progress and start the ticker */
  G.matchInProgress = true;
  renderSpeedControls();
  refreshStats(0);
  startTicker();
}
