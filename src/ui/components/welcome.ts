/**
 * welcome.ts -- Welcome screen, team picker, and save slot UI.
 *
 * Handles the initial game boot flow:
 * - Team picker grid (grouped by division)
 * - Team selection, manager name input, team rename
 * - Start new game / continue saved game
 * - NEW: Save slot panel showing existing saves with load/delete actions
 *
 * The welcome screen is the first thing the player sees. If a previous
 * save exists, the "Continue Game" button is shown instead of the
 * new-game form. The new save slot panel lets players manage multiple
 * save files from the welcome screen.
 */

import type { GameState, Settings, SaveSlot } from '../../types';
import { teamLabel, clearPlateCache } from '../../utils/helpers';
import { t } from '../../data/i18n';
import { listSaveSlots } from '../../state/save-manager';

/* ================================================================
   TEAM PICKER
   ================================================================ */

/**
 * Render the team picker grid grouped by division.
 *
 * Teams are already assigned to randomised divisions during `initNewGame()`,
 * so we display them grouped by division so the player can see the league
 * structure before choosing.
 *
 * @param G        - The current game state (for teams and playerTeamId)
 * @param settings - User settings (for i18n)
 */
export function renderTeamPicker(G: GameState, settings: Settings): void {
  const picker = document.getElementById('team-picker');
  if (!picker) return;

  let h = '';
  for (let d = 1; d <= 4; d++) {
    const divTeams = G.teams
      .filter(tm => tm.div === d)
      .sort((a, b) => a.name.localeCompare(b.name));
    if (divTeams.length === 0) continue;

    h += `<div class="tp-div"><div class="tp-label">${t(settings, 'div')} ${d}</div><div class="tp-grid">`;
    for (const tm of divTeams) {
      const sel = tm.id === G.playerTeamId ? 'selected' : '';
      h += `<div class="tp-card ${sel}" onclick="selectTeam(${tm.id})">${teamLabel(tm)}</div>`;
    }
    h += '</div></div>';
  }
  picker.innerHTML = h;
}

/* ================================================================
   TEAM SELECTION
   ================================================================ */

/**
 * Handle team selection from the picker.
 *
 * Sets the player's team ID, updates the selection highlight,
 * shows the team info/rename section, and checks start readiness.
 *
 * @param G      - The current game state (mutated: sets playerTeamId)
 * @param teamId - ID of the selected team
 * @param event  - The click event (for currentTarget highlighting)
 */
export function selectTeam(G: GameState, teamId: number, event?: Event): void {
  G.playerTeamId = teamId;
  const team = G.teams[teamId];

  /* Update selected highlight on all picker cards */
  document.querySelectorAll('.tp-card').forEach(c => c.classList.remove('selected'));
  if (event && event.currentTarget) {
    (event.currentTarget as HTMLElement).classList.add('selected');
  }

  /* Show selected team info + rename input */
  const selBox = document.getElementById('team-selected');
  if (selBox) {
    selBox.style.display = 'block';
    const assignedEl = document.getElementById('assigned-team');
    if (assignedEl) assignedEl.innerHTML = teamLabel(team);
    const renameInput = document.getElementById('team-rename') as HTMLInputElement | null;
    if (renameInput) renameInput.value = team.name;

    /* Populate color pickers with team's current colors */
    const c1Input = document.getElementById('team-color-c1') as HTMLInputElement | null;
    const c2Input = document.getElementById('team-color-c2') as HTMLInputElement | null;
    if (c1Input) c1Input.value = team.c1;
    if (c2Input) c2Input.value = team.c2;
  }

  /* Show the manager name input (positioned after team customization) */
  const managerGroup = document.querySelector('.manager-input-group') as HTMLElement | null;
  if (managerGroup) {
    managerGroup.style.display = 'block';
    const nameInput = document.getElementById('manager-name') as HTMLInputElement | null;
    if (nameInput) nameInput.focus();
  }

  /* Check if start button should be enabled */
  checkStartReady();
}

/* ================================================================
   START READINESS CHECK
   ================================================================ */

/**
 * Check if both manager name and team are selected, enabling the start button.
 *
 * The start button is enabled when:
 * - Manager name input has at least 1 character (trimmed)
 * - A team has been selected (playerTeamId is not null)
 */
export function checkStartReady(): void {
  const nameInput = document.getElementById('manager-name') as HTMLInputElement | null;
  const startBtn = document.getElementById('start-btn') as HTMLButtonElement | null;
  if (!nameInput || !startBtn) return;

  const hasName = nameInput.value.trim().length >= 1;
  const gameStateRaw = (window as unknown as Record<string, unknown>).G as GameState | undefined;
  const hasTeam = gameStateRaw ? gameStateRaw.playerTeamId !== null : false;

  startBtn.disabled = !(hasName && hasTeam);
}

/* ================================================================
   WELCOME SCREEN BOOT
   ================================================================ */

/**
 * Callbacks for welcome screen interactions.
 *
 * These are provided by the main module so the welcome screen can
 * trigger game-level operations (loading, saving, entering the game).
 */
export interface WelcomeCallbacks {
  /** Load the game from legacy save. Returns true/false/'incompatible'. */
  loadGame: () => true | false | 'incompatible';
  /** Delete the legacy save */
  deleteSave: () => void;
  /** Initialize a new game (reset G to defaults, randomise divisions) */
  initNewGame: () => void;
  /** Post-init setup (assign rivals, generate youth prospects) */
  postInit: () => void;
  /** Save the current game state */
  saveGame: () => void;
  /** Enter the game (transition from welcome to main UI) */
  enterGame: () => void;
  /** Load from a specific save slot */
  loadFromSlot: (slotId: number) => boolean;
  /** Delete a specific save slot */
  deleteSlot: (slotId: number) => void;
}

/**
 * Set up the welcome screen logic.
 *
 * This is called once on app boot. It:
 * 1. Checks for existing saves
 * 2. Shows continue or new-game UI accordingly
 * 3. Binds event listeners to inputs and buttons
 * 4. Renders save slots if any exist
 *
 * @param G         - The current game state
 * @param settings  - User settings (for i18n and alert messages)
 * @param callbacks - Functions to invoke for game operations
 */
export function bootWelcome(
  G: GameState,
  settings: Settings,
  callbacks: WelcomeCallbacks,
): void {
  const nameInput = document.getElementById('manager-name') as HTMLInputElement | null;
  const startBtn = document.getElementById('start-btn') as HTMLButtonElement | null;
  const continueBtn = document.getElementById('continue-btn') as HTMLButtonElement | null;
  const newGameBtn = document.getElementById('newgame-btn') as HTMLButtonElement | null;
  const teamRenameInput = document.getElementById('team-rename') as HTMLInputElement | null;

  if (!nameInput || !startBtn) return;

  /* Try to load existing save */
  const hasSave = callbacks.loadGame();

  if (hasSave === 'incompatible') {
    /* Old save format detected -- show message and start fresh */
    alert(t(settings, 'incompatibleSave'));
    callbacks.initNewGame();
    renderTeamPicker(G, settings);
  } else if (hasSave && G.manager) {
    /* Valid save found -- show continue UI */
    const welcomeNew = document.getElementById('welcome-new');
    if (welcomeNew) welcomeNew.style.display = 'none';
    const welcomeContinue = document.getElementById('welcome-continue');
    if (welcomeContinue) welcomeContinue.style.display = 'block';
  } else {
    /* No save -- show new game UI */
    callbacks.initNewGame();
    renderTeamPicker(G, settings);
  }

  /* Bind input listeners */
  nameInput.addEventListener('input', checkStartReady);
  nameInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !startBtn.disabled) {
      startNewGame(G, settings, callbacks);
    }
  });

  /* Start button */
  startBtn.addEventListener('click', () => {
    startNewGame(G, settings, callbacks);
  });

  /* Continue button */
  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      callbacks.enterGame();
    });
  }

  /* New Game button (from continue screen) */
  if (newGameBtn) {
    newGameBtn.addEventListener('click', () => {
      callbacks.deleteSave();
      callbacks.initNewGame();

      const welcomeNew = document.getElementById('welcome-new');
      if (welcomeNew) welcomeNew.style.display = 'block';
      const welcomeContinue = document.getElementById('welcome-continue');
      if (welcomeContinue) welcomeContinue.style.display = 'none';
      const teamSelected = document.getElementById('team-selected');
      if (teamSelected) teamSelected.style.display = 'none';
      const managerGroup = document.querySelector('.manager-input-group') as HTMLElement | null;
      if (managerGroup) managerGroup.style.display = 'none';

      renderTeamPicker(G, settings);
      nameInput.value = '';
      startBtn.disabled = true;
    });
  }

  /* Color picker live preview */
  const c1Input = document.getElementById('team-color-c1') as HTMLInputElement | null;
  const c2Input = document.getElementById('team-color-c2') as HTMLInputElement | null;
  const updateColorPreview = (): void => {
    if (!c1Input || !c2Input || G.playerTeamId === null) return;
    G.teams[G.playerTeamId].c1 = c1Input.value;
    G.teams[G.playerTeamId].c2 = c2Input.value;
    clearPlateCache();
    const assignedEl = document.getElementById('assigned-team');
    if (assignedEl) assignedEl.innerHTML = teamLabel(G.teams[G.playerTeamId]);
  };
  if (c1Input) c1Input.addEventListener('input', updateColorPreview);
  if (c2Input) c2Input.addEventListener('input', updateColorPreview);

  /* Render save slots panel (NEW) */
  renderSaveSlots(settings, callbacks);
}

/* ================================================================
   START NEW GAME
   ================================================================ */

/**
 * Start a new game with the entered manager name and selected team.
 *
 * Applies the team rename if changed, sets initial UI state tabs,
 * generates the cup bracket, saves, and enters the game.
 *
 * @param G         - The current game state (mutated)
 * @param settings  - User settings
 * @param callbacks - Game operation callbacks
 */
function startNewGame(
  G: GameState,
  settings: Settings,
  callbacks: WelcomeCallbacks,
): void {
  const nameInput = document.getElementById('manager-name') as HTMLInputElement | null;
  const teamRenameInput = document.getElementById('team-rename') as HTMLInputElement | null;

  if (!nameInput) return;

  G.manager = nameInput.value.trim();
  if (!G.manager || G.playerTeamId === null) return;

  /* Apply team rename if changed */
  if (teamRenameInput) {
    const rename = teamRenameInput.value.trim();
    if (rename && rename !== G.teams[G.playerTeamId].name) {
      G.teams[G.playerTeamId].name = rename;
    }
  }

  /* Apply custom team colors if changed */
  const c1Input = document.getElementById('team-color-c1') as HTMLInputElement | null;
  const c2Input = document.getElementById('team-color-c2') as HTMLInputElement | null;
  if (c1Input && c2Input) {
    G.teams[G.playerTeamId].c1 = c1Input.value;
    G.teams[G.playerTeamId].c2 = c2Input.value;
    clearPlateCache();
  }

  /* Set initial UI state based on the player's pre-assigned division */
  G.tableDivTab = G.teams[G.playerTeamId].div;
  G.calDivTab = G.teams[G.playerTeamId].div;
  G.scorersDivTab = 0;

  /* Set initial highest division to the player's starting division */
  if (G.records) {
    G.records.highestDiv = G.teams[G.playerTeamId].div;
  }

  /* Post-init: assign rivals, generate youth prospects */
  callbacks.postInit();
  callbacks.saveGame();
  callbacks.enterGame();
}

/* ================================================================
   SAVE SLOTS UI (NEW)
   ================================================================ */

/**
 * Render the save slots panel on the welcome screen.
 *
 * Shows existing save slots (if any) with metadata such as manager name,
 * team, season, and last-saved timestamp. Each slot has Load and Delete
 * buttons.
 *
 * The panel is injected after the welcome buttons area. If no saves exist,
 * nothing is rendered.
 *
 * @param settings  - User settings (for i18n)
 * @param callbacks - Game operation callbacks
 */
export function renderSaveSlots(
  settings: Settings,
  callbacks: WelcomeCallbacks,
): void {
  /* Find or create the save slots container */
  let container = document.getElementById('save-slots-panel');
  if (!container) {
    /* Create the container and insert it in the welcome box */
    const welcomeBox = document.querySelector('.welcome-box');
    if (!welcomeBox) return;

    container = document.createElement('div');
    container.id = 'save-slots-panel';
    container.className = 'save-slots-panel';

    /* Insert before the footer */
    const footer = welcomeBox.querySelector('.welcome-footer');
    if (footer) {
      welcomeBox.insertBefore(container, footer);
    } else {
      welcomeBox.appendChild(container);
    }
  }

  /* Get all save slots */
  const slots = listSaveSlots();
  if (slots.length === 0) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';

  let h = `<div class="save-slots-title">\uD83D\uDCBE Saved Games</div>`;
  h += `<div class="save-slots-list">`;

  for (const slot of slots) {
    const slotId = parseInt(slot.id, 10);
    const isAuto = slotId === 0;
    const label = isAuto ? '\uD83D\uDD04 Autosave' : `\uD83D\uDCBE ${slot.name || ('Slot ' + slot.id)}`;

    /* Format the timestamp */
    let timeStr = '';
    if (slot.timestamp) {
      try {
        const date = new Date(slot.timestamp);
        timeStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch {
        timeStr = slot.timestamp;
      }
    }

    /* Extract metadata from the save data if available */
    let metaStr = '';
    if (slot.data && slot.data.manager) {
      const managerName = slot.data.manager;
      const teamName = slot.data.teams && slot.data.playerTeamId != null
        ? slot.data.teams[slot.data.playerTeamId]?.name || '?'
        : '?';
      const season = slot.data.season || '?';
      metaStr = `${managerName} \u2014 ${teamName} \u2014 S${season}`;
    }

    h += `<div class="save-slot-row">` +
      `<div class="save-slot-info">` +
      `<div class="save-slot-label">${label}</div>` +
      (metaStr ? `<div class="save-slot-meta">${metaStr}</div>` : '') +
      (timeStr ? `<div class="save-slot-time">${timeStr}</div>` : '') +
      `</div>` +
      `<div class="save-slot-actions">` +
      `<button class="save-slot-btn save-slot-load" onclick="loadSaveSlot(${slotId})">Load</button>` +
      `<button class="save-slot-btn save-slot-delete" onclick="deleteSaveSlot(${slotId})">\u2715</button>` +
      `</div>` +
      `</div>`;
  }

  h += `</div>`;
  container.innerHTML = h;
}

/**
 * Build the save slot management HTML for injection into other views.
 *
 * This can be used to show save/load UI from within the game
 * (e.g. from the settings panel or a dedicated save menu).
 *
 * @param settings - User settings
 * @returns HTML string for the save slots panel
 */
export function buildSaveSlotsHTML(settings: Settings): string {
  const slots = listSaveSlots();

  let h = `<div class="save-slots-section">`;
  h += `<div class="save-slots-title">\uD83D\uDCBE Save Slots</div>`;

  /* Render existing slots */
  if (slots.length === 0) {
    h += `<p style="color:var(--text-dim);font-size:.85rem;padding:8px 0">No saved games yet.</p>`;
  } else {
    for (const slot of slots) {
      const slotId = parseInt(slot.id, 10);
      const isAuto = slotId === 0;
      const label = isAuto ? '\uD83D\uDD04 Autosave' : `Slot ${slot.id}: ${slot.name || 'Unnamed'}`;

      let timeStr = '';
      if (slot.timestamp) {
        try {
          const date = new Date(slot.timestamp);
          timeStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
          timeStr = slot.timestamp;
        }
      }

      h += `<div class="save-slot-row">` +
        `<div class="save-slot-info">` +
        `<span class="save-slot-label">${label}</span>` +
        (timeStr ? `<span class="save-slot-time">${timeStr}</span>` : '') +
        `</div>` +
        `<div class="save-slot-actions">` +
        `<button class="save-slot-btn" onclick="loadSaveSlot(${slotId})">Load</button>` +
        `<button class="save-slot-btn" onclick="saveToSlot(${slotId})">Overwrite</button>` +
        `<button class="save-slot-btn save-slot-delete" onclick="deleteSaveSlot(${slotId})">\u2715</button>` +
        `</div>` +
        `</div>`;
    }
  }

  /* Quick save to new slot (slots 1-4) */
  const usedIds = new Set(slots.map(s => parseInt(s.id, 10)));
  let nextFreeSlot: number | null = null;
  for (let i = 1; i <= 4; i++) {
    if (!usedIds.has(i)) {
      nextFreeSlot = i;
      break;
    }
  }

  if (nextFreeSlot !== null) {
    h += `<div class="save-slot-new">` +
      `<button class="save-slot-btn save-slot-save" onclick="quickSaveToSlot(${nextFreeSlot})">` +
      `\uD83D\uDCBE Save to Slot ${nextFreeSlot}</button>` +
      `</div>`;
  }

  h += `</div>`;
  return h;
}
