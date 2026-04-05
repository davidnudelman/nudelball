/**
 * match-animation.ts — Minute-by-minute animated match simulation.
 *
 * Drives the match view UI with a tick-based animation loop:
 *   - Configurable speed: 1x (500ms), 2x (250ms), 3x (125ms) per tick
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
} from '../ui/views/match-view';
import type { RivalResult } from '../ui/views/match-view';
import { getCoachComment } from '../data/coach-comments';
import { teamLabel } from '../utils/helpers';
import { SFX } from '../audio/sfx';
import { t } from '../data/i18n';

/** Speed presets: tick interval in ms */
const SPEED_PRESETS: Record<string, number> = {
  '1x': 500,
  '2x': 250,
  '3x': 125,
};

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
  let isPaused = false;
  let timerId: ReturnType<typeof setInterval> | null = null;
  let countdownTimerId: ReturnType<typeof setInterval> | null = null;
  let currentSpeed = '1x';
  let tickMs = SPEED_PRESETS['1x'];

  /* Play kick-off whistle */
  SFX.whistle();
  updateMatchTimer(0, t(settings, 'kickOff'));

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
        updateLiveScore(homeGoals, awayGoals);
        pulseScore();
        SFX.goal();
      } else if (ev.type === 'yellow') {
        SFX.yellowCard();
      } else if (ev.type === 'red') {
        SFX.redCard();
      }

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
      const icon = isPlayerGoal ? '\u26BD' : '\uD83D\uDFE0';
      /* Show narrative text if available, otherwise just scorer name */
      const narrativeText = ev.narrative
        ? `<div class="me-narrative">${ev.narrative}</div>`
        : '';
      html = `<div class="match-event goal ${sideClass}${isPlayerGoal ? ' player-goal' : ''}">` +
        `<span class="me-min">${ev.minute}'</span> ${icon} ` +
        `<b>${ev.scorer}</b> <span class="me-team">(${teamName})</span>` +
        `${narrativeText}</div>`;
    } else if (ev.type === 'yellow') {
      const narrativeText = ev.narrative
        ? `<div class="me-narrative">${ev.narrative}</div>`
        : '';
      html = `<div class="match-event card-event ${sideClass}">` +
        `<span class="me-min">${ev.minute}'</span> \uD83D\uDFE8 ` +
        `<b>${ev.playerName}</b> <span class="me-team">(${teamName})</span>` +
        `${narrativeText}</div>`;
    } else if (ev.type === 'red') {
      const narrativeText = ev.narrative
        ? `<div class="me-narrative">${ev.narrative}</div>`
        : '';
      html = `<div class="match-event card-event red ${sideClass}">` +
        `<span class="me-min">${ev.minute}'</span> \uD83D\uDFE5 ` +
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
    html += '<div class="match-summary-title">Match Summary</div>';

    /* Goal scorers */
    if (goalEvents.length > 0) {
      for (const g of goalEvents) {
        const team = g.teamId === fixture.home ? homeTeam : awayTeam;
        const icon = g.teamId === G.playerTeamId ? '\u26BD' : '\uD83D\uDFE0';
        html += `<div class="match-summary-row">${icon} <b>${g.scorer}</b> ${g.minute}' (${team.name})</div>`;
      }
    } else {
      html += '<div class="match-summary-row">No goals scored</div>';
    }

    /* Cards */
    if (cardEvents.length > 0) {
      for (const c of cardEvents) {
        const icon = c.type === 'red' ? '\uD83D\uDFE5' : '\uD83D\uDFE8';
        const team = c.teamId === fixture.home ? homeTeam : awayTeam;
        html += `<div class="match-summary-row">${icon} <b>${c.playerName}</b> ${c.minute}' (${team.name})</div>`;
      }
    }

    /* MOTM */
    if (fixture.motm) {
      html += `<div class="match-summary-row">\u2B50 <b>Man of the Match:</b> ${fixture.motm}</div>`;
    }

    /* Team talk effect */
    if (G.activeTeamTalk) {
      html += `<div class="match-summary-row">\uD83D\uDDE3\uFE0F Your team talk set the tone for this match</div>`;
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
    updateMatchTimer(45, 'Half Time');

    /* Determine score from player's perspective */
    const myGoals = isPlayerHome ? homeGoals : awayGoals;
    const theirGoals = isPlayerHome ? awayGoals : homeGoals;
    const comment = getCoachComment(myGoals, theirGoals);

    /* Show half-time event in feed */
    appendMatchEvent(
      `<div class="match-event ht-event">` +
      `<span class="me-min">45'</span> \uD83D\uDD14 <b>HALF TIME</b> ` +
      `${homeGoals} — ${awayGoals}</div>`,
    );

    /* Show coach comment, auto-sub button, and continue button */
    const htContainer = document.getElementById('ht-continue-container');
    if (htContainer) {
      const isNeutral = options.isNeutral ?? false;
      const subsLeft = 3 - G.matchSubs;
      const autoSubBtn = (!isNeutral && subsLeft > 0)
        ? `<button class="btn btn-secondary auto-sub-btn" onclick="autoSub()">` +
          `\uD83D\uDD04 Auto Sub (${subsLeft})</button>`
        : '';

      htContainer.style.display = 'block';
      htContainer.innerHTML =
        `<div class="ht-panel">` +
        `<div class="coach-comment">` +
        `<span class="coach-icon">\uD83E\uDDD1\u200D\uD83C\uDFEB</span> ` +
        `<span class="coach-text">"${comment}"</span>` +
        `</div>` +
        `<div class="ht-actions">` +
        `<div class="ht-label">\u23F8\uFE0F Half Time — Make substitutions or continue</div>` +
        `<div style="display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:8px">` +
        `<button class="btn btn-accent ht-continue-btn" onclick="continueMatch()">` +
        `\u25B6\uFE0F 2nd Half</button>` +
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
    updateMatchTimer(90, 'Full Time');
    updateProgressBar(100);

    /* Determine score from player's perspective */
    const myGoals = isPlayerHome ? homeGoals : awayGoals;
    const theirGoals = isPlayerHome ? awayGoals : homeGoals;
    const comment = getCoachComment(myGoals, theirGoals);

    /* Show full-time event */
    appendMatchEvent(
      `<div class="match-event ft-event">` +
      `<span class="me-min">90'</span> \uD83D\uDD14 <b>FULL TIME</b> ` +
      `${homeGoals} — ${awayGoals}</div>`,
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
        `<span class="coach-icon">\uD83E\uDDD1\u200D\uD83C\uDFEB</span> ` +
        `<span class="coach-text">"${comment}"</span>` +
        `</div>` +
        summaryHTML +
        `<button class="btn btn-success ht-continue-btn" style="margin-top:12px" ` +
        `onclick="finishMatch()">\u2705 Continue <span id="ft-countdown">(15s)</span></button>` +
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
   * Change the match animation speed.
   */
  function changeSpeed(speed: string): void {
    if (!SPEED_PRESETS[speed]) return;
    currentSpeed = speed;
    tickMs = SPEED_PRESETS[speed];

    /* Update active button state */
    document.querySelectorAll('.match-speed-btn').forEach(btn => {
      (btn as HTMLElement).classList.toggle('active', (btn as HTMLElement).dataset.speed === speed);
    });

    /* Restart ticker with new interval if running */
    if (timerId && !isPaused) {
      clearInterval(timerId);
      startTicker();
    }
  }

  /**
   * Start (or restart) the minute ticker interval.
   */
  function startTicker(): void {
    timerId = setInterval(() => {
      currentMin += 2; /* 2 game minutes per tick */

      if (currentMin > TOTAL_MINUTES) {
        /* Process any remaining events (e.g. stoppage-time goals at 91-93') */
        processEventsUpTo(currentMin);
        showFullTime();
        return;
      }

      /* Half-time pause */
      if (currentMin >= HALF_TIME && currentMin < HALF_TIME + 2 && !isPaused) {
        /* Process events up to minute 45 first */
        processEventsUpTo(HALF_TIME);
        showHalfTime();
        return;
      }

      /* Update timer and progress bar */
      const half = currentMin <= 45 ? '1st Half' : '2nd Half';
      updateMatchTimer(currentMin, half);
      updateProgressBar((currentMin / TOTAL_MINUTES) * 100);

      /* Process events for this minute */
      processEventsUpTo(currentMin);

      /* Update rival results */
      if (options.rivalResults) {
        updateRivalResults(options.rivalResults, currentMin);
      }
    }, tickMs);
  }

  /* Track whether onComplete has already been called to prevent double-fire */
  let completeCalled = false;

  /* Expose continue/finish/speed functions on window for onclick handlers */
  (window as unknown as Record<string, unknown>).continueMatch = continueMatch;
  (window as unknown as Record<string, unknown>).changeMatchSpeed = changeSpeed;
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
  startTicker();
}
