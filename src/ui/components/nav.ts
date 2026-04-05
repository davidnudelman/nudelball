/**
 * nav.ts -- Navigation, view switching, top bar, and play button management.
 *
 * Handles:
 * - `showView(v)` -- switch between game views (dashboard, squad, table, etc.)
 * - `refreshAll()` -- re-render the dashboard and play button after state changes
 * - `updateTopBar()` -- update the manager info and season/budget badge
 * - `updatePlayBtn()` -- update the Play Match button text and disabled state
 * - `applyLanguage()` -- apply i18n translations to all `data-i18n` elements
 * - `updateVolumeUI()` -- sync the mute button, volume slider, and percentage label
 *
 * View renderers are injected via a registry so this module does not need
 * to import every view directly, avoiding circular dependencies.
 */

import type { GameState, Settings, Team } from '../../types';
import { SEASON_WEEKS } from '../../config';
import { teamLabel } from '../../utils/helpers';
import { t } from '../../data/i18n';

/* ================================================================
   VIEW RENDERER REGISTRY
   ================================================================ */

/**
 * Map from view name to its render function.
 *
 * The main entry point registers each renderer so `showView()` can
 * call them dynamically without importing every view module here.
 */
const viewRenderers: Record<string, () => void> = {};

/**
 * Register a view renderer function.
 *
 * @param viewName - The view identifier (e.g. 'dashboard', 'squad')
 * @param renderer - A zero-arg function that renders the view into the DOM
 */
export function registerViewRenderer(viewName: string, renderer: () => void): void {
  viewRenderers[viewName] = renderer;
}

/**
 * Register multiple view renderers at once.
 *
 * @param renderers - Object mapping view names to render functions
 */
export function registerViewRenderers(renderers: Record<string, () => void>): void {
  Object.assign(viewRenderers, renderers);
}

/* ================================================================
   VIEW SWITCHING
   ================================================================ */

/**
 * Switch the active view.
 *
 * Hides all views, activates the target view, updates nav button
 * highlights, and calls the registered renderer for the new view.
 *
 * @param v - The view name to switch to (e.g. 'dashboard', 'squad', 'table')
 */
export function showView(v: string): void {
  /* Block navigation away from match view while a match is in progress */
  if (v !== 'match' && _playBtnG && _playBtnG.matchInProgress) {
    return;
  }

  /* Hide all views and show the target */
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  const target = document.getElementById('view-' + v);
  if (target) target.classList.add('active');

  /* Highlight the matching nav button */
  document.querySelectorAll('.nav-btn').forEach(b => {
    const btn = b as HTMLElement;
    btn.classList.toggle('active', btn.dataset.view === v);
  });

  /* Call the registered renderer for this view */
  const renderer = viewRenderers[v];
  if (renderer) renderer();
}

/* ================================================================
   REFRESH & TOP BAR
   ================================================================ */

/**
 * Refresh the dashboard and play button.
 *
 * Called after any game state change that could affect the dashboard
 * display or the play button's text/disabled state.
 */
export function refreshAll(): void {
  const dashRenderer = viewRenderers['dashboard'];
  if (dashRenderer) dashRenderer();
  updatePlayBtn();

  /* Update market button blinking state based on transfer window */
  if (_playBtnG) {
    updateMarketBtn(!!_playBtnG.transferWindow);
  }
}

/**
 * Update the top bar with current manager info and budget.
 *
 * Displays: "ManagerName -- TeamName (Div X)" and "Season N | $Budget".
 *
 * @param G        - The current game state
 * @param settings - User settings (for i18n)
 */
export function updateTopBar(G: GameState, settings: Settings): void {
  const pt = G.teams[G.playerTeamId!];
  if (!pt) return;

  const budget = (G.budgets && G.budgets[pt.id]) || 0;

  const managerEl = document.getElementById('manager-info');
  if (managerEl) {
    managerEl.innerHTML = '<span class="mgr-name">' + G.manager + '</span> — ' + teamLabel(pt) + ' (' + t(settings, 'div') + ' ' + pt.div + ')';
  }

  const seasonEl = document.getElementById('season-badge');
  if (seasonEl) {
    seasonEl.textContent = t(settings, 'season') + ' ' + G.season + ' | \uD83D\uDCB0$' + budget.toLocaleString();
  }
}

/* ================================================================
   MARKET BUTTON — TRANSFER WINDOW INDICATOR
   ================================================================ */

/**
 * Toggle the bright-red blinking style on the Market nav button
 * based on whether the transfer window is currently open.
 *
 * @param isOpen - Whether the transfer window is open
 */
export function updateMarketBtn(isOpen: boolean): void {
  const btn = document.querySelector('.nav-btn[data-view="market"]');
  if (btn) btn.classList.toggle('market-open', isOpen);
}

/* ================================================================
   PLAY MATCH BUTTON
   ================================================================ */

/**
 * Stored references for the play button update function.
 * Must be set via `initPlayBtn()` before `updatePlayBtn()` is called.
 */
let _playBtnG: GameState | null = null;
let _playBtnSettings: Settings | null = null;

/**
 * Initialize the play button with game state and settings references.
 *
 * Must be called once during game initialization so that `updatePlayBtn()`
 * can access the current game state without parameters.
 *
 * @param G        - The current game state
 * @param settings - User settings (for i18n)
 */
export function initPlayBtn(G: GameState, settings: Settings): void {
  _playBtnG = G;
  _playBtnSettings = settings;
}

/**
 * Update the Play Match button text, disabled state, and visual style.
 *
 * The button reflects the current game state with clear contextual messages:
 * - "Start Season N" when the full season is over
 * - "Match In Progress..." during animated matches (greyed out)
 * - "Select 11 Players" when fewer than 11 players selected (greyed out)
 * - "Assign a Goalkeeper" when no GK is assigned (greyed out)
 * - "Play Week N" when ready to play (highlighted)
 *
 * The button also has a `btn-disabled` CSS class when greyed out for
 * additional visual feedback beyond the native disabled attribute.
 */
export function updatePlayBtn(): void {
  if (!_playBtnG || !_playBtnSettings) return;

  const G = _playBtnG;
  const settings = _playBtnSettings;
  const btn = document.getElementById('play-match-btn') as HTMLButtonElement | null;
  if (!btn) return;

  const pt = G.teams[G.playerTeamId!];
  if (!pt) return;

  const sel = pt.players.filter(p => p.selected);
  const selCount = sel.length;
  const hasGK = sel.some(p => (p.assignedPos || p.pos) === 'GK');

  /**
   * Helper to set button state consistently.
   * Adds/removes 'btn-disabled' class for greyed-out styling.
   */
  const setBtn = (disabled: boolean, text: string): void => {
    btn.disabled = disabled;
    btn.textContent = text;
    btn.classList.toggle('btn-disabled', disabled);
  };

  /* Season recap pending — must review results before starting next season */
  if (G.seasonRecapData) {
    setBtn(false, '\u{1F3C6} ' + t(settings, 'seasonComplete', { season: G.seasonRecapData.season }));
    return;
  }

  /* When the season is over, allow advancing to next season */
  if (G.week > SEASON_WEEKS) {
    setBtn(false, t(settings, 'startSeason', { season: G.season + 1 }));
    return;
  }

  /* Match currently in progress */
  if (G.matchInProgress) {
    setBtn(true, '\u23F3 ' + t(settings, 'matchInProgress'));
    return;
  }

  /* Not enough starters selected */
  if (selCount < 11) {
    setBtn(true, '\u{1F6AB} ' + t(settings, 'select11First'));
    return;
  }

  /* No GK assigned */
  if (!hasGK) {
    setBtn(true, '\u{1F6AB} ' + t(settings, 'mustAssign1GK'));
    return;
  }

  /* Check for injured or suspended starters that shouldn't be playing */
  const unavailable = sel.filter(p => p.injuredFor > 0 || p.suspendedFor > 0);
  if (unavailable.length > 0) {
    setBtn(true, `\u26A0\uFE0F ${unavailable.length} unavailable starter${unavailable.length > 1 ? 's' : ''}`);
    return;
  }

  /* Ready to play */
  setBtn(false, '\u26BD ' + t(settings, 'playWeek', { week: G.week }));
}

/* ================================================================
   i18n APPLICATION
   ================================================================ */

/**
 * Apply the current language to all i18n-tagged DOM elements.
 *
 * Scans for `data-i18n` attributes and sets `textContent`,
 * and `data-i18n-placeholder` attributes and sets `placeholder`.
 * Also updates the page title.
 *
 * @param settings - User settings (for language selection)
 */
export function applyLanguage(settings: Settings): void {
  document.title = t(settings, 'pageTitle');

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = (el as HTMLElement).dataset.i18n;
    if (!key) return;

    const shortcut = (el as HTMLElement).dataset.shortcut;
    if (shortcut) {
      /* Nav buttons: preserve the <kbd> shortcut badge before the label */
      el.innerHTML = `<kbd class="nav-key">${shortcut}</kbd> ${t(settings, key)}`;
    } else {
      el.textContent = t(settings, key);
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = (el as HTMLElement).dataset.i18nPlaceholder;
    if (key) (el as HTMLInputElement).placeholder = t(settings, key);
  });
}

/* ================================================================
   VOLUME UI
   ================================================================ */

/**
 * Sync the mute button icon, volume slider position, and percentage label
 * to the current settings.
 *
 * @param settings - User settings (for volume and mute state)
 */
export function updateVolumeUI(settings: Settings): void {
  const btn = document.getElementById('mute-btn');
  if (btn) btn.textContent = settings.muted ? '\uD83D\uDD07' : '\uD83D\uDD0A';

  const slider = document.getElementById('volume-slider') as HTMLInputElement | null;
  if (slider) slider.value = String(Math.round(settings.volume * 100));

  const pct = document.getElementById('volume-pct');
  if (pct) pct.textContent = Math.round(settings.volume * 100) + '%';
}

/* ================================================================
   GAME ENTRY
   ================================================================ */

/**
 * Transition from the welcome screen to the game.
 *
 * Hides the welcome overlay, shows the top bar, nav, and main content,
 * then updates the top bar, volume UI, and refreshes the dashboard.
 *
 * @param G        - The current game state
 * @param settings - User settings
 */
export function enterGame(G: GameState, settings: Settings): void {
  const welcome = document.getElementById('welcome');
  if (welcome) welcome.style.display = 'none';

  const topBar = document.getElementById('top-bar');
  if (topBar) topBar.style.display = '';

  const nav = document.getElementById('nav');
  if (nav) nav.style.display = '';

  const main = document.getElementById('main');
  if (main) main.style.display = 'block';

  updateTopBar(G, settings);
  updateVolumeUI(settings);
  refreshAll();
}
