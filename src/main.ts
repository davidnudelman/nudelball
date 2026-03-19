/**
 * main.ts -- Sole entry point for the Nudelball Vite application.
 *
 * This module bootstraps the entire game by:
 *   1. Importing global CSS for Vite bundling.
 *   2. Importing all game modules and wiring them together.
 *   3. Creating the default settings, loading from localStorage, and applying the theme.
 *   4. Registering all view renderers with nav.ts's `registerViewRenderers()`.
 *   5. Initialising the play button with G and settings refs.
 *   6. Booting the welcome screen with proper callbacks.
 *   7. Exposing global `window` functions for HTML inline onclick handlers.
 *   8. Wiring up the play-match / advance-week game loop.
 *   9. Initialising keyboard shortcuts.
 *  10. Injecting the difficulty settings row.
 *
 * Every function referenced by an inline `onclick` handler in index.html
 * (or in dynamically generated HTML) is exposed on the `window` object here.
 *
 * The file is the ONLY script tag in `index.html` -- all game modules are
 * reached through this single entry point via ES module imports.
 */

// ===========================================================================
// 1. CSS IMPORT (processed by Vite)
// ===========================================================================

import './styles/main.css';

// ===========================================================================
// 2. TYPE IMPORTS
// ===========================================================================

import type {
  Difficulty,
  GameState,
  Language,
  Settings,
  StrengthDisplay,
  TacticId,
  Theme,
  TrainingFocus,
} from './types';

// ===========================================================================
// 3. GAME STATE & SAVE SYSTEM
// ===========================================================================

import { G, initNewGame } from './state/game-state';
import {
  saveGame,
  loadGame,
  deleteSave,
  downloadSave,
  importSave,
  saveToSlot,
  loadFromSlot,
  deleteSlot,
  createImportHandler,
} from './state/save-manager';

// ===========================================================================
// 4. ENGINE MODULES
// ===========================================================================

import { generateCupBracket, simulateCupWeek, resolveCupFinal } from './engine/cup';
import {
  simulateMatch,
  autoSelectAI,
  teamStrength as engineTeamStrength,
  applyStaminaChanges,
  updatePlayerForm,
  updateMatchStats,
  generateCardEvents,
  applyCardSuspensions,
  getTeamPowerLevels as engineGetTeamPowerLevels,
} from './engine/match';
import { endOfSeason, startNewSeason, calculateSeasonAwards, assignRivals } from './engine/season';
import { decayMorale } from './engine/match';
import { applyTraining } from './engine/training';
import {
  signPlayer as engineSignPlayer,
  sellPlayer as engineSellPlayer,
  buyFromTeam as engineBuyFromTeam,
} from './engine/transfers';
import { makePlayer, genName, genSkill } from './engine/player';

// ===========================================================================
// 5. UI: NAVIGATION & COMPONENTS
// ===========================================================================

import {
  showView,
  registerViewRenderers,
  refreshAll,
  enterGame,
  updateTopBar,
  updatePlayBtn,
  initPlayBtn,
  applyLanguage,
  updateVolumeUI,
} from './ui/components/nav';
import {
  bootWelcome,
  selectTeam as welcomeSelectTeam,
  renderSaveSlots,
} from './ui/components/welcome';
import {
  loadSettings,
  saveSettings,
  applyTheme,
  toggleSettings,
  setTheme as settingsSetTheme,
  setLang as settingsSetLang,
  setStrengthDisplay as settingsSetStrengthDisplay,
  setVolume as settingsSetVolume,
  toggleMute as settingsToggleMute,
  setDifficulty as settingsSetDifficulty,
  initSettingsCallbacks,
  updateSettingsUI,
  injectDifficultyRow,
  getDifficultyMultipliers,
} from './ui/components/settings';
import { toggleHelp } from './ui/components/help';
import { toggleChangelog, initVersionLabels } from './ui/components/changelog';

// ===========================================================================
// 6. UI: VIEW RENDERERS
// ===========================================================================

import { renderDashboard, buildTableHTML, getSortedDiv } from './ui/views/dashboard';
import { renderSquad, playerOvr, getTeamPowerLevels, getFormationCounts } from './ui/views/squad';
import { renderTableView } from './ui/views/table';
import { renderCalendar } from './ui/views/calendar';
import { renderScorers } from './ui/views/scorers';
import { renderMarket } from './ui/views/market';
import { renderHistory } from './ui/views/history';
import { renderTrophyRoom } from './ui/views/trophy-room';
import { renderTeamProfile, openTeamProfile } from './ui/views/team-profile';
import { renderPlayerProfile, showPlayerProfile } from './ui/views/player-profile';
import { renderCup } from './ui/views/cup-view';

import { runAnimatedMatch } from './engine/match-animation';
import type { RivalResult } from './ui/views/match-view';

// ===========================================================================
// 7. AUDIO
// ===========================================================================

import { SFX } from './audio/sfx';

// ===========================================================================
// 8. KEYBOARD SHORTCUTS
// ===========================================================================

import { initKeyboardShortcuts } from './ui/keyboard';

// ===========================================================================
// 9. DATA & CONFIG
// ===========================================================================

import { DAD_JOKES } from './data/jokes';
import { t } from './data/i18n';
import {
  FORMATIONS,
  DEFAULT_FORMATION_IDX,
  SEASON_WEEKS,
  TOTAL_SEASON_WEEKS,
  CUP_WEEKS,
  SQUAD_MAX,
  SQUAD_MIN,
} from './config';
import { teamLabel } from './utils/helpers';

// ===========================================================================
// 10. TROPHY ROOM needs defaultRecords from engine/season
// ===========================================================================

import { defaultRecords } from './engine/season';

// ===========================================================================
// SETTINGS SINGLETON
// ===========================================================================

/**
 * The application-wide settings object.
 *
 * Initialised with sensible defaults, then hydrated from localStorage
 * via `loadSettings()`. This object is passed by reference to every
 * module that needs it, so mutations are visible everywhere.
 */
const settings: Settings = {
  theme: 'dark',
  lang: 'en',
  strengthDisplay: 'none',
  volume: 0.5,
  muted: false,
  difficulty: 'normal',
};

// ===========================================================================
// HELPER: teamLabelWithTrophies
// ===========================================================================

/**
 * Render a team label (name plate) with trophy count icons appended.
 *
 * Used by the dashboard and league table views to show at-a-glance
 * trophy counts next to team names.
 *
 * @param tm - The team object (needs name, c1, c2, trophies).
 * @returns HTML string with the team plate and optional trophy badges.
 */
function teamLabelWithTrophies(
  tm: { name: string; c1: string; c2: string; trophies?: Array<{ type: string; season: number }> },
): string {
  let label = teamLabel(tm);
  if (tm.trophies && tm.trophies.length) {
    const cups = tm.trophies.filter(tr => tr.type === 'cup').length;
    const golds = tm.trophies.filter(tr => tr.type === 'gold_trophy').length;
    if (golds) label += ` <span class="trophy" style="font-size:.8em">\u{1F3C6}\u00D7${golds}</span>`;
    if (cups) label += ` <span class="trophy" style="font-size:.8em">\u{1F3C6}\u00D7${cups}</span>`;
  }
  return label;
}

// ===========================================================================
// VIEW RENDERER WRAPPERS
// ===========================================================================

/**
 * Each view renderer requires specific parameters (G, settings, callbacks).
 * We wrap them in zero-arg functions so they can be registered with
 * nav.ts's view renderer system and called dynamically via `showView()`.
 */

/** Render the dashboard and sync top bar + play button. */
function wrappedRenderDashboard(): void {
  renderDashboard(G, settings, teamLabelWithTrophies);
  updateTopBar(G, settings);
  updatePlayBtn();
}

/** Render the squad management view. */
function wrappedRenderSquad(): void {
  renderSquad(G, settings, {
    togglePlayer: 'togglePlayer',
    changePos: 'changePos',
    showPlayerProfile: 'showPlayerProfile',
    setTrainingFocus: 'setTrainingFocus',
    onFormationChange: 'onFormationChange',
    saveGame: 'saveGame',
  }, DAD_JOKES);
  updatePlayBtn();
}

/** Render the league table view. */
function wrappedRenderTable(): void {
  renderTableView(G, settings, teamLabelWithTrophies);
}

/** Render the fixture calendar view. */
function wrappedRenderCalendar(): void {
  renderCalendar(G, settings);
}

/** Render the top scorers view. */
function wrappedRenderScorers(): void {
  renderScorers(G, settings);
}

/** Render the transfer market view. */
function wrappedRenderMarket(): void {
  renderMarket(G, settings);
}

/** Render the season history view. */
function wrappedRenderHistory(): void {
  renderHistory(G, settings);
}

/** Render the trophy room view. */
function wrappedRenderTrophyRoom(): void {
  renderTrophyRoom(G, settings, defaultRecords);
}

/** Render the team profile view. */
function wrappedRenderTeamProfile(): void {
  renderTeamProfile(G, settings);
}

/** Render the individual player profile view. */
function wrappedRenderPlayerProfile(): void {
  renderPlayerProfile(G, settings);
}

/** Render the cup competition view. */
function wrappedRenderCup(): void {
  renderCup(G, settings);
}

// ===========================================================================
// PLAY MATCH / ADVANCE WEEK
// ===========================================================================

/**
 * The main game-loop action: play one week's matches and advance the season.
 *
 * Handles three distinct phases:
 *
 *   1. **End of season** (week > TOTAL_SEASON_WEEKS) -- run end-of-season
 *      processing via `endOfSeason()`, show the season summary overlay,
 *      then let the player click through to `startNewSeason()`.
 *
 *   2. **Cup final week** (week > SEASON_WEEKS but <= TOTAL_SEASON_WEEKS) --
 *      simulate the cup final (instant sim) and advance past it.
 *
 *   3. **Regular week** -- simulate all league fixtures across all 4
 *      divisions for the current round, apply training, simulate any
 *      scheduled cup round, then advance the week counter.
 *
 * After every action the game is auto-saved and the UI is refreshed.
 */
function playMatch(): void {
  /* Don't start a new match while animation is running */
  if (G.matchInProgress) return;

  /* --- Phase 1: Season-end advancement --- */
  if (G.week > TOTAL_SEASON_WEEKS) {
    startNewSeason(G);
    saveGame();
    updateTopBar(G, settings);
    refreshAll();
    showView('dashboard');
    return;
  }

  const pt = G.teams[G.playerTeamId!];
  if (!pt) return;

  /* --- Validate squad selection --- */
  const sel = pt.players.filter(p => p.selected);
  if (sel.length < 11) return;
  if (!sel.some(p => (p.assignedPos || p.pos) === 'GK')) return;

  /* --- Phase 2: Cup-final-only week (league finished, cup final remains) --- */
  if (G.week > SEASON_WEEKS && G.week <= TOTAL_SEASON_WEEKS) {
    if (G.cup && G.cup.active) {
      const finalRoundIdx = G.cup.round;
      const finalRound = G.cup.rounds[finalRoundIdx];

      if (finalRound && finalRound.length > 0 && !finalRound[0].played) {
        const cupFinal = finalRound[0];
        const playerInFinal = cupFinal.home === G.playerTeamId || cupFinal.away === G.playerTeamId;

        /* Auto-select AI teams for cup final */
        const homeTeam = G.teams[cupFinal.home];
        const awayTeam = cupFinal.away != null ? G.teams[cupFinal.away] : null;
        if (homeTeam && homeTeam.id !== G.playerTeamId) autoSelectAI(homeTeam, G.playerTeamId!);
        if (awayTeam && awayTeam.id !== G.playerTeamId) autoSelectAI(awayTeam, G.playerTeamId!);

        if (playerInFinal && awayTeam) {
          /* Create a Fixture-like object for the animated match */
          const cupFixture: import('./types').Fixture = {
            home: cupFinal.home,
            away: cupFinal.away!,
            homeGoals: null,
            awayGoals: null,
            events: [],
          };

          /* Simulate the cup final result (pre-compute for animation) */
          const diffMult = getDifficultyMultipliers(settings);
          simulateMatch(cupFixture, G, { difficulty: diffMult.aiStrengthMult });

          /* Animate the cup final */
          showView('match');
          G.matchInProgress = true;

          runAnimatedMatch(cupFixture, G, settings, {
            rivalResults: [],
            onComplete: () => {
              /* Resolve the cup final and award the trophy */
              resolveCupFinal(G, cupFixture.homeGoals!, cupFixture.awayGoals!);

              /* Advance to end of season */
              G.week++;

              /* Run end-of-season processing */
              if (G.week > TOTAL_SEASON_WEEKS) {
                const result = endOfSeason(G);
                saveGame();
                refreshAll();
                showSeasonEndOverlay(result);
              } else {
                saveGame();
                refreshAll();
                showView('dashboard');
              }
            },
          });
          return;
        } else if (awayTeam) {
          /* Player not in the final — animate as neutral spectator */
          const cupFixtureNeutral: import('./types').Fixture = {
            home: cupFinal.home,
            away: cupFinal.away!,
            homeGoals: null,
            awayGoals: null,
            events: [],
          };

          const diffMultNeutral = getDifficultyMultipliers(settings);
          simulateMatch(cupFixtureNeutral, G, { difficulty: diffMultNeutral.aiStrengthMult });

          showView('match');
          G.matchInProgress = true;

          runAnimatedMatch(cupFixtureNeutral, G, settings, {
            isCupFinal: true,
            isNeutral: true,
            rivalResults: [],
            onComplete: () => {
              resolveCupFinal(G, cupFixtureNeutral.homeGoals!, cupFixtureNeutral.awayGoals!);

              G.week++;

              if (G.week > TOTAL_SEASON_WEEKS) {
                const result = endOfSeason(G);
                saveGame();
                refreshAll();
                showSeasonEndOverlay(result);
              } else {
                saveGame();
                refreshAll();
                showView('dashboard');
              }
            },
          });
          return;
        } else {
          /* No away team (shouldn't happen in a final) */
          if (cupFinal.away != null) {
            resolveCupFinal(G, 1, 0);
          }
        }
      }
    }

    G.week++;

    /* Check if season is now over */
    if (G.week > TOTAL_SEASON_WEEKS) {
      const result = endOfSeason(G);
      saveGame();
      refreshAll();
      showSeasonEndOverlay(result);
      return;
    }

    saveGame();
    refreshAll();
    showView('dashboard');
    return;
  }

  /* --- Phase 3: Regular match week --- */

  /* Transfer window reminder on week 1 — show once, then close on skip */
  if (G.week === 1 && G.transferWindow) {
    if (!G.transferReminderShown) {
      G.transferReminderShown = true;
      showView('market');
      renderMarket(G, settings, true);
      return;
    }
    G.transferWindow = false;
  }

  /* Auto-select AI teams before simulation */
  for (const tm of G.teams) {
    if (tm.id !== G.playerTeamId) {
      autoSelectAI(tm, G.playerTeamId!);
    }
  }

  /* Difficulty multiplier for AI strength */
  const diffMult = getDifficultyMultipliers(settings);

  /* Simulate all league fixtures for the current round across all divisions */
  const roundIdx = G.week - 1;
  let playerFixture: import('./types').Fixture | null = null;
  let playerFixtureDiv = 0;

  for (let d = 1; d <= 4; d++) {
    if (!G.fixtures[d] || !G.fixtures[d][roundIdx]) continue;
    for (const f of G.fixtures[d][roundIdx]) {
      if (f.homeGoals !== null) continue; /* Already played */

      /* Identify the player's fixture — simulate it but animate later */
      if (f.home === G.playerTeamId || f.away === G.playerTeamId) {
        playerFixture = f;
        playerFixtureDiv = d;
      }

      simulateMatch(f, G, {
        difficulty: diffMult.aiStrengthMult,
      });
    }
  }

  /* Simulate cup round if this is a cup week */
  if (CUP_WEEKS.includes(G.week)) {
    simulateCupWeek(G);
  }

  /* Apply weekly training for the player's squad */
  applyTraining(G, diffMult.trainingMult);

  /* Decay morale toward 0 for all teams (#4) */
  for (const tm of G.teams) {
    if (tm.div >= 1 && tm.div <= 4) decayMorale(tm);
  }

  /* If we have a player fixture, animate it before advancing the week */
  if (playerFixture) {
    /* Build rival results from same-division fixtures */
    const rivalResults: RivalResult[] = [];
    if (G.fixtures[playerFixtureDiv] && G.fixtures[playerFixtureDiv][roundIdx]) {
      for (const rf of G.fixtures[playerFixtureDiv][roundIdx]) {
        if (rf === playerFixture) continue;
        if (rf.homeGoals === null) continue;
        const ht = G.teams[rf.home];
        const at = G.teams[rf.away];
        if (!ht || !at) continue;

        /* Build goal events from the fixture events for the live ticker */
        const goalEvents = rf.events
          .filter(ev => ev.type === 'goal')
          .map(ev => ({ min: ev.minute, teamId: ev.teamId }));

        rivalResults.push({
          home: ht.name,
          away: at.name,
          homeC1: ht.c1,
          homeC2: ht.c2,
          awayC1: at.c1,
          awayC2: at.c2,
          finalH: rf.homeGoals!,
          finalA: rf.awayGoals!,
          goalEvents,
          homeId: ht.id,
          awayId: at.id,
        });
      }
    }

    /* Show the match view and run the animated simulation */
    showView('match');

    runAnimatedMatch(playerFixture, G, settings, {
      rivalResults,
      onComplete: () => {
        /* Advance week counter after animation finishes */
        G.week++;

        /* Close the transfer window after week 1 */
        if (G.week > 1) {
          G.transferWindow = false;
        }

        /* Check if the full season (league + cup) is now over */
        const cupStillPending = G.cup && G.cup.active;

        if (G.week > SEASON_WEEKS && !cupStillPending) {
          /* No cup final remaining — end season now */
          const result = endOfSeason(G);
          saveGame();
          refreshAll();
          showSeasonEndOverlay(result);
        } else {
          /* Auto-save and refresh UI */
          saveGame();
          refreshAll();
          showView('dashboard');
        }
      },
    });
    return;
  }

  /* No player fixture this week (shouldn't normally happen) — advance instantly */
  G.week++;

  /* Close the transfer window after week 1 */
  if (G.week > 1) {
    G.transferWindow = false;
  }

  /* Check if the full season (league + cup) is now over */
  const cupPending = G.cup && G.cup.active;

  if (G.week > SEASON_WEEKS && !cupPending) {
    const result = endOfSeason(G);
    saveGame();
    refreshAll();
    showSeasonEndOverlay(result);
  } else {
    /* Auto-save and refresh UI */
    saveGame();
    refreshAll();
    showView('dashboard');
  }
}

// ===========================================================================
// SEASON-END OVERLAY
// ===========================================================================

/**
 * Display the end-of-season summary overlay.
 *
 * Shows trophy awards, promotion/relegation moves, and a button
 * to advance to the next season.
 *
 * @param result - The return value from `endOfSeason()`.
 */
function showSeasonEndOverlay(result: ReturnType<typeof endOfSeason>): void {
  const overlay = document.getElementById('season-overlay');
  const box = document.getElementById('season-box');
  if (!overlay || !box) return;

  const pt = G.teams[G.playerTeamId!];
  let h = `<h2 style="font-family:'Oswald';color:var(--accent);text-align:center;margin-bottom:16px">${t(settings, 'seasonComplete', { season: G.season })}</h2>`;

  /* ---- Cup Winner (highest achievement, featured at the top) ---- */
  if (G.cup && G.cup.winner != null) {
    const cupWinner = G.teams[G.cup.winner];
    if (cupWinner) {
      h += `<div class="season-section season-cup-winner">` +
        `<div style="font-size:2.5rem;margin-bottom:4px">\u{1F3C6}</div>` +
        `<div style="font-family:'Oswald';font-size:1.1rem;text-transform:uppercase;letter-spacing:1px;color:var(--gold);margin-bottom:6px">Cup Winner</div>` +
        `<div>${teamLabel(cupWinner)}</div>` +
        `</div>`;
    }
  }

  /* ---- Top Goal Scorer ---- */
  const allScorers = Object.values(G.topScorers).sort((a, b) => b.goals - a.goals);
  if (allScorers.length && allScorers[0].goals > 0) {
    const top = allScorers[0];
    const scorerTeam = G.teams[top.teamId];
    h += `<div class="season-section" style="margin-bottom:12px">` +
      `<div style="font-size:1.4rem;margin-bottom:2px">\u{26BD}</div>` +
      `<div style="font-family:'Oswald';font-size:0.9rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-dim);margin-bottom:4px">Top Goal Scorer</div>` +
      `<div style="font-weight:700;font-size:1rem">${top.name} <span style="color:var(--accent)">(${top.goals} goals)</span></div>` +
      (scorerTeam ? `<div style="margin-top:2px">${teamLabel(scorerTeam)}</div>` : '') +
      `</div>`;
  }

  /* ---- Division Champions & Runners-up (top 2 per division) ---- */
  h += `<div class="season-section" style="margin-bottom:12px">` +
    `<div style="font-family:'Oswald';font-size:0.9rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-dim);margin-bottom:8px">League Results</div>`;
  for (let d = 1; d <= 4; d++) {
    const sorted = getSortedDiv(G, d);
    if (sorted.length < 2) continue;
    const icon1 = d <= 2 ? '\u{1F3C6}' : '\u{1F947}';
    const icon2 = '\u{1F948}';
    h += `<div style="margin-bottom:8px">` +
      `<div style="font-weight:700;font-size:0.82rem;color:var(--text-dim);margin-bottom:4px">Division ${d}</div>` +
      `<div style="padding:2px 0">${icon1} ${teamLabel(sorted[0])} <span style="font-size:0.78rem;color:var(--text-dim)">${sorted[0].seasonStats.pts} pts</span></div>` +
      `<div style="padding:2px 0">${icon2} ${teamLabel(sorted[1])} <span style="font-size:0.78rem;color:var(--text-dim)">${sorted[1].seasonStats.pts} pts</span></div>` +
      `</div>`;
  }
  h += `</div>`;

  /* ---- Personal Highlights (player's team) ---- */
  if (pt) {
    const st = pt.seasonStats;
    const gd = st.gf - st.ga;

    /* Determine player's fate: promoted, retained, or relegated */
    let fateIcon = '\u{2796}';
    let fateText = 'Retained';
    const playerMove = result.moves.find(m => m.team.id === G.playerTeamId);
    if (playerMove) {
      if (playerMove.type === 'promote') {
        fateIcon = '\u{2B06}\u{FE0F}';
        fateText = `Promoted to Division ${playerMove.to}`;
      } else if (playerMove.type === 'relegate') {
        fateIcon = '\u{2B07}\u{FE0F}';
        fateText = `Relegated to Division ${playerMove.to}`;
      } else if (playerMove.type === 'out') {
        fateIcon = '\u{274C}';
        fateText = 'Exited the league';
      }
    }

    /* Calculate total cash earned this season */
    let totalCash = 0;
    if (result.financialAwards) {
      for (const fa of result.financialAwards) {
        if (fa.team.id === G.playerTeamId && fa.type !== 'solidarityPaid') {
          totalCash += fa.amount;
        }
      }
    }

    h += `<div class="season-section season-personal">` +
      `<div style="font-family:'Oswald';font-size:0.9rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-dim);margin-bottom:8px">Your Season — ${teamLabel(pt)}</div>` +
      `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-bottom:8px">` +
      `<div class="stat-badge"><span class="sb-value">${st.pts}</span><span class="sb-label">Points</span></div>` +
      `<div class="stat-badge"><span class="sb-value">${st.w}-${st.d}-${st.l}</span><span class="sb-label">W-D-L</span></div>` +
      `<div class="stat-badge"><span class="sb-value">${st.gf}-${st.ga}</span><span class="sb-label">GF-GA</span></div>` +
      `<div class="stat-badge"><span class="sb-value">${gd >= 0 ? '+' : ''}${gd}</span><span class="sb-label">GD</span></div>` +
      `</div>` +
      `<div style="font-size:1rem;font-weight:700;margin-bottom:6px">${fateIcon} ${fateText}</div>` +
      (totalCash > 0 ? `<div style="font-size:0.88rem;color:var(--green);font-weight:600">\u{1F4B0} Season earnings: $${totalCash.toLocaleString()}</div>` : '') +
      `</div>`;
  }

  /* ---- Season Awards (#15) ---- */
  const awards = calculateSeasonAwards(G);
  if (awards.length > 0) {
    h += `<div class="season-section" style="margin-bottom:12px">` +
      `<div style="font-family:'Oswald';font-size:0.9rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-dim);margin-bottom:8px">${t(settings, 'seasonAwards')}</div>` +
      `<div class="awards-grid">`;
    for (const a of awards) {
      const typeLabel = a.type === 'goldenBoot' ? t(settings, 'goldenBootAward')
        : a.type === 'playerOfSeason' ? t(settings, 'playerOfSeasonAward')
        : a.type === 'bestYoung' ? t(settings, 'bestYoungAward')
        : a.type;
      h += `<div class="award-card">` +
        `<div class="aw-type">${typeLabel}</div>` +
        `<div class="aw-name">${a.playerName}</div>` +
        `<div class="aw-detail">${a.teamName} (${a.value} goals)</div>` +
        `</div>`;
    }
    h += `</div></div>`;
  }

  /* Start next season button */
  h += `<button class="btn btn-accent" style="width:100%;margin-top:12px;padding:14px;font-size:1.1rem" onclick="startNewSeasonAction()">${t(settings, 'startSeason', { season: G.season + 1 })}</button>`;

  box.innerHTML = h;
  overlay.style.display = 'flex';
}

/**
 * Start a new season when the player clicks the button on the
 * season-end overlay. Hides the overlay and transitions to the
 * new season's dashboard.
 */
function startNewSeasonAction(): void {
  const overlay = document.getElementById('season-overlay');
  if (overlay) overlay.style.display = 'none';

  startNewSeason(G);
  saveGame();
  updateTopBar(G, settings);
  refreshAll();
  showView('dashboard');
}

// ===========================================================================
// SQUAD INTERACTION HANDLERS
// ===========================================================================

/**
 * Auto-pick the best 11 players for the currently selected formation.
 *
 * Prioritises natural-position matches (with a large scoring bonus),
 * then falls back to out-of-position candidates if needed. Injured
 * and suspended players are excluded.
 */
function autoPick(): void {
  const pt = G.teams[G.playerTeamId!];
  if (!pt) return;

  const formIdx = G.selectedFormationIdx ?? DEFAULT_FORMATION_IDX;
  const formation = FORMATIONS[formIdx];

  /* Clear current selection */
  for (const p of pt.players) {
    p.selected = false;
    p.assignedPos = null;
  }

  /* Pick best available players for each formation slot */
  const posOrder: Array<{ pos: 'GK' | 'DEF' | 'MID' | 'STR'; count: number }> = [
    { pos: 'GK', count: formation.slots.GK },
    { pos: 'DEF', count: formation.slots.DEF },
    { pos: 'MID', count: formation.slots.MID },
    { pos: 'STR', count: formation.slots.STR },
  ];

  const selected = new Set<number>();

  for (const { pos, count } of posOrder) {
    /* Sort candidates: natural position first, then by skill */
    const candidates = pt.players
      .map((p, i) => ({ p, i }))
      .filter(({ p, i }) =>
        !selected.has(i) &&
        p.pos === pos &&
        p.injuredFor === 0 &&
        p.suspendedFor === 0
      )
      .sort((a, b) => b.p.skill - a.p.skill);

    for (let j = 0; j < count && j < candidates.length; j++) {
      const { p, i } = candidates[j];
      p.selected = true;
      p.assignedPos = pos;
      selected.add(i);
    }
  }

  /* Fill remaining slots with best available from any position */
  let totalSelected = selected.size;
  if (totalSelected < 11) {
    const remaining = pt.players
      .map((p, i) => ({ p, i }))
      .filter(({ p, i }) =>
        !selected.has(i) &&
        p.injuredFor === 0 &&
        p.suspendedFor === 0
      )
      .sort((a, b) => b.p.skill - a.p.skill);

    for (const { p, i } of remaining) {
      if (totalSelected >= 11) break;
      p.selected = true;
      p.assignedPos = p.pos;
      selected.add(i);
      totalSelected++;
    }
  }

  saveGame();
  wrappedRenderSquad();
  updatePlayBtn();
}

/**
 * Clear all player selections in the starting 11.
 */
function clearSelection(): void {
  const pt = G.teams[G.playerTeamId!];
  if (!pt) return;

  for (const p of pt.players) {
    p.selected = false;
    p.assignedPos = null;
  }

  saveGame();
  wrappedRenderSquad();
  updatePlayBtn();
}

/**
 * Toggle the squad sort mode between "by position" and "by overall rating".
 */
function toggleSort(): void {
  G.sortByPos = !G.sortByPos;
  saveGame();
  wrappedRenderSquad();
}

/**
 * Handle formation dropdown change from the squad view.
 *
 * Reads the selected index from the `#formation-select` element
 * and updates the game state.
 */
function onFormationChange(): void {
  const sel = document.getElementById('formation-select') as HTMLSelectElement | null;
  if (!sel) return;

  G.selectedFormationIdx = parseInt(sel.value, 10);
  saveGame();
  wrappedRenderSquad();
  updatePlayBtn();
}

/**
 * Toggle a player's selection in the starting 11.
 *
 * If toggling on, the player is assigned their natural position.
 * Injured and suspended players cannot be selected.
 *
 * @param idx   - Index into the player team's roster.
 * @param event - Optional DOM event (unused but matches HTML signature).
 */
function togglePlayer(idx: number, event?: Event): void {
  const pt = G.teams[G.playerTeamId!];
  if (!pt || !pt.players[idx]) return;

  const p = pt.players[idx];

  /* Cannot select injured or suspended players */
  if (p.injuredFor > 0 || p.suspendedFor > 0) return;

  if (p.selected) {
    p.selected = false;
    p.assignedPos = null;
  } else {
    /* Enforce maximum of 11 starters */
    const selCount = pt.players.filter(pl => pl.selected).length;
    if (selCount >= 11) return;
    p.selected = true;
    p.assignedPos = p.pos;
  }

  saveGame();
  wrappedRenderSquad();
  updatePlayBtn();
}

/**
 * Change a player's assigned tactical position.
 *
 * @param idx    - Index into the player team's roster.
 * @param newPos - The new position string ('GK', 'DEF', 'MID', 'STR').
 */
function changePos(idx: number, newPos: string): void {
  const pt = G.teams[G.playerTeamId!];
  if (!pt || !pt.players[idx]) return;

  pt.players[idx].assignedPos = newPos as 'GK' | 'DEF' | 'MID' | 'STR';
  saveGame();
  wrappedRenderSquad();
  updatePlayBtn();
}

/**
 * Handle team selection from the welcome screen team picker.
 *
 * @param teamId - ID of the selected team.
 */
function globalSelectTeam(teamId: number): void {
  welcomeSelectTeam(G, teamId);
}

/**
 * Set the training focus for the player's squad.
 *
 * @param focus - The training focus key (e.g. 'attack', 'defence', 'balanced').
 */
function setTrainingFocus(focus: string): void {
  G.trainingFocus = focus as TrainingFocus;
  SFX.tactic();
  saveGame();
  wrappedRenderSquad();
}

/**
 * Change the match tactic during an animated match.
 *
 * @param tac - The tactic ID string (e.g. 'attack', 'balanced', 'defensive', 'counter').
 */
function changeTacticMidMatch(tac: string): void {
  G.tactic = tac as TacticId;
  SFX.tactic();
  saveGame();
}

// ===========================================================================
// TEAM & PLAYER PROFILE NAVIGATION
// ===========================================================================

/**
 * Navigate to a team's profile page.
 *
 * @param teamId - The team's ID.
 */
function globalOpenTeamProfile(teamId: number): void {
  openTeamProfile(teamId, showView);
}

/**
 * Navigate to an individual player's profile page.
 *
 * @param playerIdx - Index into the team's roster.
 */
function globalShowPlayerProfile(playerIdx: number): void {
  showPlayerProfile(G, playerIdx, showView);
}

// ===========================================================================
// TRANSFER MARKET HANDLERS
// ===========================================================================

/**
 * Sign a free agent from the transfer market.
 *
 * @param faIdx - Index into `G.freeAgents`.
 */
function globalSignPlayer(faIdx: number): void {
  const success = engineSignPlayer(G, faIdx);
  if (success) {
    SFX.click();
    saveGame();
    wrappedRenderMarket();
    wrappedRenderSquad();
    updatePlayBtn();
  }
}

/**
 * Sell a player from the human player's squad.
 *
 * @param playerIdx - Index into the player team's roster.
 */
function globalSellPlayer(playerIdx: number): void {
  const success = engineSellPlayer(G, playerIdx);
  if (success) {
    SFX.click();
    saveGame();
    wrappedRenderMarket();
    wrappedRenderSquad();
    updatePlayBtn();
  }
}

/**
 * Buy a player from an AI team (inter-team transfer).
 *
 * Price is calculated as: skill * skill * 50 * 1.5 (AI premium),
 * rounded to the nearest $100.
 *
 * @param sellerTeamId - The selling AI team's ID.
 * @param playerIdx    - Index into the seller's roster.
 */
function globalBuyAIPlayer(sellerTeamId: number, playerIdx: number): void {
  if (G.playerTeamId == null) return;

  const seller = G.teams[sellerTeamId];
  if (!seller || !seller.players[playerIdx]) return;

  /* AI premium price: 1.5x base market value */
  const player = seller.players[playerIdx];
  const baseValue = Math.round(player.skill * player.skill * 50 / 100) * 100;
  const price = Math.round(baseValue * 1.5 / 100) * 100;

  const success = engineBuyFromTeam(G, G.playerTeamId, sellerTeamId, playerIdx, price);
  if (success) {
    SFX.click();
    saveGame();
    wrappedRenderMarket();
    wrappedRenderSquad();
    updatePlayBtn();
  }
}

// ===========================================================================
// MATCH SUBSTITUTION HANDLERS
// ===========================================================================

/**
 * Initiate a substitution during an animated match.
 *
 * Shows a confirmation panel listing all current starters so the
 * player can choose who to replace.
 *
 * @param benchIdx - Index of the bench player being brought on.
 */
function initSub(benchIdx: number): void {
  const pt = G.teams[G.playerTeamId!];
  if (!pt || G.matchSubs >= 3) return;

  const confirmArea = document.getElementById('sub-confirm-area');
  if (!confirmArea) return;

  let html = `<div class="sub-confirm"><span class="sc-label">Replace who?</span>`;
  for (let idx = 0; idx < pt.players.length; idx++) {
    const st = pt.players[idx];
    if (!st.selected) continue;
    html += `<span class="sc-starter" onclick="confirmSub(${benchIdx},${idx})">${st.assignedPos || st.pos} ${st.name}</span>`;
  }
  html += `<span class="sc-starter" onclick="document.getElementById('sub-confirm-area').innerHTML=''">Cancel</span>`;
  html += `</div>`;
  confirmArea.innerHTML = html;
}

/**
 * Confirm a substitution: swap a bench player for a starter.
 *
 * The incoming player inherits the outgoing player's assigned
 * position and receives the `subbedIn` flag for a +10% OVR boost.
 *
 * @param benchIdx   - Index of the bench player coming on.
 * @param starterIdx - Index of the starter going off.
 */
function confirmSub(benchIdx: number, starterIdx: number): void {
  const pt = G.teams[G.playerTeamId!];
  if (!pt) return;

  const bench = pt.players[benchIdx];
  const starter = pt.players[starterIdx];
  if (!bench || !starter) return;

  /* Swap selection */
  starter.selected = false;
  const assignedPos = starter.assignedPos;
  starter.assignedPos = null;

  bench.selected = true;
  bench.assignedPos = assignedPos;
  bench.subbedIn = true;

  G.matchSubs++;
  SFX.sub();

  /* Clear the confirmation panel */
  const confirmArea = document.getElementById('sub-confirm-area');
  if (confirmArea) confirmArea.innerHTML = '';

  saveGame();
}

/**
 * Alias for `initSub()` -- some HTML onclick handlers reference `startSub`.
 *
 * @param benchIdx - Index of the bench player.
 */
function startSub(benchIdx: number): void {
  initSub(benchIdx);
}

// ===========================================================================
// SAVE SLOT HANDLERS
// ===========================================================================

/**
 * Save to a specific numbered slot with a user-provided name.
 *
 * @param slotId - Slot number (1-4 for manual saves).
 */
function globalSaveToSlot(slotId: number): void {
  const name = prompt('Save name:', `Save ${slotId}`);
  if (name === null) return;
  saveToSlot(slotId, name || `Save ${slotId}`);
  SFX.click();
  alert('Game saved!');
}

/**
 * Load game state from a specific save slot.
 *
 * @param slotId - Slot number (0-4).
 * @returns Whether the load succeeded.
 */
function globalLoadFromSlot(slotId: number): boolean {
  const success = loadFromSlot(slotId);
  if (success) {
    SFX.click();
    enterGame(G, settings);
    showView('dashboard');
  }
  return success;
}

/**
 * Delete a specific save slot (with confirmation).
 *
 * @param slotId - Slot number (0-4).
 */
function globalDeleteSlot(slotId: number): void {
  if (!confirm('Delete this save?')) return;
  deleteSlot(slotId);
  renderSaveSlots(settings, welcomeCallbacks);
}

/**
 * Load from a save slot (called by welcome screen save slot buttons).
 *
 * @param slotId - Slot number.
 */
function loadSaveSlot(slotId: number): void {
  const success = loadFromSlot(slotId);
  if (success) {
    SFX.click();
    enterGame(G, settings);
    showView('dashboard');
  } else {
    alert('Failed to load save.');
  }
}

/**
 * Delete a save slot from the welcome screen.
 *
 * @param slotId - Slot number.
 */
function deleteSaveSlot(slotId: number): void {
  if (!confirm('Delete this save?')) return;
  deleteSlot(slotId);
  renderSaveSlots(settings, welcomeCallbacks);
}

/**
 * Quick-save to a numbered slot with an auto-generated label.
 *
 * @param slotId - Slot number (1-4).
 */
function quickSaveToSlot(slotId: number): void {
  const teamName = G.playerTeamId != null ? G.teams[G.playerTeamId]?.name || '' : '';
  const name = `${G.manager} - ${teamName} S${G.season}`;
  saveToSlot(slotId, name);
  SFX.click();
  renderSaveSlots(settings, welcomeCallbacks);
}

/**
 * Trigger a browser download of the current save as a `.json` file.
 */
function globalDownloadSave(): void {
  downloadSave();
}

/**
 * Open a hidden file-input dialog to import a save file.
 *
 * Creates a temporary `<input type="file">`, listens for a selection,
 * attempts the import, and cleans up.
 */
function globalImportSave(): void {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  fileInput.addEventListener('change', createImportHandler((success) => {
    document.body.removeChild(fileInput);
    if (success) {
      saveGame();
      enterGame(G, settings);
      showView('dashboard');
      alert('Save imported successfully!');
    } else {
      alert('Invalid save file.');
    }
  }));

  fileInput.click();
}

// ===========================================================================
// SETTINGS CHANGE WRAPPERS (for onclick handlers)
// ===========================================================================

/** Change the UI theme. */
function globalSetTheme(theme: string): void {
  settingsSetTheme(settings, theme as Theme);
  applyLanguage(settings);
}

/** Change the display language. */
function globalSetLang(lang: string): void {
  settingsSetLang(settings, lang as Language);
  applyLanguage(settings);
  refreshAll();
}

/** Change the team strength display mode. */
function globalSetStrengthDisplay(val: string): void {
  settingsSetStrengthDisplay(settings, val as StrengthDisplay);
  refreshAll();
}

/** Set the SFX volume and sync the slider UI. */
function globalSetVolume(vol: number): void {
  settingsSetVolume(settings, vol);
  SFX.setVolume(vol);
  updateVolumeUI(settings);
}

/** Toggle mute on/off and sync the button UI. */
function globalToggleMute(): void {
  settingsToggleMute(settings);
  SFX.toggleMute();
  updateVolumeUI(settings);
}

/** Toggle the settings overlay. */
function globalToggleSettings(): void {
  toggleSettings(settings);
}

/** Toggle the help overlay. */
function globalToggleHelp(): void {
  toggleHelp(settings);
}

/** Toggle the changelog overlay. */
function globalToggleChangelog(): void {
  toggleChangelog();
}

/** Change the game difficulty level. */
function globalSetDifficulty(difficulty: string): void {
  settingsSetDifficulty(settings, difficulty as Difficulty);
}

// ===========================================================================
// WELCOME SCREEN CALLBACKS
// ===========================================================================

/**
 * Callbacks passed to `bootWelcome()` so the welcome module can
 * trigger game-level operations without importing engine modules.
 */
const welcomeCallbacks = {
  loadGame,
  deleteSave,
  initNewGame,
  generateCupBracket: () => { generateCupBracket(G); assignRivals(G); },
  saveGame,
  enterGame: () => {
    initPlayBtn(G, settings);
    enterGame(G, settings);
    applyLanguage(settings);
    showView('dashboard');
  },
  loadFromSlot: (slotId: number): boolean => {
    const success = loadFromSlot(slotId);
    if (success) {
      initPlayBtn(G, settings);
      enterGame(G, settings);
      applyLanguage(settings);
      showView('dashboard');
    }
    return success;
  },
  deleteSlot: (slotId: number): void => {
    deleteSlot(slotId);
  },
};

// ===========================================================================
// WINDOW INTERFACE EXTENSION (TypeScript type safety)
// ===========================================================================

/**
 * Extend the global Window interface so TypeScript recognises all the
 * functions we expose for inline onclick handlers.
 */
declare global {
  interface Window {
    /* View Navigation */
    showView: typeof showView;

    /* Settings & Overlays */
    toggleSettings: typeof globalToggleSettings;
    toggleHelp: typeof globalToggleHelp;
    toggleChangelog: typeof globalToggleChangelog;
    toggleMute: typeof globalToggleMute;
    setTheme: typeof globalSetTheme;
    setLang: typeof globalSetLang;
    setStrengthDisplay: typeof globalSetStrengthDisplay;
    setVolume: typeof globalSetVolume;
    setDifficulty: typeof globalSetDifficulty;

    /* Game Actions */
    playMatch: typeof playMatch;
    autoPick: typeof autoPick;
    clearSelection: typeof clearSelection;
    toggleSort: typeof toggleSort;
    onFormationChange: typeof onFormationChange;
    selectTeam: typeof globalSelectTeam;

    /* Squad Actions */
    togglePlayer: typeof togglePlayer;
    changePos: typeof changePos;
    setTrainingFocus: typeof setTrainingFocus;
    changeTacticMidMatch: typeof changeTacticMidMatch;
    showPlayerProfile: typeof globalShowPlayerProfile;

    /* Team Profile */
    openTeamProfile: typeof globalOpenTeamProfile;
    showTeamProfile: typeof globalOpenTeamProfile;

    /* Market */
    signPlayer: typeof globalSignPlayer;
    sellPlayer: typeof globalSellPlayer;
    buyAIPlayer: typeof globalBuyAIPlayer;

    /* Match Substitutions */
    confirmSub: typeof confirmSub;
    startSub: typeof startSub;
    initSub: typeof initSub;

    /* Match Animation */
    continueMatch: () => void;
    finishMatch: () => void;

    /* Save/Load */
    downloadSave: typeof globalDownloadSave;
    importSave: typeof globalImportSave;
    saveToSlot: typeof globalSaveToSlot;
    loadFromSlot: typeof globalLoadFromSlot;
    deleteSlot: typeof globalDeleteSlot;
    saveGame: typeof saveGame;

    /* Save Slot Welcome Buttons */
    loadSaveSlot: typeof loadSaveSlot;
    deleteSaveSlot: typeof deleteSaveSlot;
    quickSaveToSlot: typeof quickSaveToSlot;

    /* Season */
    startNewSeasonAction: typeof startNewSeasonAction;

    /* Rendering (called from dynamic onclick in squad/match tactic bars) */
    renderSquad: typeof wrappedRenderSquad;

    /* Global State (accessed by dynamic onclick handlers) */
    G: GameState;
    SFX: typeof SFX;
  }
}

// ===========================================================================
// REGISTER GLOBAL FUNCTIONS ON WINDOW
// ===========================================================================

/* --- View Navigation --- */
window.showView = showView;

/* --- Settings & Overlays --- */
window.toggleSettings = globalToggleSettings;
window.toggleHelp = globalToggleHelp;
window.toggleChangelog = globalToggleChangelog;
window.toggleMute = globalToggleMute;
window.setTheme = globalSetTheme;
window.setLang = globalSetLang;
window.setStrengthDisplay = globalSetStrengthDisplay;
window.setVolume = globalSetVolume;
window.setDifficulty = globalSetDifficulty;

/* --- Game Actions --- */
window.playMatch = playMatch;
window.autoPick = autoPick;
window.clearSelection = clearSelection;
window.toggleSort = toggleSort;
window.onFormationChange = onFormationChange;
window.selectTeam = globalSelectTeam;

/* --- Squad Actions --- */
window.togglePlayer = togglePlayer;
window.changePos = changePos;
window.setTrainingFocus = setTrainingFocus;
window.changeTacticMidMatch = changeTacticMidMatch;
window.showPlayerProfile = globalShowPlayerProfile;

/* --- Team Profile --- */
window.openTeamProfile = globalOpenTeamProfile;
window.showTeamProfile = globalOpenTeamProfile;

/* --- Market --- */
window.signPlayer = globalSignPlayer;
window.sellPlayer = globalSellPlayer;
window.buyAIPlayer = globalBuyAIPlayer;

/* --- Match Substitutions --- */
window.confirmSub = confirmSub;
window.startSub = startSub;
window.initSub = initSub;

/* --- Save/Load --- */
window.downloadSave = globalDownloadSave;
window.importSave = globalImportSave;
window.saveToSlot = globalSaveToSlot;
window.loadFromSlot = globalLoadFromSlot;
window.deleteSlot = globalDeleteSlot;
window.saveGame = saveGame;

/* --- Save Slot Welcome Buttons --- */
window.loadSaveSlot = loadSaveSlot;
window.deleteSaveSlot = deleteSaveSlot;
window.quickSaveToSlot = quickSaveToSlot;

/* --- Season --- */
window.startNewSeasonAction = startNewSeasonAction;

/* --- Rendering (accessed from dynamic onclick handlers) --- */
window.renderSquad = wrappedRenderSquad;

/* --- Global State (accessed by dynamic onclick handlers in tactic/training bars) --- */
window.G = G;
window.SFX = SFX;

// ===========================================================================
// REGISTER VIEW RENDERERS
// ===========================================================================

/**
 * Register all view renderers with the navigation module.
 *
 * Each key matches the `data-view` attribute on nav buttons in
 * index.html and the identifiers passed to `showView()`.
 */
registerViewRenderers({
  dashboard: wrappedRenderDashboard,
  squad: wrappedRenderSquad,
  table: wrappedRenderTable,
  calendar: wrappedRenderCalendar,
  scorers: wrappedRenderScorers,
  market: wrappedRenderMarket,
  history: wrappedRenderHistory,
  trophyroom: wrappedRenderTrophyRoom,
  teamprofile: wrappedRenderTeamProfile,
  playerprofile: wrappedRenderPlayerProfile,
  cup: wrappedRenderCup,
  match: () => { /* Match view is rendered by the animation engine */ },
});

// ===========================================================================
// SETTINGS CALLBACKS REGISTRATION
// ===========================================================================

/**
 * Provide callbacks to the settings module so that theme, language,
 * strength display, and difficulty changes trigger appropriate UI refreshes.
 */
initSettingsCallbacks({
  onThemeChange: () => {
    applyLanguage(settings);
  },
  onLanguageChange: () => {
    applyLanguage(settings);
    refreshAll();
  },
  onStrengthChange: () => {
    refreshAll();
  },
  onDifficultyChange: () => {
    /* Difficulty multipliers are read lazily at match time -- no immediate UI update needed */
  },
  isGameActive: () => {
    return G.manager.length > 0 && G.playerTeamId !== null;
  },
});

// ===========================================================================
// BOOT SEQUENCE
// ===========================================================================

/**
 * Application initialisation.
 *
 * This function runs once when the DOM is ready and performs the
 * complete startup sequence:
 *
 *   1. Load user settings from localStorage and apply the theme.
 *   2. Sync the SFX audio engine with loaded volume/mute preferences.
 *   3. Populate version number labels in the footer and settings panel.
 *   4. Inject the difficulty selector row into the settings overlay.
 *   5. Initialise the play button with live G and settings references.
 *   6. Boot the welcome screen (checks for saves, shows picker or continue).
 *   7. Initialise keyboard shortcuts for view switching and game actions.
 */
function boot(): void {
  /* 1. Load and apply settings */
  loadSettings(settings);
  applyTheme(settings);
  applyLanguage(settings);
  updateSettingsUI(settings);

  /* 2. Sync SFX with loaded settings */
  SFX.syncFromSettings(settings);
  updateVolumeUI(settings);

  /* 3. Version labels */
  initVersionLabels();

  /* 4. Inject difficulty row */
  injectDifficultyRow(settings);

  /* 5. Initialize the play button refs */
  initPlayBtn(G, settings);

  /* 6. Boot welcome screen */
  bootWelcome(G, settings, welcomeCallbacks);

  /* 7. Keyboard shortcuts */
  initKeyboardShortcuts({
    onPlayMatch: playMatch,
    onAutoPick: autoPick,
    onClearSelection: clearSelection,
  });
}

/* Run boot when the DOM is ready, or immediately if already loaded */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
