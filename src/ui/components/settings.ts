/**
 * settings.ts -- Settings overlay UI renderer and controls.
 *
 * Handles:
 * - `toggleSettings()` -- show/hide the settings overlay
 * - `updateSettingsUI()` -- sync toggle button highlights to current settings
 * - `setTheme()` -- change the UI theme (dark/light)
 * - `setLang()` -- change the display language (en/pt/es)
 * - `setStrengthDisplay()` -- change team strength display mode
 * - `setVolume()` -- change the sound effect volume
 * - `toggleMute()` -- toggle sound mute on/off
 * - `setDifficulty()` -- NEW: change game difficulty level (easy/normal/hard)
 *
 * The overlay is defined in the HTML and toggled via display:flex/none.
 * This module manages the settings state and persists changes to localStorage.
 */

import type { Settings, Theme, Language, StrengthDisplay, Difficulty, MatchSpeed } from '../../types';
import { SETTINGS_KEY, DIFFICULTY_SETTINGS } from '../../config';

/* ================================================================
   SETTINGS PERSISTENCE
   ================================================================ */

/**
 * Load settings from localStorage.
 *
 * Merges saved values into the provided settings object. Any missing
 * fields retain their default values.
 *
 * @param settings - The settings object to hydrate (mutated in-place)
 */
export function loadSettings(settings: Settings): void {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.theme) settings.theme = data.theme;
      if (data.lang) settings.lang = data.lang;
      if (data.strengthDisplay) settings.strengthDisplay = data.strengthDisplay;
      if (data.volume != null) settings.volume = data.volume;
      if (data.muted != null) settings.muted = data.muted;
      if (data.difficulty) settings.difficulty = data.difficulty;
      if (data.matchSpeed === 1 || data.matchSpeed === 2 || data.matchSpeed === 4) {
        settings.matchSpeed = data.matchSpeed;
      }
      if (typeof data.autoTeamTalk === 'boolean') settings.autoTeamTalk = data.autoTeamTalk;
      if (typeof data.skipLowStaminaWarning === 'boolean') settings.skipLowStaminaWarning = data.skipLowStaminaWarning;
    }
  } catch {
    /* Silently ignore corrupt settings */
  }
}

/**
 * Save the current settings to localStorage.
 *
 * @param settings - The settings object to persist
 */
export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* Silently ignore storage errors */
  }
}

/* ================================================================
   THEME
   ================================================================ */

/**
 * Apply the current theme to the document.
 *
 * Adds or removes the `light` class from `<html>` based on settings.
 *
 * @param settings - User settings
 */
export function applyTheme(settings: Settings): void {
  if (settings.theme === 'light') {
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
  }
}

/* ================================================================
   TOGGLE & UI SYNC
   ================================================================ */

/**
 * Toggle the settings overlay visibility.
 *
 * When opening, calls `updateSettingsUI()` to sync all toggle buttons
 * to their current values.
 *
 * @param settings - User settings (for syncing toggle highlights)
 */
export function toggleSettings(settings: Settings): void {
  const overlay = document.getElementById('settings-overlay');
  if (!overlay) return;

  const isOpen = overlay.style.display === 'flex';
  overlay.style.display = isOpen ? 'none' : 'flex';
  if (!isOpen) updateSettingsUI(settings);
}

/**
 * Sync all settings toggle buttons to reflect current values.
 *
 * Iterates over theme, language, strength display, and difficulty toggles,
 * adding/removing the `active` class on each option button.
 *
 * @param settings - User settings
 */
export function updateSettingsUI(settings: Settings): void {
  /* Theme toggle */
  document.querySelectorAll('#theme-toggle .stoggle-opt').forEach(b => {
    const btn = b as HTMLElement;
    btn.classList.toggle('active', btn.dataset.value === settings.theme);
  });

  /* Language toggle */
  document.querySelectorAll('#lang-toggle .stoggle-opt').forEach(b => {
    const btn = b as HTMLElement;
    btn.classList.toggle('active', btn.dataset.value === settings.lang);
  });

  /* Strength display toggle */
  document.querySelectorAll('#strength-toggle .stoggle-opt').forEach(b => {
    const btn = b as HTMLElement;
    btn.classList.toggle('active', btn.dataset.value === settings.strengthDisplay);
  });

  /* Difficulty toggle (NEW) */
  document.querySelectorAll('#difficulty-toggle .stoggle-opt').forEach(b => {
    const btn = b as HTMLElement;
    btn.classList.toggle('active', btn.dataset.value === (settings.difficulty || 'normal'));
  });

  /* Match speed toggle */
  document.querySelectorAll('#match-speed-toggle .stoggle-opt').forEach(b => {
    const btn = b as HTMLElement;
    btn.classList.toggle('active', btn.dataset.value === String(settings.matchSpeed || 1));
  });

  /* Pre-match friction toggles */
  document.querySelectorAll('#auto-team-talk-toggle .stoggle-opt').forEach(b => {
    const btn = b as HTMLElement;
    btn.classList.toggle('active', btn.dataset.value === String(!!settings.autoTeamTalk));
  });
  document.querySelectorAll('#stamina-warning-toggle .stoggle-opt').forEach(b => {
    const btn = b as HTMLElement;
    btn.classList.toggle('active', btn.dataset.value === String(!settings.skipLowStaminaWarning));
  });
}

/* ================================================================
   SETTING CHANGE HANDLERS
   ================================================================ */

/**
 * Callbacks that the settings module can invoke after changes.
 *
 * Since settings changes can trigger broad UI updates (language change
 * requires re-rendering all views, theme change updates CSS, etc.),
 * the main module provides these callbacks during initialization.
 */
export interface SettingsCallbacks {
  /** Called after theme changes (e.g. re-apply CSS) */
  onThemeChange?: () => void;
  /** Called after language changes (e.g. re-render all views) */
  onLanguageChange?: () => void;
  /** Called after strength display changes (e.g. refresh dashboard) */
  onStrengthChange?: () => void;
  /** Called after difficulty changes */
  onDifficultyChange?: () => void;
  /** Whether the game is active (has a manager, past welcome screen) */
  isGameActive?: () => boolean;
}

/** Stored callbacks, set via `initSettingsCallbacks()`. */
let _callbacks: SettingsCallbacks = {};

/**
 * Initialize the settings callbacks.
 *
 * Must be called once during app setup so that setting change handlers
 * can trigger appropriate UI refreshes.
 *
 * @param callbacks - Object with callback functions
 */
export function initSettingsCallbacks(callbacks: SettingsCallbacks): void {
  _callbacks = callbacks;
}

/**
 * Change the UI theme.
 *
 * @param settings - User settings (mutated)
 * @param theme    - The new theme value
 */
export function setTheme(settings: Settings, theme: Theme): void {
  settings.theme = theme;
  saveSettings(settings);
  applyTheme(settings);
  updateSettingsUI(settings);
  if (_callbacks.onThemeChange) _callbacks.onThemeChange();
}

/**
 * Change the display language.
 *
 * @param settings - User settings (mutated)
 * @param lang     - The new language code
 */
export function setLang(settings: Settings, lang: Language): void {
  settings.lang = lang;
  saveSettings(settings);
  updateSettingsUI(settings);
  if (_callbacks.onLanguageChange) _callbacks.onLanguageChange();
}

/**
 * Change the team strength display mode.
 *
 * @param settings - User settings (mutated)
 * @param val      - The new display mode ('none', 'avg', or 'power')
 */
export function setStrengthDisplay(settings: Settings, val: StrengthDisplay): void {
  settings.strengthDisplay = val;
  saveSettings(settings);
  updateSettingsUI(settings);
  if (_callbacks.onStrengthChange) _callbacks.onStrengthChange();
}

/**
 * Set the sound effect volume.
 *
 * Clamps to 0.0-1.0 range. Setting volume > 0 auto-unmutes.
 *
 * @param settings - User settings (mutated)
 * @param volume   - Volume level (0.0 to 1.0)
 */
export function setVolume(settings: Settings, volume: number): void {
  settings.volume = Math.max(0, Math.min(1, volume));
  if (volume > 0) settings.muted = false;
  saveSettings(settings);
}

/**
 * Toggle mute on/off.
 *
 * @param settings - User settings (mutated)
 */
export function toggleMute(settings: Settings): void {
  settings.muted = !settings.muted;
  saveSettings(settings);
}

/**
 * Change the game difficulty level. (NEW)
 *
 * Difficulty affects:
 * - AI team strength multiplier (easy: 0.9x, normal: 1.0x, hard: 1.1x)
 * - Player budget multiplier (easy: 1.5x, normal: 1.0x, hard: 0.75x)
 * - Training effectiveness (easy: 1.3x, normal: 1.0x, hard: 0.8x)
 *
 * @param settings   - User settings (mutated)
 * @param difficulty - The new difficulty level
 */
export function setDifficulty(settings: Settings, difficulty: Difficulty): void {
  settings.difficulty = difficulty;
  saveSettings(settings);
  updateSettingsUI(settings);
  if (_callbacks.onDifficultyChange) _callbacks.onDifficultyChange();
}

/**
 * Change preferred animated match speed.
 *
 * @param settings - User settings (mutated)
 * @param speed    - Animation speed multiplier (1x, 2x, 4x)
 */
export function setMatchSpeed(settings: Settings, speed: MatchSpeed): void {
  settings.matchSpeed = speed;
  saveSettings(settings);
  updateSettingsUI(settings);
}

/**
 * Toggle auto team-talk selection.
 */
export function setAutoTeamTalk(settings: Settings, enabled: boolean): void {
  settings.autoTeamTalk = enabled;
  saveSettings(settings);
  updateSettingsUI(settings);
}

/**
 * Toggle low-stamina warning behavior.
 * `enabled=true` means warnings show; `false` suppresses them.
 */
export function setStaminaWarning(settings: Settings, enabled: boolean): void {
  settings.skipLowStaminaWarning = !enabled;
  saveSettings(settings);
  updateSettingsUI(settings);
}

/**
 * Get the current difficulty multipliers based on the settings.
 *
 * @param settings - User settings
 * @returns The difficulty multipliers for the current difficulty level
 */
export function getDifficultyMultipliers(settings: Settings) {
  const difficulty = settings.difficulty || 'normal';
  return DIFFICULTY_SETTINGS[difficulty];
}

/* ================================================================
   SETTINGS ROW BUILDER (NEW)
   ================================================================ */

/**
 * Build the HTML for the difficulty selector row.
 *
 * This can be injected into the settings overlay to add the
 * difficulty toggle alongside existing settings rows.
 *
 * @returns HTML string for the difficulty settings row
 */
export function buildDifficultyRow(): string {
  /* We build plain text labels here; `hydrateIcons()` is not called on the
     settings overlay because it's pre-rendered in the DOM.  Instead we inject
     SVG icons inline via data-icon placeholders and resolve them after. */
  return `<div class="settings-row">` +
    `<span class="settings-label"><span data-icon="target"></span> Difficulty</span>` +
    `<div class="settings-toggle" id="difficulty-toggle">` +
    `<button class="stoggle-opt" data-value="easy" onclick="setDifficulty('easy')"><span data-icon="smile"></span> Easy</button>` +
    `<button class="stoggle-opt" data-value="normal" onclick="setDifficulty('normal')"><span data-icon="shield"></span> Normal</button>` +
    `<button class="stoggle-opt" data-value="hard" onclick="setDifficulty('hard')"><span data-icon="fire"></span> Hard</button>` +
    `</div>` +
    `</div>`;
}

/**
 * Build the HTML for the match speed selector row.
 *
 * @returns HTML string for match speed settings row
 */
export function buildMatchSpeedRow(): string {
  return `<div class="settings-row">` +
    `<span class="settings-label"><span data-icon="clock"></span> Match Speed</span>` +
    `<div class="settings-toggle" id="match-speed-toggle">` +
    `<button class="stoggle-opt" data-value="1" onclick="setMatchSpeedSetting(1)">1x</button>` +
    `<button class="stoggle-opt" data-value="2" onclick="setMatchSpeedSetting(2)">2x</button>` +
    `<button class="stoggle-opt" data-value="4" onclick="setMatchSpeedSetting(4)">4x</button>` +
    `</div>` +
    `</div>`;
}

/**
 * Build the auto team-talk settings row.
 */
export function buildAutoTeamTalkRow(): string {
  return `<div class="settings-row">` +
    `<span class="settings-label"><span data-icon="users"></span> Auto Team Talk</span>` +
    `<div class="settings-toggle" id="auto-team-talk-toggle">` +
    `<button class="stoggle-opt" data-value="false" onclick="setAutoTeamTalkSetting(false)">Off</button>` +
    `<button class="stoggle-opt" data-value="true" onclick="setAutoTeamTalkSetting(true)">On</button>` +
    `</div>` +
    `</div>`;
}

/**
 * Build the stamina warning settings row.
 */
export function buildStaminaWarningRow(): string {
  return `<div class="settings-row">` +
    `<span class="settings-label"><span data-icon="battery"></span> Stamina Warning</span>` +
    `<div class="settings-toggle" id="stamina-warning-toggle">` +
    `<button class="stoggle-opt" data-value="true" onclick="setStaminaWarningSetting(true)">On</button>` +
    `<button class="stoggle-opt" data-value="false" onclick="setStaminaWarningSetting(false)">Off</button>` +
    `</div>` +
    `</div>`;
}

/**
 * Inject the difficulty selector row into the settings overlay.
 *
 * Finds the settings box and inserts the difficulty row after the
 * strength display row (before the volume row). This is called once
 * during initialization to dynamically add the new setting.
 *
 * @param settings - User settings (for initial highlight sync)
 */
export function injectDifficultyRow(settings: Settings): void {
  const settingsBox = document.querySelector('.settings-box');
  if (!settingsBox) return;

  /* Check if already injected */
  if (document.getElementById('difficulty-toggle')) return;

  /* Find the strength display row (3rd settings-row) and insert after it */
  const rows = settingsBox.querySelectorAll('.settings-row');
  const strengthRow = rows[2]; /* 0=theme, 1=lang, 2=strength */
  if (strengthRow) {
    const injectionRows = [buildDifficultyRow(), buildMatchSpeedRow(), buildAutoTeamTalkRow(), buildStaminaWarningRow()];
    let cursor: Element = strengthRow;

    for (const rowHtml of injectionRows) {
      const rowWrapper = document.createElement('div');
      rowWrapper.innerHTML = rowHtml;
      const newRow = rowWrapper.firstElementChild;
      if (!newRow) continue;
      cursor.after(newRow);
      cursor = newRow;

      /* Resolve any data-icon placeholders in the injected markup */
      const hydrate = (window as unknown as { hydrateIcons?: (root?: HTMLElement | Document) => void }).hydrateIcons;
      if (typeof hydrate === 'function') hydrate(newRow as HTMLElement);
    }
  }

  /* Sync the initial highlight */
  updateSettingsUI(settings);
}
