/**
 * calendar.ts — Match calendar view renderer.
 *
 * Renders the season calendar with week headers, fixture cards
 * (with match reports for played matches), and cup fixtures.
 */

import type { GameState, Settings, CupMatch } from '../../types';
import { SEASON_WEEKS, CUP_ROUNDS, CUP_WEEKS } from '../../config';
import { teamLabel } from '../../utils/helpers';
import { t } from '../../data/i18n';

/**
 * Render cup fixtures for a specific week number.
 *
 * Displays actual results for past/current rounds, or TBD placeholders
 * for future rounds.
 *
 * @param G       - The current game state
 * @param settings - User settings
 * @param weekNum - The week number to check for cup matches
 * @returns HTML string for the cup fixtures section (empty if no cup match this week)
 */
function renderCupForWeek(G: GameState, settings: Settings, weekNum: number): string {
  const cupIdx = CUP_WEEKS.indexOf(weekNum);
  if (cupIdx < 0 || !G.cup) return '';

  let ch = '';
  const roundName = CUP_ROUNDS[cupIdx] || ('Cup Round ' + (cupIdx + 1));
  ch += `<div class="cup-cal-header">&#127942; ${roundName}</div>`;

  if (cupIdx <= G.cup.round && G.cup.rounds[cupIdx]) {
    /* Round data exists — show actual matches */
    for (const m of G.cup.rounds[cupIdx]) {
      if (m.bye) continue;
      const ht = G.teams[m.home];
      const at = m.away != null ? G.teams[m.away] : null;
      if (!ht || !at) continue;
      const isPlayer = m.home === G.playerTeamId || m.away === G.playerTeamId;
      ch += `<div class="fixture-card cup-fixture${isPlayer ? ' player-match' : ''}"><div class="fixture-main">`;
      ch += `<div class="team-name home">${teamLabel(ht)}</div>`;
      if (m.played && m.homeGoals != null) {
        ch += `<div class="score-box">${m.homeGoals} — ${m.awayGoals}</div>`;
      } else {
        ch += `<div class="vs">${t(settings, 'vs')}</div>`;
      }
      ch += `<div class="team-name away">${teamLabel(at)}</div></div></div>`;
    }
  } else {
    /* Future round — show TBD placeholders */
    const expectedMatches = Math.pow(2, CUP_ROUNDS.length - 1 - cupIdx) / 2;
    for (let i = 0; i < expectedMatches; i++) {
      ch += `<div class="fixture-card cup-fixture cup-placeholder"><div class="fixture-main">` +
        `<div class="team-name home">TBD</div>` +
        `<div class="vs">${t(settings, 'vs')}</div>` +
        `<div class="team-name away">TBD</div></div></div>`;
    }
  }
  return ch;
}

/**
 * Render the match calendar view into the DOM.
 *
 * Displays division tabs, week headers with fixture cards for each
 * round, match reports (goal scorers, injuries) for played matches,
 * and cup fixtures on their scheduled weeks.
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
            h += `<div class="fr-event ${side}"><span class="fr-min">${e.minute}'</span> &#9917; <b>${e.scorer}</b></div>`;
          }
        }
        for (const inj of (f.injuries || [])) {
          const side = inj.teamId === f.home ? 'fr-home' : 'fr-away';
          h += `<div class="fr-event fr-injury ${side}"><span class="fr-min">&#10014;</span> <b>${inj.name}</b> (${inj.duration})</div>`;
        }
        h += '</div>';
      }
      h += '</div>';
    }

    /* Show cup fixtures for this week (if any) */
    h += renderCupForWeek(G, settings, weekNum);
  }

  /* Week 15 — Cup Final (after league weeks 1-14) */
  for (const cupWeek of CUP_WEEKS) {
    if (cupWeek > SEASON_WEEKS) {
      const isCurrent = cupWeek === G.week;
      h += `<div class="week-header">${t(settings, 'week')} ${cupWeek} — Cup Final ${isCurrent ? '<span class="badge">' + t(settings, 'current') + '</span>' : ''}</div>`;
      h += renderCupForWeek(G, settings, cupWeek);
    }
  }

  cont.innerHTML = h;
}
