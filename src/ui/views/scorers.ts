/**
 * scorers.ts — Top scorers view renderer.
 *
 * Renders the top scorers table with division filter tabs,
 * star/ball badges for current/previous season top scorers.
 */

import type { GameState, Settings, TopScorerEntry } from '../../types';
import { teamLabel, playerAvatar } from '../../utils/helpers';
import { icon } from '../../assets/icons';
import { t } from '../../data/i18n';

/**
 * Check if a player is the current season's top scorer.
 *
 * @param G          - The current game state
 * @param playerName - Name of the player to check
 * @param teamId     - Team ID the player belongs to
 * @returns True if this player has the most goals this season
 */
export function isTopScorer(G: GameState, playerName: string, teamId: number): boolean {
  const scorers = Object.values(G.topScorers);
  if (!scorers.length) return false;
  const maxGoals = Math.max(...scorers.map(s => s.goals));
  if (maxGoals <= 0) return false;
  return scorers.some(s => s.goals === maxGoals && s.name === playerName && s.teamId === teamId);
}

/**
 * Check if a player was top scorer in a previous season (last 3 completed).
 *
 * @param G          - The current game state
 * @param playerName - Name of the player
 * @param teamId     - Team ID
 * @returns True if the player was a previous season's golden boot winner
 */
export function isPreviousTopScorer(G: GameState, playerName: string, teamId: number): boolean {
  if (!G.seasonHistory || !G.seasonHistory.length) return false;
  const cutoff = G.season - 3;
  for (let i = G.seasonHistory.length - 1; i >= 0; i--) {
    const entry = G.seasonHistory[i];
    if (entry.season <= cutoff) break;
    if (entry.topScorer && entry.topScorer.name === playerName) {
      if (entry.topScorer.teamId !== undefined) {
        if (entry.topScorer.teamId === teamId) return true;
      } else {
        const tm = G.teams[teamId];
        if (tm && entry.topScorer.teamName === tm.name) return true;
      }
    }
  }
  return false;
}

/**
 * Render the top scorers view into the DOM.
 *
 * Shows division filter tabs (All / Div 1-4) and a sorted table
 * of top goal scorers with rank, player name, team, and goals.
 *
 * @param G        - The current game state
 * @param settings - User settings (for i18n)
 */
export function renderScorers(G: GameState, settings: Settings): void {
  const tabs = document.getElementById('scorers-div-tabs');
  if (!tabs) return;

  /* Build division filter tabs */
  tabs.innerHTML = '';
  const allBtn = document.createElement('button');
  allBtn.className = 'div-tab' + (G.scorersDivTab === 0 ? ' active' : '');
  allBtn.textContent = t(settings, 'allDivisions');
  allBtn.onclick = () => { G.scorersDivTab = 0; renderScorers(G, settings); };
  tabs.appendChild(allBtn);

  for (let d = 1; d <= 4; d++) {
    const btn = document.createElement('button');
    btn.className = 'div-tab' + (d === G.scorersDivTab ? ' active' : '');
    btn.textContent = t(settings, 'division') + ' ' + d;
    btn.onclick = () => { G.scorersDivTab = d; renderScorers(G, settings); };
    tabs.appendChild(btn);
  }

  /* Filter and sort scorers */
  let scorers = Object.values(G.topScorers);
  if (G.scorersDivTab > 0) {
    const divTeamIds = new Set(G.teams.filter(tm => tm.div === G.scorersDivTab).map(tm => tm.id));
    scorers = scorers.filter(s => divTeamIds.has(s.teamId));
  }
  scorers.sort((a, b) => b.goals - a.goals);

  /* Build scorers table */
  const card = document.getElementById('scorers-card');
  if (!card) return;

  let h = `<div class="card-title">${t(settings, 'topScorersTitle')} — ${t(settings, 'season')} ${G.season}</div>`;

  if (!scorers.length) {
    h += `<p style="color:var(--text-muted)">${t(settings, 'noGoalsYet')}</p>`;
  } else {
    const topGoals = scorers[0] ? scorers[0].goals : 0;
    h += `<table class="scorers-table"><thead><tr>` +
      `<th class="rank">${t(settings, 'thRank')}</th>` +
      `<th></th>` +
      `<th>${t(settings, 'thPlayer')}</th>` +
      `<th>${t(settings, 'thTeam')}</th>` +
      `<th>${t(settings, 'thGoals')}</th></tr></thead><tbody>`;

    scorers.slice(0, 50).forEach((s, i) => {
      const tm = G.teams[s.teamId];
      const isBest = s.goals === topGoals && topGoals > 0;
      const prevBall = !isBest && isPreviousTopScorer(G, s.name, s.teamId);
      let badge = '';
      if (isBest) badge = `<span class="scorer-badge scorer-star">${icon('star', 14)}</span> `;
      else if (prevBall) badge = `<span class="scorer-badge scorer-prev">${icon('ball', 14)}</span> `;
      const scAvatar = tm ? playerAvatar(s.name, { c1: tm.c1, c2: tm.c2, size: 32 }) : playerAvatar(s.name, { size: 32 });
      h += `<tr><td class="rank">${i + 1}</td>` +
        `<td class="sc-avatar">${scAvatar}</td>` +
        `<td>${badge}${s.name}</td>` +
        `<td><div class="team-cell">${tm ? teamLabel(tm) : ''}</div></td>` +
        `<td class="goals">${s.goals}</td></tr>`;
    });
    h += '</tbody></table>';
  }

  card.innerHTML = h;
}
