/**
 * match-animation.ts — Minute-by-minute animated match simulation.
 *
 * Drives the match view UI with a tick-based animation loop:
 *   - 1 real second = 2 game minutes (45 seconds per half)
 *   - Pause at half-time for substitutions and a coach comment
 *   - Show events (goals, cards) as they happen in real-time
 *   - Display rival match results with live score updates
 *   - Coach comment at half-time and full-time based on current score
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

/** Milliseconds per tick (1 second = 2 game minutes) */
const TICK_MS = 500;

/** Total game minutes (90) */
const TOTAL_MINUTES = 90;

/** Half-time minute */
const HALF_TIME = 45;

/**
 * Options for the animated match.
 */
export interface AnimatedMatchOptions {
  /** Whether this is a cup final */
  isCupFinal?: boolean;
  /** Pre-computed rival results to display live */
  rivalResults?: RivalResult[];
  /** Callback when the full animation completes */
  onComplete: () => void;
}

/**
 * Run an animated match simulation.
 *
 * The match result (fixture) must already be computed (homeGoals, awayGoals,
 * events populated). This function animates the display of that result
 * minute by minute with a 500ms tick interval (2 game minutes per second).
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

  /* Set up the match UI DOM */
  const sim = setupMatchUI(G, settings, homeTeam, awayTeam, {
    isCupFinal: options.isCupFinal,
    isNeutral: false,
  });
  if (!sim) {
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

  /* Play kick-off whistle */
  SFX.whistle();
  updateMatchTimer(0, t(settings, 'kickOff'));

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
   */
  function displayEvent(ev: MatchEvent, home: Team, away: Team): void {
    const team = ev.teamId === home.id ? home : away;
    const teamName = team.name;
    let html = '';

    if (ev.type === 'goal') {
      const isPlayerGoal = ev.teamId === G.playerTeamId;
      const icon = isPlayerGoal ? '\u26BD' : '\uD83D\uDFE0';
      html = `<div class="match-event goal${isPlayerGoal ? ' player-goal' : ''}">` +
        `<span class="me-min">${ev.minute}'</span> ${icon} ` +
        `<b>${ev.scorer}</b> <span class="me-team">(${teamName})</span></div>`;
    } else if (ev.type === 'yellow') {
      html = `<div class="match-event card-event">` +
        `<span class="me-min">${ev.minute}'</span> \uD83D\uDFE8 ` +
        `<b>${ev.playerName}</b> <span class="me-team">(${teamName})</span></div>`;
    } else if (ev.type === 'red') {
      html = `<div class="match-event card-event red">` +
        `<span class="me-min">${ev.minute}'</span> \uD83D\uDFE5 ` +
        `<b>${ev.playerName}</b> <span class="me-team">(${teamName})</span></div>`;
    }

    appendMatchEvent(html);
  }

  /**
   * Show the half-time break with coach comment and continue button.
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

    /* Show coach comment and continue button */
    const htContainer = document.getElementById('ht-continue-container');
    if (htContainer) {
      htContainer.style.display = 'block';
      htContainer.innerHTML =
        `<div class="ht-panel">` +
        `<div class="coach-comment">` +
        `<span class="coach-icon">\uD83E\uDDD1\u200D\uD83C\uDFEB</span> ` +
        `<span class="coach-text">"${comment}"</span>` +
        `</div>` +
        `<div class="ht-actions">` +
        `<div class="ht-label">\u23F8\uFE0F Half Time — Make substitutions or continue</div>` +
        `<button class="btn btn-accent ht-continue-btn" onclick="continueMatch()">` +
        `\u25B6\uFE0F 2nd Half</button>` +
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
   * Show the full-time summary.
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

    /* Show coach comment and back-to-dashboard button */
    const htContainer = document.getElementById('ht-continue-container');
    if (htContainer) {
      htContainer.style.display = 'block';
      htContainer.innerHTML =
        `<div class="ht-panel">` +
        `<div class="coach-comment">` +
        `<span class="coach-icon">\uD83E\uDDD1\u200D\uD83C\uDFEB</span> ` +
        `<span class="coach-text">"${comment}"</span>` +
        `</div>` +
        `<button class="btn btn-success ht-continue-btn" style="margin-top:12px" ` +
        `onclick="finishMatch()">\u2705 Continue</button>` +
        `</div>`;
    }
  }

  /**
   * Start (or restart) the minute ticker interval.
   */
  function startTicker(): void {
    timerId = setInterval(() => {
      currentMin += 2; /* 2 game minutes per tick */

      if (currentMin > TOTAL_MINUTES) {
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
    }, TICK_MS);
  }

  /* Expose continue/finish functions on window for onclick handlers */
  (window as unknown as Record<string, unknown>).continueMatch = continueMatch;
  (window as unknown as Record<string, unknown>).finishMatch = () => {
    /* Clean up */
    if (timerId) clearInterval(timerId);
    G.matchInProgress = false;

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
