/**
 * main.ts -- Sole entry point for the Park the Bus Vite application.
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
  Position,
  Settings,
  StrengthDisplay,
  TacticId,
  TeamTalkId,
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
import { endOfSeason, startNewSeason, calculateSeasonAwards, assignRivals, generateYouthProspects } from './engine/season';
import { decayMorale } from './engine/match';
import { applyTraining, applyAITraining } from './engine/training';
import {
  signPlayer as engineSignPlayer,
  sellPlayer as engineSellPlayer,
  buyFromTeam as engineBuyFromTeam,
  loanPlayer as engineLoanPlayer,
  applyDeadlineDayScramble,
} from './engine/transfers';
import { makePlayer, genName, genSkill, getOopPenalty } from './engine/player';

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
import { renderClub } from './ui/views/club';
import { renderHistory } from './ui/views/history';
import { renderTrophyRoom } from './ui/views/trophy-room';
import { renderTeamProfile, openTeamProfile } from './ui/views/team-profile';
import { renderPlayerProfile, showPlayerProfile } from './ui/views/player-profile';
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
  SQUAD_MAX,
  SQUAD_MIN,
  FACILITY_COSTS,
  SPONSORSHIP_TIERS,
  SCOUT_COSTS,
  TRANSFER_DEADLINE_WEEK,
  STADIUM_HOME_GAME_BONUS,
  FORM_OVR_PCT,
  POS_ORDER,
  TEAM_TALKS,
  TEAM_TALK_CHOICES,
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
    const golds = tm.trophies.filter(tr => tr.type === 'gold_trophy').length;
    if (golds) label += ` <span class="trophy" style="font-size:.8em">\u{1F3C6}\u00D7${golds}</span>`;
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

/** Render the club management view (sponsors & stadium). */
function wrappedRenderClub(): void {
  renderClub(G, settings);
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


// ===========================================================================
// REFRESH CURRENT VIEW HELPER
// ===========================================================================

/**
 * Re-render the currently active view and update the top bar + play button.
 *
 * Unlike `refreshAll()` which only re-renders the dashboard, this function
 * detects which view is currently shown and re-renders it. This ensures
 * that spending money (facility upgrades, sponsor changes, etc.) is
 * immediately reflected in whichever view the player is looking at.
 */
function refreshCurrentView(): void {
  const activeEl = document.querySelector('.view.active');
  if (activeEl) {
    const viewName = activeEl.id.replace('view-', '');
    showView(viewName);
  } else {
    refreshAll();
  }
  updateTopBar(G, settings);
  updatePlayBtn();
}

// ===========================================================================
// PLAY MATCH / ADVANCE WEEK
// ===========================================================================

/**
 * The main game-loop action: play one week's matches and advance the season.
 *
 * Handles two phases:
 *   1. **End of season** (week > SEASON_WEEKS) -- run end-of-season
 *      processing via `endOfSeason()`, show the season summary overlay.
 *   2. **Regular week** -- simulate all league fixtures across all 4
 *      divisions for the current round, apply training, advance the week.
 *
 * After every action the game is auto-saved and the UI is refreshed.
 */
function playMatch(): void {
  /* Don't start a new match while animation is running */
  if (G.matchInProgress) return;

  /* --- Season recap gate: must dismiss recap before proceeding --- */
  if (G.seasonRecapData) {
    showView('dashboard');
    return;
  }

  /* --- Season-end advancement --- */
  if (G.week > SEASON_WEEKS) {
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

  /* --- Transfer window reminder on week 1 — show once, then close on skip --- */
  if (G.week === 1 && G.transferWindow) {
    if (!G.transferReminderShown) {
      G.transferReminderShown = true;
      showView('market');
      renderMarket(G, settings, true);
      return;
    }
    /* Don't close yet — transfer window stays open until TRANSFER_DEADLINE_WEEK */
  }

  /* --- Transfer deadline day: trigger deadline scramble on the deadline week --- */
  if (G.week === TRANSFER_DEADLINE_WEEK && G.transferWindow) {
    applyDeadlineDayScramble(G);
    G.transferWindow = false; /* Close window after deadline week */
  } else if (G.week > TRANSFER_DEADLINE_WEEK) {
    G.transferWindow = false;
  }

  /* Apply squad rules auto-rotation if enabled */
  applySquadRules(G);

  /* --- Warn if any selected players have stamina below 60% --- */
  const tiredStarters = pt.players.filter(p => p.selected && p.stamina < 60);
  if (tiredStarters.length > 0) {
    const names = tiredStarters.map(p => `${p.name} (${p.stamina}%)`).join(', ');
    const proceed = confirm(
      `Warning: ${tiredStarters.length} starter${tiredStarters.length > 1 ? 's have' : ' has'} low stamina:\n\n${names}\n\nProceed with match anyway?`
    );
    if (!proceed) return;
  }

  /* Show team talk selection before proceeding with the match */
  showTeamTalkSelection(() => {
    proceedWithMatch();
  });
}

/**
 * Show the team talk selection overlay.
 * Randomly picks 5 of 12 available team talks for the player to choose from.
 *
 * @param onSelect - Callback fired after the player selects a team talk.
 */
function showTeamTalkSelection(onSelect: () => void): void {
  /* Pick 5 random team talks from the 12 available */
  const allIds = Object.keys(TEAM_TALKS) as TeamTalkId[];
  const shuffled = [...allIds].sort(() => Math.random() - 0.5);
  const choices = shuffled.slice(0, TEAM_TALK_CHOICES);

  /* Build the overlay HTML */
  let cardsHTML = '';
  for (const id of choices) {
    const talk = TEAM_TALKS[id];
    cardsHTML += `<div class="team-talk-card" onclick="selectTeamTalk('${id}')">` +
      `<div class="tt-icon">${talk.icon}</div>` +
      `<div class="tt-info">` +
      `<div class="tt-label">${talk.label}</div>` +
      `<div class="tt-desc">${talk.desc}</div>` +
      `</div></div>`;
  }

  /* Create and show the overlay */
  const overlay = document.createElement('div');
  overlay.id = 'team-talk-overlay';
  overlay.className = 'team-talk-overlay';
  overlay.innerHTML =
    `<div class="team-talk-panel">` +
    `<div class="team-talk-title">\uD83D\uDDE3\uFE0F Pre-Match Team Talk</div>` +
    cardsHTML +
    `</div>`;
  document.body.appendChild(overlay);

  /* Expose the selection handler on window */
  (window as unknown as Record<string, unknown>).selectTeamTalk = (talkId: string) => {
    G.activeTeamTalk = talkId as TeamTalkId;
    /* Remove the overlay */
    const el = document.getElementById('team-talk-overlay');
    if (el) el.remove();
    SFX.click();
    onSelect();
  };
}

/**
 * Proceed with match simulation after team talk has been selected.
 * This is the second half of the original playMatch() flow.
 */
function proceedWithMatch(): void {
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

  /* Apply stadium home-game income if player is the home team */
  if (playerFixture && playerFixture.home === G.playerTeamId) {
    const stadiumLevel = G.facilities?.stadium ?? 0;
    if (stadiumLevel > 0) {
      const homeIncome = stadiumLevel * STADIUM_HOME_GAME_BONUS;
      G.budgets[G.playerTeamId!] = (G.budgets[G.playerTeamId!] || 0) + homeIncome;
    }
  }

  /* Apply weekly training for the player's squad */
  applyTraining(G, diffMult.trainingMult);

  /* Apply simplified training for AI teams */
  applyAITraining(G);

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
        /* Advance week counter BEFORE rendering so UI shows correct state */
        G.week++;

        /* Close the transfer window after deadline week */
        if (G.week > TRANSFER_DEADLINE_WEEK) {
          G.transferWindow = false;
        }

        /* Check if the season is now over */
        if (G.week > SEASON_WEEKS) {
          const result = endOfSeason(G);

          /* Store recap data as a persistent gate — dashboard will render it inline */
          let playerCash = 0;
          if (result.financialAwards) {
            for (const fa of result.financialAwards) {
              if (fa.team.id === G.playerTeamId && fa.type !== 'solidarityPaid') {
                playerCash += fa.amount;
              }
            }
          }
          G.seasonRecapData = {
            season: G.season,
            moves: result.moves.map(m => ({
              teamId: m.team.id,
              type: m.type,
              from: m.from,
              to: m.to,
            })),
            financialAwards: result.financialAwards.map(fa => ({
              teamId: fa.team.id,
              type: fa.type,
              amount: fa.amount,
            })),
            playerTotalCash: playerCash,
          };

          saveGame();
          updateTopBar(G, settings);
          showView('dashboard');
          refreshAll();
        } else {
          /* Auto-save, navigate to dashboard, and refresh UI */
          saveGame();
          showView('dashboard');
          refreshAll();
        }
      },
    });
    return;
  }

  /* No player fixture this week (shouldn't normally happen) — advance instantly */
  G.week++;

  /* Close the transfer window after deadline week */
  if (G.week > TRANSFER_DEADLINE_WEEK) {
    G.transferWindow = false;
  }

  /* Check if the season is now over */
  if (G.week > SEASON_WEEKS) {
    const result = endOfSeason(G);

    /* Store recap data as a persistent gate */
    let playerCash = 0;
    if (result.financialAwards) {
      for (const fa of result.financialAwards) {
        if (fa.team.id === G.playerTeamId && fa.type !== 'solidarityPaid') {
          playerCash += fa.amount;
        }
      }
    }
    G.seasonRecapData = {
      season: G.season,
      moves: result.moves.map(m => ({
        teamId: m.team.id,
        type: m.type,
        from: m.from,
        to: m.to,
      })),
      financialAwards: result.financialAwards.map(fa => ({
        teamId: fa.team.id,
        type: fa.type,
        amount: fa.amount,
      })),
      playerTotalCash: playerCash,
    };

    saveGame();
    updateTopBar(G, settings);
    showView('dashboard');
    refreshAll();
  } else {
    /* Auto-save and refresh UI */
    saveGame();
    refreshAll();
    showView('dashboard');
  }
}

// ===========================================================================
// SEASON-END: START NEW SEASON
// ===========================================================================

/**
 * Start a new season when the player clicks the button on the
 * season-end overlay. Hides the overlay and transitions to the
 * new season's dashboard.
 */
function startNewSeasonAction(): void {
  /* Clear the season recap gate */
  G.seasonRecapData = null;

  /* Hide the legacy overlay (if still visible from older saves) */
  const overlay = document.getElementById('season-overlay');
  if (overlay) overlay.style.display = 'none';

  startNewSeason(G);
  saveGame();
  updateTopBar(G, settings);
  refreshAll();
  showView('dashboard');
}

// ===========================================================================
// SQUAD RULES — AUTO-ROTATION (#19)
// ===========================================================================

/**
 * Apply squad rules before each match if enabled.
 * - restBelowStamina: bench players below the threshold and replace with fresh subs.
 * - alwaysStartBest: auto-pick highest-rated available players.
 */
function applySquadRules(state: GameState): void {
  if (!state.squadRules || state.playerTeamId == null) return;
  const pt = state.teams[state.playerTeamId];
  const rules = state.squadRules;

  /* Rest tired players */
  if (rules.restBelowStamina != null) {
    for (const p of pt.players) {
      if (p.selected && p.stamina < rules.restBelowStamina && p.injuredFor === 0 && p.suspendedFor === 0) {
        p.selected = false;
        p.assignedPos = null;
      }
    }

    /* Fill empty slots with best available bench players */
    const selCount = pt.players.filter(p => p.selected).length;
    if (selCount < 11) {
      const formIdx = state.selectedFormationIdx ?? DEFAULT_FORMATION_IDX;
      const formation = FORMATIONS[formIdx];
      const selectedSet = new Set(pt.players.filter(p => p.selected).map((_, i) => i));

      /* For each position that needs filling */
      for (const pos of ['GK', 'DEF', 'MID', 'STR'] as const) {
        const currentInPos = pt.players.filter(p => p.selected && (p.assignedPos || p.pos) === pos).length;
        const needed = formation.slots[pos] - currentInPos;
        if (needed <= 0) continue;

        const candidates = pt.players
          .map((p, i) => ({ p, i }))
          .filter(({ p, i }) =>
            !p.selected && !selectedSet.has(i) &&
            p.pos === pos && p.injuredFor === 0 && p.suspendedFor === 0 &&
            p.stamina >= (rules.restBelowStamina ?? 0),
          )
          .sort((a, b) => b.p.skill - a.p.skill);

        for (let j = 0; j < needed && j < candidates.length; j++) {
          candidates[j].p.selected = true;
          candidates[j].p.assignedPos = pos;
          selectedSet.add(candidates[j].i);
        }
      }
    }
  }

  /* Always start best — re-pick using autoPick logic */
  if (rules.alwaysStartBest) {
    autoPick();
  }
}

/**
 * Toggle a squad rule on/off.
 */
function toggleSquadRule(rule: string, value?: number | boolean): void {
  if (!G.squadRules) {
    G.squadRules = { restBelowStamina: null, alwaysStartBest: false };
  }

  if (rule === 'restBelowStamina') {
    if (G.squadRules.restBelowStamina != null) {
      G.squadRules.restBelowStamina = null;
    } else {
      G.squadRules.restBelowStamina = typeof value === 'number' ? value : 60;
    }
  } else if (rule === 'alwaysStartBest') {
    G.squadRules.alwaysStartBest = !G.squadRules.alwaysStartBest;
  }

  saveGame();
  wrappedRenderSquad();
}

// ===========================================================================
// SQUAD INTERACTION HANDLERS
// ===========================================================================

/**
 * Auto-pick the best 11 players for the currently selected formation.
 *
 * Uses a three-pass approach that respects the selected formation:
 * 1. Natural-position players with stamina >= 60% (best fit for formation)
 * 2. OOP-adjacent players with stamina >= 60% (fallback if not enough natural)
 * 3. Emergency fallback ignoring stamina (prefers natural position, then score)
 *
 * Scoring mirrors the AI logic: stamina-weighted skill, OOP penalty,
 * form bonus (±5% per point), and fresh bonus (+5 for 3+ bench weeks).
 * Injured and suspended players are always excluded.
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

  /**
   * Effective score for a player at a given position.
   * Mirrors the AI scoring: stamina-weighted skill, OOP penalty, form, fresh bonus.
   */
  const effectiveScore = (p: typeof pt.players[0], pos: Position): number | null => {
    const oop = getOopPenalty(p.pos, pos);
    if (oop === 0) return null; /* GK mismatch or 2+ steps away */
    const stam = p.stamina ?? 100;
    const base = p.skill * (0.5 + 0.5 * stam / 100) * oop;
    const formMult = 1.0 + ((p.form || 0) * FORM_OVR_PCT);
    const freshBonus = p.benchStreak >= 3 ? 5 : 0;
    return Math.round(base * formMult) + freshBonus;
  };

  const selected = new Set<number>();

  /* First pass: fill each formation slot with natural-position players (stamina >= 60%) */
  for (const pos of POS_ORDER) {
    const needed = formation.slots[pos];
    const candidates = pt.players
      .map((p, i) => {
        if (selected.has(i)) return null;
        if (p.injuredFor > 0 || p.suspendedFor > 0) return null;
        if ((p.stamina ?? 100) < 60) return null;
        if (p.pos !== pos) return null; /* natural position only */
        const score = effectiveScore(p, pos);
        if (score === null) return null;
        return { p, i, score };
      })
      .filter(Boolean) as Array<{ p: typeof pt.players[0]; i: number; score: number }>;

    candidates.sort((a, b) => b.score - a.score);

    for (let j = 0; j < needed && j < candidates.length; j++) {
      const c = candidates[j];
      c.p.selected = true;
      c.p.assignedPos = pos;
      selected.add(c.i);
    }
  }

  /* Second pass: fill remaining slots with OOP-adjacent players (stamina >= 60%) */
  if (selected.size < 11) {
    for (const pos of POS_ORDER) {
      const needed = formation.slots[pos];
      const current = pt.players.filter(p => p.selected && p.assignedPos === pos).length;
      if (current >= needed) continue;

      const remaining = pt.players
        .map((p, i) => {
          if (selected.has(i)) return null;
          if (p.injuredFor > 0 || p.suspendedFor > 0) return null;
          if ((p.stamina ?? 100) < 60) return null;
          const score = effectiveScore(p, pos);
          if (score === null) return null;
          return { p, i, score };
        })
        .filter(Boolean) as Array<{ p: typeof pt.players[0]; i: number; score: number }>;

      remaining.sort((a, b) => b.score - a.score);

      const toFill = needed - current;
      for (let j = 0; j < toFill && j < remaining.length; j++) {
        const c = remaining[j];
        c.p.selected = true;
        c.p.assignedPos = pos;
        selected.add(c.i);
      }
    }
  }

  /* Third pass: emergency fallback — fill any still-empty slots ignoring stamina */
  if (selected.size < 11) {
    for (const pos of POS_ORDER) {
      const needed = formation.slots[pos];
      const current = pt.players.filter(p => p.selected && p.assignedPos === pos).length;
      if (current >= needed) continue;

      const remaining = pt.players
        .map((p, i) => {
          if (selected.has(i)) return null;
          if (p.injuredFor > 0 || p.suspendedFor > 0) return null;
          const score = effectiveScore(p, pos);
          if (score === null) return null;
          /* Prefer natural position, then best score */
          const natBonus = p.pos === pos ? 1 : 0;
          return { p, i, score, natBonus };
        })
        .filter(Boolean) as Array<{ p: typeof pt.players[0]; i: number; score: number; natBonus: number }>;

      remaining.sort((a, b) => b.natBonus - a.natBonus || b.score - a.score);

      const toFill = needed - current;
      for (let j = 0; j < toFill && j < remaining.length; j++) {
        const c = remaining[j];
        c.p.selected = true;
        c.p.assignedPos = pos;
        selected.add(c.i);
      }
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
// FACILITY UPGRADE (#7)
// ===========================================================================

/** Upgrade a facility (trainingFacility, youthAcademy, or stadium). */
function upgradeFacility(facilityKey: string): void {
  if (G.playerTeamId == null) return;
  if (!G.facilities) G.facilities = { trainingFacility: 0, youthAcademy: 0, stadium: 0 };
  const costs = FACILITY_COSTS[facilityKey];
  if (!costs) return;
  const fac = G.facilities as unknown as Record<string, number>;
  const currentLevel = fac[facilityKey] || 0;
  if (currentLevel >= costs.length) return;
  const cost = costs[currentLevel];
  const budget = G.budgets[G.playerTeamId] || 0;
  if (budget < cost) return;
  G.budgets[G.playerTeamId] -= cost;
  fac[facilityKey] = currentLevel + 1;
  SFX.click();
  saveGame();
  updateTopBar(G, settings);
  refreshCurrentView();
}

// ===========================================================================
// SPONSORSHIP SELECTION (#6)
// ===========================================================================

/** Select a sponsorship deal. */
function selectSponsor(tier: string): void {
  const sp = SPONSORSHIP_TIERS.find(s => s.tier === tier);
  if (!sp) return;
  if (G.playerTeamId == null) return;
  const pt = G.teams[G.playerTeamId];
  if (pt.div > sp.requiredDiv) return;
  G.sponsorship = { ...sp };
  SFX.click();
  saveGame();
  updateTopBar(G, settings);
  refreshCurrentView();
}

// ===========================================================================
// LOAN PLAYER (#8)
// ===========================================================================

/** Execute a loan transfer. */
function loanPlayerAction(fromTeamId: number, playerName: string, fee: number): void {
  const success = engineLoanPlayer(G, fromTeamId, playerName, fee);
  if (success) {
    SFX.click();
    saveGame();
    wrappedRenderMarket();
    wrappedRenderSquad();
    updatePlayBtn();
    updateTopBar(G, settings);
  }
}

// ===========================================================================
// SCOUT UPGRADE (#18)
// ===========================================================================

/** Upgrade the scout network level. */
function upgradeScout(): void {
  if (G.playerTeamId == null) return;
  const currentLevel = G.scoutLevel ?? 0;
  if (currentLevel >= SCOUT_COSTS.length - 1) return;
  const cost = SCOUT_COSTS[currentLevel + 1];
  const budget = G.budgets[G.playerTeamId] || 0;
  if (budget < cost) return;
  G.budgets[G.playerTeamId] -= cost;
  G.scoutLevel = (currentLevel + 1) as import('./types').ScoutLevel;
  SFX.click();
  saveGame();
  wrappedRenderMarket();
  updateTopBar(G, settings);
}

// ===========================================================================
// YOUTH ACADEMY PROMOTE (#14)
// ===========================================================================

/** Promote a youth prospect to the first team. */
function promoteProspect(prospectIdx: number): void {
  if (G.playerTeamId == null || !G.youthProspects) return;
  const prospect = G.youthProspects[prospectIdx];
  if (!prospect || prospect.promoted) return;
  const pt = G.teams[G.playerTeamId];
  if (pt.players.length >= SQUAD_MAX) return;

  /* Add prospect to first team */
  pt.players.push({
    ...prospect.player,
    selected: false,
    assignedPos: null,
    benchStreak: 0,
    stamina: 100,
    injuredFor: 0,
    suspendedFor: 0,
    form: 0,
    formStreak: 0,
    seasonGoals: 0,
    seasonApps: 0,
    seasonYellows: 0,
    seasonReds: 0,
    careerGoals: prospect.player.careerGoals || 0,
    careerApps: prospect.player.careerApps || 0,
    isAcademy: true,
  });
  prospect.promoted = true;
  SFX.click();
  saveGame();
  wrappedRenderSquad();
  updatePlayBtn();
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

/**
 * Auto-substitute the best bench players for the weakest/most-tired starters.
 *
 * Ranks starters by a "need to sub" score (fatigue + skill gap) and pairs
 * them with the best available bench players, up to remaining sub slots.
 */
function autoSub(): void {
  const pt = G.teams[G.playerTeamId!];
  if (!pt) return;

  const maxSubs = 3 - G.matchSubs;
  if (maxSubs <= 0) return;

  const bench = pt.players
    .map((p, i) => ({ player: p, idx: i }))
    .filter(({ player: p }) => !p.selected && !p.injuredFor && !p.suspendedFor);

  const starters = pt.players
    .map((p, i) => ({ player: p, idx: i }))
    .filter(({ player: p }) => p.selected);

  if (bench.length === 0 || starters.length === 0) return;

  /* Sort starters by "need to sub" score: lower stamina + lower skill = higher need */
  const starterScores = starters.map(s => ({
    ...s,
    needScore: (100 - s.player.stamina) + (100 - s.player.skill),
  })).sort((a, b) => b.needScore - a.needScore);

  /* Sort bench by skill descending (best bench players first) */
  const benchSorted = [...bench].sort((a, b) => b.player.skill - a.player.skill);

  let subsUsed = 0;
  const usedBench = new Set<number>();

  for (const starter of starterScores) {
    if (subsUsed >= maxSubs) break;

    /* Find the best available bench player not yet used */
    const bestBench = benchSorted.find(b => !usedBench.has(b.idx));
    if (!bestBench) break;

    /* Only sub if bench player is meaningfully better or starter is very tired */
    const skillGap = bestBench.player.skill - starter.player.skill;
    const staminaLow = starter.player.stamina < 70;
    if (skillGap < -5 && !staminaLow) continue;

    /* Execute the swap using existing logic */
    confirmSub(bestBench.idx, starter.idx);
    usedBench.add(bestBench.idx);
    subsUsed++;
  }

  /* Update the subs panel display */
  const subsRemaining = document.getElementById('subs-remaining');
  if (subsRemaining) {
    subsRemaining.textContent = String(3 - G.matchSubs);
  }

  /* Update the auto-sub button to reflect remaining subs */
  const remaining = 3 - G.matchSubs;
  const autoSubBtns = document.querySelectorAll('.auto-sub-btn');
  autoSubBtns.forEach(btn => {
    if (remaining <= 0) {
      (btn as HTMLButtonElement).disabled = true;
      btn.textContent = '\uD83D\uDD04 No Subs Left';
    } else {
      btn.textContent = `\uD83D\uDD04 Auto Sub (${remaining})`;
    }
  });
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
  postInit: () => {
    assignRivals(G);
    /* Generate initial youth prospects for season 1 */
    generateYouthProspects(G);
  },
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

    /* New Feature Actions */
    upgradeFacility: typeof upgradeFacility;
    selectSponsor: typeof selectSponsor;
    loanPlayerAction: typeof loanPlayerAction;
    upgradeScout: typeof upgradeScout;
    promoteProspect: typeof promoteProspect;
    toggleSquadRule: typeof toggleSquadRule;

    /* Match Substitutions */
    confirmSub: typeof confirmSub;
    startSub: typeof startSub;
    initSub: typeof initSub;
    autoSub: typeof autoSub;

    /* Match Animation */
    continueMatch: () => void;
    finishMatch: () => void;
    selectTeamTalk: (talkId: string) => void;

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

/* --- New Feature Actions --- */
window.upgradeFacility = upgradeFacility;
window.selectSponsor = selectSponsor;
window.loanPlayerAction = loanPlayerAction;
window.upgradeScout = upgradeScout;
window.promoteProspect = promoteProspect;
window.toggleSquadRule = toggleSquadRule;

/* --- Match Substitutions --- */
window.confirmSub = confirmSub;
window.startSub = startSub;
window.initSub = initSub;
window.autoSub = autoSub;

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
  club: wrappedRenderClub,
  history: wrappedRenderHistory,
  trophyroom: wrappedRenderTrophyRoom,
  teamprofile: wrappedRenderTeamProfile,
  playerprofile: wrappedRenderPlayerProfile,
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
    isMatchInProgress: () => G.matchInProgress,
  });
}

/* Run boot when the DOM is ready, or immediately if already loaded */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
