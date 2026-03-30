/**
 * save-manager.ts -- Save/load system with multi-slot and export/import support.
 *
 * This module handles all persistence for the Park the Bus game:
 *
 * **Legacy (single save):**
 *   - `saveGame()`   -- serialise `G` to localStorage under SAVE_KEY.
 *   - `loadGame()`   -- restore `G` from localStorage with backward compatibility.
 *   - `deleteSave()` -- remove the legacy save from localStorage.
 *
 * **Multi-slot saves (NEW):**
 *   - Up to 5 save slots (slot 0 = autosave, slots 1-4 = manual).
 *   - `listSaveSlots()` / `saveToSlot()` / `loadFromSlot()` / `deleteSlot()`
 *   - `getAutoSaveSlot()` -- convenience accessor for the autosave (slot 0).
 *
 * **Export / Import (NEW):**
 *   - `exportSave()`       -- serialise current state to a JSON string.
 *   - `importSave(json)`   -- validate and hydrate state from a JSON string.
 *   - `downloadSave()`     -- trigger a browser file download of the save.
 *   - `createImportHandler()` -- returns a file-input change handler for importing.
 *
 * All functions read/write the shared `G` object from `./game-state`.
 */

import type { GameState, Records, SaveSlot } from '../types';
import {
  DEFAULT_FORMATION_IDX,
  FORMATIONS,
  GAME_VERSION,
  SAVE_KEY,
} from '../config';
import { migratePlayer, rand } from '../engine/player';
import { G, defaultRecords, initBudgets } from './game-state';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** localStorage key that stores the array of save-slot metadata. */
export const SAVE_SLOTS_KEY = 'pitchboss_save_slots';

/** localStorage key prefix for individual slot data: "pitchboss_slot_0", etc. */
const SLOT_DATA_PREFIX = 'pitchboss_slot_';

/** Maximum number of save slots (0 = autosave, 1-4 = manual). */
const MAX_SLOTS = 5;

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Build the localStorage key for a specific slot's game data.
 *
 * @param slotId - Slot number (0-4).
 * @returns The localStorage key string.
 */
const slotKey = (slotId: number): string => `${SLOT_DATA_PREFIX}${slotId}`;

/**
 * Read the slot index array from localStorage.
 *
 * @returns The array of SaveSlot metadata objects (may be empty).
 */
const readSlotIndex = (): SaveSlot[] => {
  try {
    const raw = localStorage.getItem(SAVE_SLOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Write the slot index array to localStorage.
 *
 * @param slots - The array of SaveSlot metadata to persist.
 */
const writeSlotIndex = (slots: SaveSlot[]): void => {
  try {
    localStorage.setItem(SAVE_SLOTS_KEY, JSON.stringify(slots));
  } catch (e) {
    console.warn('Failed to write save slot index', e);
  }
};

// ---------------------------------------------------------------------------
// Backward Compatibility: Migrate Old Saves
// ---------------------------------------------------------------------------

/**
 * Apply backward-compatibility patches to a loaded game state.
 *
 * Older saves may lack fields added in v2.0 or v2.1. This function ensures
 * every expected property exists with a sensible default, and migrates all
 * player objects to include v2.0 stat tracking fields.
 *
 * @param state - The game state to patch (mutated in-place).
 */
const applyBackwardCompat = (state: GameState): void => {
  /* Reset transient match state -- an animated match can't be restored from save */
  state.matchInProgress = false;

  /* Clear any stale subbedIn flags from players */
  for (const tm of state.teams) {
    if (tm && tm.players) {
      for (const p of tm.players) {
        delete p.subbedIn;
      }
    }
  }

  /* Ensure market fields exist */
  if (!state.freeAgents) state.freeAgents = [];
  if (!state.budgets) {
    state.budgets = {};
    /* Re-assign G temporarily so initBudgets can see the teams */
    Object.assign(G, state);
    initBudgets();
    state.budgets = G.budgets;
  }
  if (state.transferWindow === undefined) state.transferWindow = false;
  if (!state.transferLog) state.transferLog = [];
  if (!state.seasonHistory) state.seasonHistory = [];
  if (state.usedFreeSign === undefined) state.usedFreeSign = false;

  /* Trophy Room records */
  if (!state.records) {
    state.records = defaultRecords();
  } else {
    const def = defaultRecords();
    /* Patch any missing top-level record fields */
    const recAny = state.records as unknown as Record<string, unknown>;
    const defAny = def as unknown as Record<string, unknown>;
    for (const k of Object.keys(def)) {
      if (recAny[k] === undefined) {
        recAny[k] = defAny[k];
      }
    }
    /* Patch league sub-records */
    if (!state.records.league) {
      state.records.league = def.league;
    } else {
      const leagueAny = state.records.league as unknown as Record<string, unknown>;
      const defLeagueAny = def.league as unknown as Record<string, unknown>;
      for (const k of Object.keys(def.league)) {
        if (leagueAny[k] === undefined) {
          leagueAny[k] = defLeagueAny[k];
        }
      }
    }
    if (!state.records.hallOfFame) state.records.hallOfFame = {};
  }

  /* Formation system */
  if (state.selectedFormationIdx === undefined) {
    state.selectedFormationIdx = DEFAULT_FORMATION_IDX;
  }
  for (const tm of state.teams) {
    if (tm.aiFormation === undefined) {
      tm.aiFormation = rand(0, FORMATIONS.length - 1);
    }
    /* Migrate all player objects to include v2.0 fields */
    for (const p of tm.players) {
      migratePlayer(p);
    }
  }

  /* v2.0 fields */
  if (!state.tactic) state.tactic = 'balanced';
  if (!state.trainingFocus) state.trainingFocus = 'balanced';
  if (state.matchSubs == null) state.matchSubs = 0;
  if (!state.matchRedCards) state.matchRedCards = [];
};

// ---------------------------------------------------------------------------
// Legacy Save / Load / Delete
// ---------------------------------------------------------------------------

/**
 * Save the current game state to localStorage under the legacy key.
 *
 * This is the primary save mechanism used during gameplay (autosave after
 * each action). Failures are caught and logged but not surfaced to the player.
 */
export const saveGame = (): void => {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(G));
  } catch (e) {
    console.warn('Save failed', e);
  }
};

/**
 * Load the game state from the legacy localStorage key.
 *
 * On success, `G` is hydrated with the saved data and backward-compatibility
 * patches are applied. Returns a discriminated result:
 *   - `true`           -- save loaded successfully.
 *   - `false`          -- no save found.
 *   - `'incompatible'` -- old v1 save with incompatible format (cleared automatically).
 *
 * @returns Load result indicator.
 */
export const loadGame = (): true | false | 'incompatible' => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;

    const data = JSON.parse(raw) as Partial<GameState>;
    if (!data || !data.teams || !data.manager) return false;

    /* Detect old save format: v1 had a `skills` object instead of single `skill` number */
    if (data.teams.length && data.teams[0].players && data.teams[0].players.length) {
      const sample = data.teams[0].players[0] as unknown as Record<string, unknown>;
      if (sample.skills && typeof sample.skills === 'object') {
        /* Incompatible save -- clear it and bail */
        localStorage.removeItem(SAVE_KEY);
        return 'incompatible';
      }
    }

    /* Hydrate the global state */
    Object.assign(G, data);

    /* Apply backward-compat patches */
    applyBackwardCompat(G);

    return true;
  } catch {
    return false;
  }
};

/**
 * Delete the legacy save from localStorage.
 */
export const deleteSave = (): void => {
  localStorage.removeItem(SAVE_KEY);
};

// ---------------------------------------------------------------------------
// Multi-Slot Save System
// ---------------------------------------------------------------------------

/**
 * List all existing save slots.
 *
 * Returns an array of `SaveSlot` objects sorted by slot ID (0 first).
 * Slot 0 is always the autosave slot; slots 1-4 are manual saves.
 *
 * @returns Array of save slot metadata (may be empty).
 */
export const listSaveSlots = (): SaveSlot[] => {
  return readSlotIndex().sort((a, b) => {
    /* Sort numerically by the slot ID string (e.g. "0", "1", "2") */
    return parseInt(a.id, 10) - parseInt(b.id, 10);
  });
};

/**
 * Save the current game state to a specific numbered slot.
 *
 * The game data is stored in a separate localStorage key per slot, while
 * the slot index (names + timestamps) is maintained in SAVE_SLOTS_KEY.
 *
 * @param slotId - Slot number (0 = autosave, 1-4 = manual).
 * @param name   - User-friendly label for this save (e.g. "Barcelona Run").
 */
export const saveToSlot = (slotId: number, name: string): void => {
  if (slotId < 0 || slotId >= MAX_SLOTS) {
    console.warn(`Invalid slot ID: ${slotId}. Must be 0-${MAX_SLOTS - 1}.`);
    return;
  }

  const timestamp = new Date().toISOString();

  /* Create the slot metadata */
  const slot: SaveSlot = {
    id: String(slotId),
    name,
    timestamp,
    data: { ...G } as GameState,
  };

  /* Write the actual game data to its own key */
  try {
    localStorage.setItem(slotKey(slotId), JSON.stringify(G));
  } catch (e) {
    console.warn(`Failed to save slot ${slotId}`, e);
    return;
  }

  /* Update the slot index */
  const slots = readSlotIndex();
  const existingIdx = slots.findIndex(s => s.id === String(slotId));
  /* For the index, store metadata only (data field is populated on load) */
  const indexEntry: SaveSlot = {
    id: String(slotId),
    name,
    timestamp,
    data: {} as GameState, /* placeholder -- full data lives in separate key */
  };
  if (existingIdx >= 0) {
    slots[existingIdx] = indexEntry;
  } else {
    slots.push(indexEntry);
  }
  writeSlotIndex(slots);
};

/**
 * Load the game state from a specific save slot.
 *
 * On success, `G` is hydrated with the slot's data and backward-compat
 * patches are applied. Returns `true` on success, `false` on failure.
 *
 * @param slotId - Slot number (0-4).
 * @returns Whether the load succeeded.
 */
export const loadFromSlot = (slotId: number): boolean => {
  if (slotId < 0 || slotId >= MAX_SLOTS) return false;

  try {
    const raw = localStorage.getItem(slotKey(slotId));
    if (!raw) return false;

    const data = JSON.parse(raw) as Partial<GameState>;
    if (!data || !data.teams || !data.manager) return false;

    /* Hydrate the global state */
    Object.assign(G, data);
    applyBackwardCompat(G);

    return true;
  } catch {
    return false;
  }
};

/**
 * Delete a save slot and its associated data.
 *
 * Removes both the slot data from localStorage and the entry from the
 * slot index.
 *
 * @param slotId - Slot number (0-4).
 */
export const deleteSlot = (slotId: number): void => {
  if (slotId < 0 || slotId >= MAX_SLOTS) return;

  /* Remove the data */
  localStorage.removeItem(slotKey(slotId));

  /* Update the index */
  const slots = readSlotIndex().filter(s => s.id !== String(slotId));
  writeSlotIndex(slots);
};

/**
 * Get the autosave slot (slot 0) metadata, if it exists.
 *
 * @returns The autosave SaveSlot or null if no autosave exists.
 */
export const getAutoSaveSlot = (): SaveSlot | null => {
  const slots = readSlotIndex();
  const autoSlot = slots.find(s => s.id === '0');
  if (!autoSlot) return null;

  /* Hydrate with actual data from storage */
  try {
    const raw = localStorage.getItem(slotKey(0));
    if (raw) {
      autoSlot.data = JSON.parse(raw) as GameState;
    }
  } catch {
    /* If data can't be read, return the metadata-only entry */
  }

  return autoSlot;
};

// ---------------------------------------------------------------------------
// Export / Import
// ---------------------------------------------------------------------------

/**
 * Export the current game state as a JSON string.
 *
 * The exported object is an envelope containing the game version and the
 * full state, making it possible to detect version mismatches on import.
 *
 * @returns A JSON string representing the current game state.
 */
export const exportSave = (): string => {
  const envelope = {
    version: GAME_VERSION,
    exportedAt: new Date().toISOString(),
    state: G,
  };
  return JSON.stringify(envelope, null, 2);
};

/**
 * Import a game state from a JSON string.
 *
 * Validates that the input is well-formed JSON containing a recognisable
 * game state (with `teams` and `manager` fields). Supports both the
 * envelope format (from `exportSave()`) and raw state objects.
 *
 * On success, `G` is hydrated with the imported data and backward-compat
 * patches are applied.
 *
 * @param json - The JSON string to import.
 * @returns `true` if the import succeeded, `false` if validation failed.
 */
export const importSave = (json: string): boolean => {
  try {
    const parsed = JSON.parse(json);

    /* Support both envelope format { version, state } and raw state */
    let data: Partial<GameState>;
    if (parsed.state && parsed.state.teams) {
      data = parsed.state;
    } else if (parsed.teams) {
      data = parsed;
    } else {
      return false;
    }

    /* Basic validation */
    if (!data.teams || !data.manager) return false;
    if (!Array.isArray(data.teams) || data.teams.length === 0) return false;

    /* Hydrate the global state */
    Object.assign(G, data);
    applyBackwardCompat(G);

    return true;
  } catch {
    return false;
  }
};

/**
 * Trigger a browser download of the current game state as a `.json` file.
 *
 * Creates a temporary anchor element, generates a Blob URL from the
 * exported save data, clicks the link to start the download, and cleans up.
 * The filename includes the manager name and season for easy identification.
 */
export const downloadSave = (): void => {
  const json = exportSave();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  /* Build a descriptive filename */
  const safeName = (G.manager || 'pitchboss')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 30);
  const filename = `pitchboss_${safeName}_S${G.season}.json`;

  /* Create a temporary link and trigger the download */
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();

  /* Cleanup */
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};

/**
 * Create a file-input change handler for importing saves.
 *
 * Returns a function suitable as an `<input type="file">` change event
 * handler. When the user selects a `.json` file, it reads the contents,
 * attempts an import, and calls the provided callback with the result.
 *
 * Usage:
 * ```ts
 * const fileInput = document.getElementById('import-input') as HTMLInputElement;
 * fileInput.addEventListener('change', createImportHandler((success) => {
 *   if (success) {
 *     alert('Save imported successfully!');
 *     refreshAll();
 *   } else {
 *     alert('Invalid save file.');
 *   }
 * }));
 * ```
 *
 * @param callback - Called with `true` on successful import, `false` on failure.
 * @returns An event handler function for `<input type="file">` change events.
 */
export const createImportHandler = (
  callback: (success: boolean) => void,
): ((event: Event) => void) => {
  return (event: Event): void => {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      callback(false);
      return;
    }

    const file = input.files[0];

    /* Reject obviously wrong file types */
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      callback(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = (): void => {
      const text = reader.result as string;
      const success = importSave(text);
      callback(success);
    };
    reader.onerror = (): void => {
      callback(false);
    };
    reader.readAsText(file);

    /* Reset the input so the same file can be selected again */
    input.value = '';
  };
};
