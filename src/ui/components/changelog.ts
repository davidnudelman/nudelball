/**
 * changelog.ts -- Changelog overlay renderer.
 *
 * Renders the game changelog from the CHANGELOG data array into the
 * changelog overlay. Each version entry shows the version number,
 * title, date, and a bulleted list of changes.
 *
 * Also provides `initVersionLabels()` to populate version number
 * badges in the footer and settings panel.
 */

import type { ChangelogEntry } from '../../types';
import { CHANGELOG, GAME_VERSION } from '../../data/changelog';

/* ================================================================
   TOGGLE
   ================================================================ */

/**
 * Toggle the changelog overlay visibility.
 *
 * When opening, calls `renderChangelog()` to populate the content.
 */
export function toggleChangelog(): void {
  const overlay = document.getElementById('changelog-overlay');
  if (!overlay) return;

  const isOpen = overlay.style.display === 'flex';
  overlay.style.display = isOpen ? 'none' : 'flex';
  if (!isOpen) renderChangelog();
}

/* ================================================================
   RENDER
   ================================================================ */

/**
 * Build and insert changelog HTML from the CHANGELOG data array.
 *
 * Each entry renders as a card with:
 * - Version badge (e.g. "v2.1.0")
 * - Title (e.g. "Elifoot-Style Visuals & Market Expansion")
 * - Date (e.g. "2026-02-27")
 * - Bulleted list of changes
 */
export function renderChangelog(): void {
  const body = document.getElementById('changelog-body');
  if (!body) return;

  body.innerHTML = CHANGELOG.map((entry: ChangelogEntry) => {
    const items = entry.changes.map(c => `<li>${c}</li>`).join('');
    return `<div class="changelog-entry">` +
      `<div class="changelog-ver">` +
      `<span class="cl-version">v${entry.version}</span>` +
      `<span class="cl-title">${entry.title}</span>` +
      `<span class="cl-date">${entry.date}</span>` +
      `</div>` +
      `<ul class="changelog-list">${items}</ul>` +
      `</div>`;
  }).join('');
}

/* ================================================================
   VERSION LABELS
   ================================================================ */

/**
 * Populate version labels in the footer and settings panel.
 *
 * Sets:
 * - `#footer-version` to "vX.Y.Z"
 * - `#settings-version-label` to "(vX.Y.Z)"
 */
export function initVersionLabels(): void {
  const footerEl = document.getElementById('footer-version');
  if (footerEl) footerEl.textContent = 'v' + GAME_VERSION;

  const settingsLabel = document.getElementById('settings-version-label');
  if (settingsLabel) settingsLabel.textContent = '(v' + GAME_VERSION + ')';
}
