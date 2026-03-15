/**
 * keyboard.ts -- Global keyboard shortcuts for Nudelball.
 *
 * Provides hotkeys for:
 * - View navigation (1-9 = Dashboard, Squad, Table, Calendar, Top Scorers, Market, Cup, History, Trophy Room)
 * - Game actions (Space = Play Match / Advance Week, Escape = Close overlays)
 * - Squad-specific actions (A = Auto-pick, C = Clear selection)
 *
 * Shortcuts are suppressed when the user is typing in an input, textarea,
 * or select element to avoid interfering with form interactions.
 *
 * Usage:
 *   import { initKeyboardShortcuts, getShortcutsList } from './keyboard';
 *   initKeyboardShortcuts({ onShowView, onPlayMatch, onAutoPick, onClearSelection });
 */

import { showView } from './components/nav';

/* ================================================================
   TYPES
   ================================================================ */

/**
 * Callback functions injected by the caller so the keyboard module
 * does not need to import game logic directly.
 */
export interface KeyboardCallbacks {
  /**
   * Called when Space is pressed -- equivalent to clicking the play button.
   * The caller is responsible for checking whether a match can actually be played.
   */
  onPlayMatch?: () => void;

  /**
   * Called when 'A' is pressed while the squad view is active.
   * Should trigger the auto-pick squad logic.
   */
  onAutoPick?: () => void;

  /**
   * Called when 'C' is pressed while the squad view is active.
   * Should clear the current player selection.
   */
  onClearSelection?: () => void;

  /**
   * Optional override for view switching. If not provided, the module
   * calls `showView()` from nav.ts directly.
   */
  onShowView?: (viewName: string) => void;
}

/**
 * A single keyboard shortcut entry, used by `getShortcutsList()`.
 */
export interface ShortcutEntry {
  /** The key label displayed to the user (e.g. "1", "Space", "Escape") */
  key: string;
  /** A human-readable description of what the shortcut does */
  action: string;
}

/* ================================================================
   VIEW MAPPING
   ================================================================ */

/**
 * Maps number keys 1-9 to their corresponding view identifiers.
 *
 * These match the `data-view` attributes on the nav buttons in index.html
 * and the view IDs used by `showView()` in nav.ts.
 */
const KEY_TO_VIEW: Record<string, string> = {
  '1': 'dashboard',
  '2': 'squad',
  '3': 'table',
  '4': 'calendar',
  '5': 'scorers',
  '6': 'market',
  '7': 'cup',
  '8': 'history',
  '9': 'trophyroom',
};

/* ================================================================
   OVERLAY IDS
   ================================================================ */

/** DOM IDs of overlays that Escape should close. */
const OVERLAY_IDS = [
  'settings-overlay',
  'help-overlay',
  'changelog-overlay',
] as const;

/* ================================================================
   STATE
   ================================================================ */

/** Stored callbacks, set via `initKeyboardShortcuts()`. */
let _callbacks: KeyboardCallbacks = {};

/** Whether the listener has already been attached (prevents double-init). */
let _initialized = false;

/* ================================================================
   INTERNAL HELPERS
   ================================================================ */

/**
 * Check whether the currently focused element is a text input, textarea,
 * or select -- in which case we should NOT intercept keystrokes.
 *
 * Also checks for `contentEditable` elements to cover rich-text fields.
 */
function isTypingInFormField(): boolean {
  const active = document.activeElement;
  if (!active) return false;

  const tag = active.tagName.toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }

  /* contentEditable divs / spans */
  if ((active as HTMLElement).isContentEditable) {
    return true;
  }

  return false;
}

/**
 * Determine the currently active view by checking which nav button
 * has the `active` class and reading its `data-view` attribute.
 *
 * Returns the view name string (e.g. 'squad') or null if none is active.
 */
function getActiveView(): string | null {
  const activeBtn = document.querySelector('.nav-btn.active') as HTMLElement | null;
  return activeBtn?.dataset.view ?? null;
}

/**
 * Close any open overlay (settings, help, changelog).
 *
 * Iterates through known overlay IDs and hides any that are currently
 * displayed. Returns true if at least one overlay was closed.
 */
function closeOverlays(): boolean {
  let closedAny = false;

  for (const id of OVERLAY_IDS) {
    const overlay = document.getElementById(id);
    if (overlay && overlay.style.display === 'flex') {
      overlay.style.display = 'none';
      closedAny = true;
    }
  }

  return closedAny;
}

/**
 * Switch to the given view, using the injected callback if provided,
 * otherwise falling back to the imported `showView()` from nav.ts.
 */
function switchView(viewName: string): void {
  if (_callbacks.onShowView) {
    _callbacks.onShowView(viewName);
  } else {
    showView(viewName);
  }
}

/* ================================================================
   KEYDOWN HANDLER
   ================================================================ */

/**
 * Main keydown event handler.
 *
 * Routes keyboard events to the appropriate action based on the
 * pressed key. Ignores events when the user is typing in a form field.
 *
 * @param e - The keyboard event
 */
function handleKeyDown(e: KeyboardEvent): void {
  /* Skip if user is typing in a form field */
  if (isTypingInFormField()) return;

  /* Skip if a modifier key is held (Ctrl, Alt, Meta) -- let browser shortcuts through.
   * Shift is allowed since it does not conflict with standard browser shortcuts here. */
  if (e.ctrlKey || e.altKey || e.metaKey) return;

  const key = e.key;

  /* --- Number keys: view navigation --- */
  const viewName = KEY_TO_VIEW[key];
  if (viewName) {
    e.preventDefault();
    switchView(viewName);
    return;
  }

  /* --- Space: play match / advance week --- */
  if (key === ' ' || key === 'Spacebar') {
    e.preventDefault();

    /* Click the play button if it exists and is not disabled */
    const playBtn = document.getElementById('play-match-btn') as HTMLButtonElement | null;
    if (playBtn && !playBtn.disabled) {
      playBtn.click();
    } else if (_callbacks.onPlayMatch) {
      _callbacks.onPlayMatch();
    }
    return;
  }

  /* --- Escape: close overlays --- */
  if (key === 'Escape') {
    const closed = closeOverlays();
    if (closed) {
      e.preventDefault();
    }
    return;
  }

  /* --- Squad-specific shortcuts (only active when squad view is shown) --- */
  const activeView = getActiveView();

  if (activeView === 'squad') {
    /* A = Auto-pick squad */
    if (key === 'a' || key === 'A') {
      e.preventDefault();
      if (_callbacks.onAutoPick) {
        _callbacks.onAutoPick();
      } else {
        /* Fallback: try clicking the auto-pick button in the DOM */
        const autoPickBtn = document.querySelector<HTMLButtonElement>('[data-i18n="autoPick"]');
        if (autoPickBtn) autoPickBtn.click();
      }
      return;
    }

    /* C = Clear selection */
    if (key === 'c' || key === 'C') {
      e.preventDefault();
      if (_callbacks.onClearSelection) {
        _callbacks.onClearSelection();
      } else {
        /* Fallback: try clicking the clear button in the DOM */
        const clearBtn = document.querySelector<HTMLButtonElement>('[data-i18n="clear"]');
        if (clearBtn) clearBtn.click();
      }
      return;
    }
  }
}

/* ================================================================
   PUBLIC API
   ================================================================ */

/**
 * Initialize global keyboard shortcuts.
 *
 * Attaches a single `keydown` listener on `document` that routes key
 * presses to game actions. Safe to call multiple times -- only the
 * first call attaches the listener; subsequent calls update callbacks.
 *
 * @param callbacks - Optional callback functions for game actions.
 *   If omitted, the module uses reasonable defaults (showView from nav.ts,
 *   DOM button clicks for play/auto-pick/clear).
 *
 * @example
 * ```ts
 * initKeyboardShortcuts({
 *   onPlayMatch: () => playMatch(),
 *   onAutoPick:  () => autoPick(),
 *   onClearSelection: () => clearSelection(),
 * });
 * ```
 */
export function initKeyboardShortcuts(callbacks?: KeyboardCallbacks): void {
  if (callbacks) {
    _callbacks = callbacks;
  }

  if (_initialized) return;

  document.addEventListener('keydown', handleKeyDown);
  _initialized = true;
}

/**
 * Remove the global keyboard shortcut listener.
 *
 * Useful for cleanup in tests or when transitioning away from the game.
 */
export function destroyKeyboardShortcuts(): void {
  if (!_initialized) return;

  document.removeEventListener('keydown', handleKeyDown);
  _initialized = false;
  _callbacks = {};
}

/**
 * Get the full list of keyboard shortcuts for display in help screens.
 *
 * Returns an array of `{ key, action }` objects sorted by category:
 * navigation first, then game actions, then squad-specific.
 *
 * @returns Array of shortcut entries
 *
 * @example
 * ```ts
 * const shortcuts = getShortcutsList();
 * // [
 * //   { key: '1', action: 'Dashboard view' },
 * //   { key: '2', action: 'Squad view' },
 * //   ...
 * // ]
 * ```
 */
export function getShortcutsList(): ShortcutEntry[] {
  return [
    /* Navigation */
    { key: '1', action: 'Dashboard view' },
    { key: '2', action: 'Squad view' },
    { key: '3', action: 'Table view' },
    { key: '4', action: 'Calendar view' },
    { key: '5', action: 'Top Scorers view' },
    { key: '6', action: 'Market view' },
    { key: '7', action: 'Cup view' },
    { key: '8', action: 'History view' },
    { key: '9', action: 'Trophy Room view' },

    /* Game actions */
    { key: 'Space', action: 'Play Match / Advance Week' },
    { key: 'Escape', action: 'Close overlay (Settings, Help, Changelog)' },

    /* Squad-specific */
    { key: 'A', action: 'Auto-pick squad (Squad view only)' },
    { key: 'C', action: 'Clear selection (Squad view only)' },
  ];
}
