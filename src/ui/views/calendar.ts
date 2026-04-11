/**
 * calendar.ts — Match calendar view renderer.
 *
 * Renders the season calendar with week headers and fixture cards
 * (with match reports for played matches).
 */

import type { GameState, Settings } from '../../types';
import { SEASON_WEEKS } from '../../config';
import { teamLabel } from '../../utils/helpers';
import { icon } from '../../assets/icons';
import { t } from '../../data/i18n';

/**
 * Render the match calendar view into the DOM.
 *
 * Displays division tabs, week headers with fixture cards for each
 * round, and match reports (goal scorers, injuries) for played matches.
 *
 * @param G        - The current game state
 * @param settings - User settings (for i18n)
 */
export function renderCalendar(G: GameState, settings: Settings): void {
  const tabs = document.getElementById('cal-div-tabs');
  if (!tabs) return;

  tabs.innerHTML = '';
  for (let d = 1; d <= 4; d++) {
    const btn = document.createElement('button');
    btn.className = 'div-tab' + (d === G.calDivTab ? ' active' : '');
    btn.textContent = t(settings, 'division') + ' ' + d;
    btn.onclick = () => {
      G.calDivTab = d;
      renderCalendar(G, settings);
    };
    tabs.appendChild(btn);
  }

  const div = G.calDivTab;
  const cont = document.getElementById('calendar-content');
  if (!cont) return;

  if (!G.fixtures[div]) {
    cont.innerHTML = `<p style="color:var(--text-muted)">${t(settings, 'noFixtures')}</p>`;
    return;
  }

  let h = '';
  const playerDiv = G.teams[G.playerTeamId!].div;

  for (let w = 0; w < G.fixtures[div].length; w++) {
    const weekNum = w + 1;
    const isCurrent = weekNum === G.week && div === playerDiv;
    h += `<div class="week-header">${t(settings, 'week')} ${weekNum} ${isCurrent ? '<span class="badge">' + t(settings, 'current') + '</span>' : ''}</div>`;

    for (const f of G.fixtures[div][w]) {
      const ht = G.teams[f.home];
      const at = G.teams[f.away];
      const isPlayer = f.home === G.playerTeamId || f.away === G.playerTeamId;
      const hasReport = f.homeGoals !== null && ((f.events && f.events.length) || (f.injuries && f.injuries.length));

      h += `<div class="fixture-card${isPlayer ? ' player-match' : ''}${hasReport ? ' has-report expanded' : ''}">`;
      h += `<div class="fixture-main">`;
      h += `<div class="team-name home">${teamLabel(ht)}</div>`;
      if (f.homeGoals !== null) {
        h += `<div class="score-box">${f.homeGoals} — ${f.awayGoals}</div>`;
      } else {
        h += `<div class="vs">${t(settings, 'vs')}</div>`;
      }
      h += `<div class="team-name away">${teamLabel(at)}</div></div>`;

      /* Match report details (goal scorers, injuries) */
      if (hasReport) {
        h += '<div class="fixture-report">';
        for (const e of (f.events || [])) {
          if (e.type === 'goal') {
            const side = e.teamId === f.home ? 'fr-home' : 'fr-away';
            h += `<div class="fr-event ${side}"><span class="fr-min">${e.minute}'</span> <span class="inline-icon">${icon('ball', 12)}</span> <b>${e.scorer}</b></div>`;
          }
        }
        for (const inj of (f.injuries || [])) {
          const side = inj.teamId === f.home ? 'fr-home' : 'fr-away';
          h += `<div class="fr-event fr-injury ${side}"><span class="fr-min">${icon('cross', 12)}</span> <b>${inj.name}</b> (${inj.duration})</div>`;
        }
        h += '</div>';
      }
      h += '</div>';
    }
  }

  cont.innerHTML = h;
}
