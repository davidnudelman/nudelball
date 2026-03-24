/**
 * history.ts — Season history view renderer.
 *
 * Renders a table of completed season summaries showing
 * champions, runner-ups, cup winners, and top scorers.
 */

import type { GameState, Settings } from '../../types';
import { teamPlate } from '../../utils/helpers';
import { t } from '../../data/i18n';

/**
 * Render the season history view into the DOM.
 *
 * Displays a table with one row per completed season, showing:
 * - Div 1 Champion / Runner-up
 * - Div 2 Champion / Runner-up
 * - Cup Winner
 * - Top Scorer (with team and goals)
 *
 * Team names use coloured name plates when the team still exists.
 *
 * @param G        - The current game state
 * @param settings - User settings (for i18n)
 */
export function renderHistory(G: GameState, settings: Settings): void {
  const card = document.getElementById('history-card');
  if (!card) return;

  const history = G.seasonHistory || [];
  let h = `<div class="card-title">&#127942; ${t(settings, 'seasonHistory')}</div>`;

  if (!history.length) {
    h += `<p class="history-empty">${t(settings, 'noHistoryYet')}</p>`;
    card.innerHTML = h;
    return;
  }

  h += '<table class="history-table"><thead><tr>';
  h += `<th style="text-align:center">${t(settings, 'thSeason')}</th>`;
  h += `<th>${t(settings, 'div1Champion')}</th>`;
  h += `<th>${t(settings, 'div1RunnerUp')}</th>`;
  h += `<th>${t(settings, 'div2Champion')}</th>`;
  h += `<th>${t(settings, 'div2RunnerUp')}</th>`;
  h += `<th>${t(settings, 'topScorerHeader')}</th>`;
  h += '</tr></thead><tbody>';

  for (const rec of history) {
    h += '<tr>';
    h += `<td class="season-num">${rec.season}</td>`;

    /* Div 1 Champion */
    h += '<td>';
    if (rec.div1Champion) {
      const tm2 = G.teams.find(tm => tm.name === rec.div1Champion!.name);
      h += '<span class="trophy-icon">&#127942;</span>';
      h += tm2 ? teamPlate(tm2.c1, tm2.c2, rec.div1Champion.name, true) : rec.div1Champion.name;
    } else { h += '—'; }
    h += '</td>';

    /* Div 1 Runner-up */
    h += '<td>';
    if (rec.div1RunnerUp) {
      const tm2 = G.teams.find(tm => tm.name === rec.div1RunnerUp!.name);
      h += '<span class="trophy-icon" style="filter:grayscale(.6) brightness(1.2)">&#127942;</span>';
      h += tm2 ? teamPlate(tm2.c1, tm2.c2, rec.div1RunnerUp.name, true) : rec.div1RunnerUp.name;
    } else { h += '—'; }
    h += '</td>';

    /* Div 2 Champion */
    h += '<td>';
    if (rec.div2Champion) {
      const tm2 = G.teams.find(tm => tm.name === rec.div2Champion!.name);
      h += '<span class="trophy-icon">&#129351;</span>';
      h += tm2 ? teamPlate(tm2.c1, tm2.c2, rec.div2Champion.name, true) : rec.div2Champion.name;
    } else { h += '—'; }
    h += '</td>';

    /* Div 2 Runner-up */
    h += '<td>';
    if (rec.div2RunnerUp) {
      const tm2 = G.teams.find(tm => tm.name === rec.div2RunnerUp!.name);
      h += '<span class="trophy-icon">&#129352;</span>';
      h += tm2 ? teamPlate(tm2.c1, tm2.c2, rec.div2RunnerUp.name, true) : rec.div2RunnerUp.name;
    } else { h += '—'; }
    h += '</td>';

    /* Top Scorer */
    h += '<td>';
    if (rec.topScorer) {
      const tm2 = G.teams.find(tm => tm.name === rec.topScorer!.teamName);
      h += '&#9917; ' + rec.topScorer.name + ' (' +
        (tm2 ? teamPlate(tm2.c1, tm2.c2, rec.topScorer.teamName, true) : rec.topScorer.teamName) +
        ') — ' + rec.topScorer.goals + ' ' + t(settings, 'goals');
    } else { h += '—'; }
    h += '</td>';

    h += '</tr>';
  }
  h += '</tbody></table>';
  card.innerHTML = h;
}
