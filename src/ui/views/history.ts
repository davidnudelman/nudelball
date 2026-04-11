/**
 * history.ts — Season history view renderer.
 *
 * Renders a table of completed season summaries showing
 * champions, runner-ups, cup winners, and top scorers.
 */

import type { GameState, Settings } from '../../types';
import { teamLabelSm } from '../../utils/helpers';
import { icon } from '../../assets/icons';
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
  let h = `<div class="card-title"><span class="title-icon">${icon('trophy', 18)}</span> ${t(settings, 'seasonHistory')}</div>`;

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
      h += `<span class="trophy-icon trophy-gold">${icon('trophy', 14)}</span>`;
      h += tm2 ? teamLabelSm({ c1: tm2.c1, c2: tm2.c2, name: rec.div1Champion.name, country: tm2.country }) : rec.div1Champion.name;
    } else { h += '—'; }
    h += '</td>';

    /* Div 1 Runner-up */
    h += '<td>';
    if (rec.div1RunnerUp) {
      const tm2 = G.teams.find(tm => tm.name === rec.div1RunnerUp!.name);
      h += `<span class="trophy-icon trophy-silver">${icon('trophy', 14)}</span>`;
      h += tm2 ? teamLabelSm({ c1: tm2.c1, c2: tm2.c2, name: rec.div1RunnerUp.name, country: tm2.country }) : rec.div1RunnerUp.name;
    } else { h += '—'; }
    h += '</td>';

    /* Div 2 Champion */
    h += '<td>';
    if (rec.div2Champion) {
      const tm2 = G.teams.find(tm => tm.name === rec.div2Champion!.name);
      h += `<span class="trophy-icon trophy-bronze">${icon('medal', 14)}</span>`;
      h += tm2 ? teamLabelSm({ c1: tm2.c1, c2: tm2.c2, name: rec.div2Champion.name, country: tm2.country }) : rec.div2Champion.name;
    } else { h += '—'; }
    h += '</td>';

    /* Div 2 Runner-up */
    h += '<td>';
    if (rec.div2RunnerUp) {
      const tm2 = G.teams.find(tm => tm.name === rec.div2RunnerUp!.name);
      h += `<span class="trophy-icon trophy-silver">${icon('medal', 14)}</span>`;
      h += tm2 ? teamLabelSm({ c1: tm2.c1, c2: tm2.c2, name: rec.div2RunnerUp.name, country: tm2.country }) : rec.div2RunnerUp.name;
    } else { h += '—'; }
    h += '</td>';

    /* Top Scorer */
    h += '<td>';
    if (rec.topScorer) {
      const tm2 = G.teams.find(tm => tm.name === rec.topScorer!.teamName);
      h += `<span class="inline-icon">${icon('ball', 14)}</span> ` + rec.topScorer.name + ' (' +
        (tm2 ? teamLabelSm({ c1: tm2.c1, c2: tm2.c2, name: rec.topScorer.teamName, country: tm2.country }) : rec.topScorer.teamName) +
        ') — ' + rec.topScorer.goals + ' ' + t(settings, 'goals');
    } else { h += '—'; }
    h += '</td>';

    h += '</tr>';
  }
  h += '</tbody></table>';
  card.innerHTML = h;
}
