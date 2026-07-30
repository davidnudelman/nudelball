/**
 * match-animation.ts — Minute-by-minute animated match simulation.
 *
 * Drives the match view UI with a tick-based animation loop:
 *   - 1 real second = 2 game minutes (500ms per tick)
 *   - Pause at half-time for substitutions, auto-sub, and a coach comment
 *   - Show events (goals, cards) as they happen in real-time
 *   - Display rival match results with live score updates
 *   - Coach comment at half-time and full-time based on current score
 *   - Full-screen immersive mode with nav locking
 *   - Goal pulse animation on score updates
 *   - Match summary card at full-time
 *
 * The match result is pre-computed by simulateMatch(), then this module
 * animates the reveal of events minute by minute. Substitutions made
 * at half-time affect stamina and bench streaks for subsequent matches.
 */

import type { Fixture, GameState, MatchEvent, Settings, Team } from '../types';
import {
  setupMatchUI,
  updateLiveScore,
  updateMatchTimer,
  updateProgressBar,
  appendMatchEvent,
  updateRivalResults,
  updateCadenceBadge,
  updatePitchState,
  updateTacticalPitch,
} from '../ui/views/match-view';
import type { MatchZone, PitchPoint, RivalResult } from '../ui/views/match-view';
import { icon } from '../assets/icons';
import { getCoachComment } from '../data/coach-comments';
import { teamLabel } from '../utils/helpers';
import { SFX } from '../audio/sfx';
import { t } from '../data/i18n';

/** Base milliseconds per tick at 1x speed (1 second = 2 game minutes) */
const BASE_TICK_MS = 500;
const TACTICAL_TICK_MS = 700;
const STANDARD_STEP_MINUTES = 2;
const TACTICAL_STEP_MINUTES = 1;

/** Total game minutes (90) */
const TOTAL_MINUTES = 90;

/** Half-time minute */
const HALF_TIME = 45;

/**
 * Options for the animated match.
 */
export interface AnimatedMatchOptions {
  /** @deprecated Cup system removed */
  isCupFinal?: boolean;
  /** Whether the player is a neutral spectator (not participating) */
  isNeutral?: boolean;
  /** Pre-computed rival results to display live */
  rivalResults?: RivalResult[];
  /** Callback when the full animation completes */
  onComplete: () => void;
}

export interface MatchPitchState {
  homePressure: number;
  awayPressure: number;
  zone: MatchZone;
}

export interface TacticalFrame {
  homeDots: PitchPoint[];
  awayDots: PitchPoint[];
  ball: PitchPoint;
  trail: PitchPoint[];
}

const HOME_ANCHORS: ReadonlyArray<PitchPoint> = [
  { x: 8, y: 28 },
  { x: 20, y: 10 }, { x: 20, y: 20 }, { x: 20, y: 36 }, { x: 20, y: 46 },
  { x: 34, y: 8 }, { x: 34, y: 22 }, { x: 34, y: 34 }, { x: 34, y: 48 },
  { x: 46, y: 20 }, { x: 46, y: 36 },
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Derive a lightweight momentum/zone state from scoreline, minute, and event bias.
 */
export function derivePitchState(
  homeGoals: number,
  awayGoals: number,
  minute: number,
  eventBias: number,
): MatchPitchState {
  const scoreBias = (homeGoals - awayGoals) * 12;
  const timeBias = Math.sin(minute / 8) * 5;
  const combined = clamp(scoreBias + eventBias + timeBias, -42, 42);
  const homePressure = clamp(50 + combined, 10, 90);
  const awayPressure = 100 - homePressure;
  const zone: MatchZone = combined >= 14 ? 'away' : combined <= -14 ? 'home' : 'mid';
  return { homePressure, awayPressure, zone };
}

/**
 * Build a tactical frame: player dots, ball location, and a short trail.
 */
export function deriveTacticalFrame(
  minute: number,
  zone: MatchZone,
  homePressure: number,
  eventBias: number,
  previousTrail: PitchPoint[],
): TacticalFrame {
  const pressureShift = clamp((homePressure - 50) / 3, -9, 9);
  const zoneBias = zone === 'away' ? 8 : zone === 'home' ? -8 : 0;
  const wave = Math.sin((minute + eventBias) / 5);

  const homeDots = HOME_ANCHORS.map((anchor, idx) => {
    const verticalBreathe = Math.sin((minute / 6) + idx) * 0.9;
    return {
      x: clamp(anchor.x + pressureShift + wave * 0.8, 2, 98),
      y: clamp(anchor.y + verticalBreathe, 2, 54),
    };
  });

  const awayDots = HOME_ANCHORS.map((anchor, idx) => {
    const mirroredX = 100 - anchor.x;
    const verticalBreathe = Math.cos((minute / 6) + idx) * 0.9;
    return {
      x: clamp(mirroredX - pressureShift - wave * 0.8, 2, 98),
      y: clamp(anchor.y + verticalBreathe, 2, 54),
    };
  });

  const ball = {
    x: clamp(50 + pressureShift * 0.95 + zoneBias + (Math.sin((minute + eventBias) / 3.8) * 2.6), 2, 98),
    y: clamp(28 + (Math.cos(minute / 3.1) * 10.5) + (Math.sin(eventBias / 6) * 2), 2, 54),
  };

  const trail = [...previousTrail, ball].slice(-10);
  return { homeDots, awayDots, ball, trail };
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
 * Run an animated match simulation.
 *
 * The match result (fixture) must already be computed (homeGoals, awayGoals,
 * events populated). This function animates the display of that result
 * minute by minute with a configurable tick interval.
 *
 * @param fixture  - The pre-computed fixture with results and events
 * @param G        - The game state
 * @param settings - User settings
 * @param options  - Animation options (callbacks, rival results)
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

  /* Enter immersive mode */
  enterImmersiveMode();

  /* Set up the match UI DOM */
  const sim = setupMatchUI(G, settings, homeTeam, awayTeam, {
    isCupFinal: options.isCupFinal,
    isNeutral: options.isNeutral ?? false,
  });
  if (!sim) {
    exitImmersiveMode();
    options.onComplete();
    return;
  }

  /* Sort events by minute for ordered display */
  const events = [...fixture.events].sort((a, b) => a.minute - b.minute);

  /* Track displayed events and running score */
  let eventIdx = 0;
  let currentMin = 0;
  let homeGoals = 0;
  let awayGoals = 0;
  let currentSpeed = settings.matchSpeed || 1;
  let cadenceMode: 'standard' | 'tactical' = 'standard';
  let isPaused = false;
  let timerId: ReturnType<typeof setInterval> | null = null;
  let countdownTimerId: ReturnType<typeof setInterval> | null = null;
  let eventBias = 0;
  let ballTrail: PitchPoint[] = [];

  /* Play kick-off whistle */
  SFX.whistle();
  updateMatchTimer(0, t(settings, 'kickOff'));
  updatePitchState(50, 50, 'mid');
  updateCadenceBadge(t(settings, 'standardCadence'));
  const initialFrame = deriveTacticalFrame(0, 'mid', 50, 0, []);
  ballTrail = initialFrame.trail;
  updateTacticalPitch(initialFrame.homeDots, initialFrame.awayDots, initialFrame.ball, initialFrame.trail);

  function speedTickMs(): number {
    if (cadenceMode === 'tactical') return TACTICAL_TICK_MS;
    return Math.max(90, Math.round(BASE_TICK_MS / currentSpeed));
  }

  function minuteStep(): number {
    return cadenceMode === 'tactical' ? TACTICAL_STEP_MINUTES : STANDARD_STEP_MINUTES;
  }

  function updateSpeedControlsUI(): void {
    document.querySelectorAll('.match-speed-btn').forEach((btn) => {
      const el = btn as HTMLButtonElement;
      el.classList.toggle('active', Number(el.dataset.speed) === currentSpeed);
      el.disabled = cadenceMode === 'tactical';
    });
    const skipHalfBtn = document.getElementById('match-skip-ht') as HTMLButtonElement | null;
    if (skipHalfBtn) skipHalfBtn.disabled = currentMin >= HALF_TIME;
    const cadenceBtn = document.getElementById('match-cadence-btn') as HTMLButtonElement | null;
    if (cadenceBtn) {
      cadenceBtn.classList.toggle('active', cadenceMode === 'tactical');
      cadenceBtn.textContent = cadenceMode === 'tactical'
        ? t(settings, 'tacticalCadence')
        : t(settings, 'standardCadence');
    }
  }

  function setMatchSpeed(speed: number): void {
    if (speed !== 1 && speed !== 2 && speed !== 4) return;
    if (cadenceMode === 'tactical') {
      cadenceMode = 'standard';
      updateCadenceBadge(t(settings, 'standardCadence'));
    }
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

  function toggleMatchCadence(): void {
    cadenceMode = cadenceMode === 'standard' ? 'tactical' : 'standard';
    updateCadenceBadge(t(settings, cadenceMode === 'tactical' ? 'tacticalCadence' : 'standardCadence'));
    updateSpeedControlsUI();
    if (timerId && !isPaused) {
      clearInterval(timerId);
      startTicker();
    }
  }

  function skipToHalfTime(): void {
    if (currentMin >= HALF_TIME) return;
    if (timerId) clearInterval(timerId);
    processEventsUpTo(HALF_TIME);
    currentMin = HALF_TIME;
    updateProgressBar((currentMin / TOTAL_MINUTES) * 100);
    const pitchState = derivePitchState(homeGoals, awayGoals, currentMin, eventBias);
    updatePitchState(pitchState.homePressure, pitchState.awayPressure, pitchState.zone);
    const frame = deriveTacticalFrame(currentMin, pitchState.zone, pitchState.homePressure, eventBias, ballTrail);
    ballTrail = frame.trail;
    updateTacticalPitch(frame.homeDots, frame.awayDots, frame.ball, frame.trail);
    showHalfTime();
    updateSpeedControlsUI();
  }

  function skipToFullTime(): void {
    if (currentMin >= TOTAL_MINUTES) return;
    if (timerId) clearInterval(timerId);
    processEventsUpTo(TOTAL_MINUTES);
    currentMin = TOTAL_MINUTES;
    const pitchState = derivePitchState(homeGoals, awayGoals, currentMin, eventBias);
    updatePitchState(pitchState.homePressure, pitchState.awayPressure, pitchState.zone);
    const frame = deriveTacticalFrame(currentMin, pitchState.zone, pitchState.homePressure, eventBias, ballTrail);
    ballTrail = frame.trail;
    updateTacticalPitch(frame.homeDots, frame.awayDots, frame.ball, frame.trail);
    showFullTime();
    updateSpeedControlsUI();
  }

  function renderSpeedControls(): void {
    const progress = document.querySelector('.match-progress');
    if (!progress || !progress.parentElement) return;
    const controls = document.createElement('div');
    controls.className = 'match-speed-controls';
    controls.innerHTML =
      `<span class="mp-label">${t(settings, 'matchSpeed')}</span>` +
      `<button class="btn btn-secondary match-speed-btn" data-speed="1" onclick="setMatchSpeed(1)">1x</button>` +
      `<button class="btn btn-secondary match-speed-btn" data-speed="2" onclick="setMatchSpeed(2)">2x</button>` +
      `<button class="btn btn-secondary match-speed-btn" data-speed="4" onclick="setMatchSpeed(4)">4x</button>` +
      `<button class="btn btn-secondary match-cadence-btn" id="match-cadence-btn" onclick="toggleMatchCadence()">${t(settings, 'standardCadence')}</button>` +
      `<button class="btn btn-secondary match-skip-btn" id="match-skip-ht" onclick="skipToHalfTime()">${t(settings, 'skipHalf')}</button>` +
      `<button class="btn btn-secondary match-skip-btn" onclick="skipToFullTime()">${t(settings, 'skipFull')}</button>`;
    progress.parentElement.insertBefore(controls, progress.nextSibling);
    updateSpeedControlsUI();
  }

  /**
   * Trigger a pulse animation on the live score element.
   */
  function pulseScore(): void {
    const scoreEl = document.getElementById('live-score');
    if (scoreEl) {
      scoreEl.classList.remove('score-pulse');
      /* Force reflow to restart animation */
      void scoreEl.offsetWidth;
      scoreEl.classList.add('score-pulse');
    }
  }

  /**
   * Process all events that occur at or before the given minute.
   */
  function processEventsUpTo(minute: number): void {
    while (eventIdx < events.length && events[eventIdx].minute <= minute) {
      const ev = events[eventIdx];
      displayEvent(ev, homeTeam, awayTeam);

      /* Update running score */
      if (ev.type === 'goal') {
        if (ev.teamId === fixture.home) homeGoals++;
        else awayGoals++;
        eventBias += ev.teamId === fixture.home ? 10 : -10;
        updateLiveScore(homeGoals, awayGoals);
        pulseScore();
        SFX.goal();
      } else if (ev.type === 'yellow') {
        eventBias += ev.teamId === fixture.home ? 3 : -3;
        SFX.yellowCard();
      } else if (ev.type === 'red') {
        eventBias += ev.teamId === fixture.home ? 8 : -8;
        SFX.redCard();
      }

      const pitchState = derivePitchState(homeGoals, awayGoals, currentMin, eventBias);
      updatePitchState(pitchState.homePressure, pitchState.awayPressure, pitchState.zone);
      const frame = deriveTacticalFrame(currentMin, pitchState.zone, pitchState.homePressure, eventBias, ballTrail);
      ballTrail = frame.trail;
      updateTacticalPitch(frame.homeDots, frame.awayDots, frame.ball, frame.trail);

      eventIdx++;
    }
  }

  /**
   * Format and append a match event to the events feed.
   * Shows rich narratives when available.
   */
  function displayEvent(ev: MatchEvent, home: Team, away: Team): void {
    const isHome = ev.teamId === home.id;
    const team = isHome ? home : away;
    const teamName = team.name;
    const sideClass = isHome ? 'me-home' : 'me-away';
    let html = '';

    if (ev.type === 'goal') {
      const isPlayerGoal = ev.teamId === G.playerTeamId;
      const goalIcon = `<span class="inline-icon">${icon('ball', 14)}</span>`;
      /* Show narrative text if available, otherwise just scorer name */
      const narrativeText = ev.narrative
        ? `<div class="me-narrative">${ev.narrative}</div>`
        : '';
      html = `<div class="match-event goal ${sideClass}${isPlayerGoal ? ' player-goal' : ''}">` +
        `<span class="me-min">${ev.minute}'</span> ${goalIcon} ` +
        `<b>${ev.scorer}</b> <span class="me-team">(${teamName})</span>` +
        `${narrativeText}</div>`;
    } else if (ev.type === 'yellow') {
      const narrativeText = ev.narrative
        ? `<div class="me-narrative">${ev.narrative}</div>`
        : '';
      html = `<div class="match-event card-event ${sideClass}">` +
        `<span class="me-min">${ev.minute}'</span> <span class="card-rect yellow"></span> ` +
        `<b>${ev.playerName}</b> <span class="me-team">(${teamName})</span>` +
        `${narrativeText}</div>`;
    } else if (ev.type === 'red') {
      const narrativeText = ev.narrative
        ? `<div class="me-narrative">${ev.narrative}</div>`
        : '';
      html = `<div class="match-event card-event red ${sideClass}">` +
        `<span class="me-min">${ev.minute}'</span> <span class="card-rect red"></span> ` +
        `<b>${ev.playerName}</b> <span class="me-team">(${teamName})</span>` +
        `${narrativeText}</div>`;
    }

    appendMatchEvent(html);
  }

  /**
   * Build a match summary HTML string for full-time display.
   */
  function buildMatchSummary(): string {
    const goalEvents = events.filter(e => e.type === 'goal');
    const cardEvents = events.filter(e => e.type === 'yellow' || e.type === 'red');

    let html = '<div class="match-summary">';
    html += `<div class="match-summary-title">${t(settings, 'matchSummary')}</div>`;

    /* Goal scorers */
    if (goalEvents.length > 0) {
      const goalIcon = `<span class="inline-icon">${icon('ball', 14)}</span>`;
      for (const g of goalEvents) {
        const team = g.teamId === fixture.home ? homeTeam : awayTeam;
        html += `<div class="match-summary-row">${goalIcon} <b>${g.scorer}</b> ${g.minute}' (${team.name})</div>`;
      }
    } else {
      html += `<div class="match-summary-row">${t(settings, 'noGoalsScored')}</div>`;
    }

    /* Cards */
    if (cardEvents.length > 0) {
      for (const c of cardEvents) {
        const cRect = c.type === 'red' ? '<span class="card-rect red"></span>' : '<span class="card-rect yellow"></span>';
        const team = c.teamId === fixture.home ? homeTeam : awayTeam;
        html += `<div class="match-summary-row">${cRect} <b>${c.playerName}</b> ${c.minute}' (${team.name})</div>`;
      }
    }

    /* MOTM */
    if (fixture.motm) {
      html += `<div class="match-summary-row"><span class="inline-icon">${icon('star', 14)}</span> <b>${t(settings, 'manOfTheMatch')}:</b> ${fixture.motm}</div>`;
    }

    /* Team talk effect */
    if (G.activeTeamTalk) {
      html += `<div class="match-summary-row"><span class="inline-icon">${icon('users', 14)}</span> ${t(settings, 'teamTalkImpact')}</div>`;
    }

    html += '</div>';
    return html;
  }

  /**
   * Show the half-time break with coach comment, auto-sub, and continue button.
   */
  function showHalfTime(): void {
    isPaused = true;
    if (timerId) clearInterval(timerId);

    SFX.whistle();
    updateMatchTimer(45, t(settings, 'halfTime'));

    /* Determine score from player's perspective */
    const myGoals = isPlayerHome ? homeGoals : awayGoals;
    const theirGoals = isPlayerHome ? awayGoals : homeGoals;
    const comment = getCoachComment(myGoals, theirGoals);

    /* Show half-time event in feed */
    appendMatchEvent(
      `<div class="match-event ht-event">` +
      `<span class="me-min">45'</span> <span class="inline-icon">${icon('clock', 14)}</span> <b>HALF TIME</b> ` +
      `${homeGoals} &mdash; ${awayGoals}</div>`,
    );

    /* Show coach comment, auto-sub button, and continue button */
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
        `<div style="display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:8px">` +
        `<button class="btn btn-accent ht-continue-btn btn-has-icon" onclick="continueMatch()">` +
        `<span class="btn-icon">${icon('arrowRight', 14)}</span> ${t(settings, 'continueMatch')}</button>` +
        autoSubBtn +
        `</div>` +
        `</div>` +
        `</div>`;
    }
  }

  /**
   * Resume the match after half-time.
   */
  function continueMatch(): void {
    isPaused = false;

    /* Hide the half-time panel */
    const htContainer = document.getElementById('ht-continue-container');
    if (htContainer) {
      htContainer.style.display = 'none';
      htContainer.innerHTML = '';
    }

    /* Update subs remaining display (in case subs were made) */
    const subsRemaining = document.getElementById('subs-remaining');
    if (subsRemaining) {
      subsRemaining.textContent = String(3 - G.matchSubs);
    }

    SFX.whistle();
    startTicker();
  }

  /**
   * Show the full-time summary with match summary card.
   */
  function showFullTime(): void {
    if (timerId) clearInterval(timerId);

    SFX.whistle();
    updateMatchTimer(90, t(settings, 'fullTime'));
    updateProgressBar(100);

    /* Determine score from player's perspective */
    const myGoals = isPlayerHome ? homeGoals : awayGoals;
    const theirGoals = isPlayerHome ? awayGoals : homeGoals;
    const comment = getCoachComment(myGoals, theirGoals);

    /* Show full-time event */
    appendMatchEvent(
      `<div class="match-event ft-event">` +
      `<span class="me-min">90'</span> <span class="inline-icon">${icon('clock', 14)}</span> <b>FULL TIME</b> ` +
      `${homeGoals} &mdash; ${awayGoals}</div>`,
    );

    /* Play crowd cheer if player won */
    if (myGoals > theirGoals) {
      SFX.cheer();
    }

    /* Show final rival results */
    if (options.rivalResults) {
      updateRivalResults(options.rivalResults, 90);
    }

    /* Build match summary */
    const summaryHTML = buildMatchSummary();

    /* Show coach comment, match summary, and back-to-dashboard button with auto-exit countdown */
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
        `<button class="btn btn-success ht-continue-btn btn-has-icon" style="margin-top:12px" ` +
        `onclick="finishMatch()"><span class="btn-icon">${icon('check', 14)}</span> ${t(settings, 'continueLabel')} <span id="ft-countdown">(15s)</span></button>` +
        `</div>`;
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
        /* Auto-finish the match */
        const finishFn = (window as unknown as Record<string, unknown>).finishMatch as (() => void) | undefined;
        if (finishFn) finishFn();
      }
    }, 1000);
  }

  /**
   * Start (or restart) the minute ticker interval.
   */
  function startTicker(): void {
    timerId = setInterval(() => {
      const prevMin = currentMin;
      currentMin += minuteStep();

      if (currentMin > TOTAL_MINUTES) {
        /* Process any remaining events (e.g. stoppage-time goals at 91-93') */
        processEventsUpTo(currentMin);
        showFullTime();
        return;
      }

      /* Half-time pause */
      if (prevMin < HALF_TIME && currentMin >= HALF_TIME && !isPaused) {
        /* Process events up to minute 45 first */
        processEventsUpTo(HALF_TIME);
        currentMin = HALF_TIME;
        const halfFrame = deriveTacticalFrame(currentMin, 'mid', 50, eventBias, ballTrail);
        ballTrail = halfFrame.trail;
        updateTacticalPitch(halfFrame.homeDots, halfFrame.awayDots, halfFrame.ball, halfFrame.trail);
        showHalfTime();
        return;
      }

      /* Update timer and progress bar */
      const half = currentMin <= 45 ? t(settings, 'firstHalf') : t(settings, 'secondHalf');
      updateMatchTimer(currentMin, half);
      updateProgressBar((currentMin / TOTAL_MINUTES) * 100);
      eventBias *= 0.82;

      /* Process events for this minute */
      processEventsUpTo(currentMin);

      const pitchState = derivePitchState(homeGoals, awayGoals, currentMin, eventBias);
      updatePitchState(pitchState.homePressure, pitchState.awayPressure, pitchState.zone);
      const frame = deriveTacticalFrame(currentMin, pitchState.zone, pitchState.homePressure, eventBias, ballTrail);
      ballTrail = frame.trail;
      updateTacticalPitch(frame.homeDots, frame.awayDots, frame.ball, frame.trail);

      /* Update rival results */
      if (options.rivalResults) {
        updateRivalResults(options.rivalResults, currentMin);
      }
    }, speedTickMs());
  }

  /* Track whether onComplete has already been called to prevent double-fire */
  let completeCalled = false;

  /* Expose continue/finish functions on window for onclick handlers */
  (window as unknown as Record<string, unknown>).continueMatch = continueMatch;
  (window as unknown as Record<string, unknown>).setMatchSpeed = setMatchSpeed;
  (window as unknown as Record<string, unknown>).toggleMatchCadence = toggleMatchCadence;
  (window as unknown as Record<string, unknown>).skipToHalfTime = skipToHalfTime;
  (window as unknown as Record<string, unknown>).skipToFullTime = skipToFullTime;
  (window as unknown as Record<string, unknown>).finishMatch = () => {
    /* Prevent double-fire using local flag (more reliable than matchInProgress) */
    if (completeCalled) return;
    completeCalled = true;

    /* Clean up all timers */
    if (timerId) { clearInterval(timerId); timerId = null; }
    if (countdownTimerId) { clearInterval(countdownTimerId); countdownTimerId = null; }
    G.matchInProgress = false;

    /* Exit immersive mode */
    exitImmersiveMode();

    /* Clear subbedIn flags */
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
  startTicker();
}
