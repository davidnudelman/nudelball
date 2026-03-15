/**
 * table.ts — League table view renderer.
 *
 * Renders the full league table with division tabs,
 * reusing buildTableHTML from the dashboard module.
 */

import type { GameState, Settings, Team } from '../../types';
import { t } from '../../data/i18n';
import { buildTableHTML } from './dashboard';

/**
 * Render the league table view with division tabs.
 *
 * Creates tab buttons for divisions 1-4 and renders the selected
 * division's standings table inside `#table-card`.
 *
 * @param G        - The current game state
 * @param settings - User settings (for i18n)
 * @param teamLabelWithTrophiesFn - Function to render team labels with trophy icons
 */
export function renderTableView(
  G: GameState,
  settings: Settings,
  teamLabelWithTrophiesFn: (tm: Team) => string,
): void {
  const tabs = document.getElementById('table-div-tabs');
  if (!tabs) return;

  tabs.innerHTML = '';
  for (let d = 1; d <= 4; d++) {
    const btn = document.createElement('button');
    btn.className = 'div-tab' + (d === G.tableDivTab ? ' active' : '');
    btn.textContent = t(settings, 'division') + ' ' + d;
    btn.onclick = () => {
      G.tableDivTab = d;
      renderTableView(G, settings, teamLabelWithTrophiesFn);
    };
    tabs.appendChild(btn);
  }

  const tableCard = document.getElementById('table-card');
  if (tableCard) {
    tableCard.innerHTML =
      `<div class="card-title">${t(settings, 'division')} ${G.tableDivTab} ${t(settings, 'standings')} — ${t(settings, 'season')} ${G.season}</div>` +
      buildTableHTML(G, settings, G.tableDivTab, teamLabelWithTrophiesFn);
  }
}
