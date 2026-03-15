/**
 * cup-view.ts — Cup bracket view renderer.
 *
 * Renders the knockout cup competition bracket with rounds,
 * match results, bye indicators, and the cup winner banner.
 */

import type { GameState, Settings, CupMatch } from '../../types';
import { CUP_ROUNDS } from '../../config';
import { teamLabel } from '../../utils/helpers';

/**
 * Render the cup bracket view into the DOM.
 *
 * Displays:
 * - Cup winner banner (if decided)
 * - Player elimination notice
 * - Each round's matches with team plates and scores
 * - Highlights the player's matches
 *
 * @param G        - The current game state
 * @param settings - User settings (unused directly, but included for interface consistency)
 */
export function renderCup(G: GameState, settings: Settings): void {
  const el = document.getElementById('cup-content');
  if (!el) return;

  if (!G.cup) {
    el.innerHTML = '<div class="card-title">&#127942; Cup Competition</div>' +
      '<p style="color:var(--text-dim);padding:16px">No cup competition active. The cup starts at the beginning of each season.</p>';
    return;
  }

  let h = '<div class="card-title">&#127942; Cup Competition — Season ' + G.season + '</div>';

  /* Cup winner banner */
  if (G.cup.winner != null) {
    const w = G.teams[G.cup.winner];
    h += `<div class="cup-winner-banner">` +
      `<span class="cup-winner-trophy">&#127942;</span>` +
      `<span class="cup-winner-name">${w ? teamLabel(w) : 'Unknown'}</span>` +
      `<span class="cup-winner-label">Cup Winner!</span></div>`;
  }

  /* Player elimination notice */
  if (G.cup.playerEliminated) {
    h += '<div style="color:var(--red);font-size:.85rem;padding:4px 16px;font-style:italic">' +
      'Your team has been eliminated from the cup.</div>';
  }

  /* Render each round */
  for (let r = 0; r < G.cup.rounds.length; r++) {
    const round = G.cup.rounds[r];
    const roundName = CUP_ROUNDS[r] || ('Round ' + (r + 1));
    const isCurrentRound = r === G.cup.round && G.cup.active;

    h += `<div class="cup-round${isCurrentRound ? ' cup-round-current' : ''}">`;
    h += `<div class="cup-round-title">${roundName}${isCurrentRound ? ' (Current)' : ''}</div>`;
    h += '<div class="cup-matches">';

    for (const m of round) {
      const ht = G.teams[m.home];
      const at = m.away != null ? G.teams[m.away] : null;
      const isPlayer = m.home === G.playerTeamId || (m.away != null && m.away === G.playerTeamId);

      if (m.bye) {
        h += `<div class="cup-match${isPlayer ? ' cup-match-player' : ''}">` +
          `<span class="cup-team">${ht ? teamLabel(ht) : '?'}</span>` +
          `<span class="cup-score">BYE</span>` +
          `<span class="cup-team cup-team-bye">—</span></div>`;
      } else if (m.played) {
        const homeWon = (m.homeGoals ?? 0) > (m.awayGoals ?? 0);
        h += `<div class="cup-match${isPlayer ? ' cup-match-player' : ''}">` +
          `<span class="cup-team${homeWon ? ' cup-team-winner' : ''}">${ht ? teamLabel(ht) : '?'}</span>` +
          `<span class="cup-score">${m.homeGoals} — ${m.awayGoals}</span>` +
          `<span class="cup-team${!homeWon ? ' cup-team-winner' : ''}">${at ? teamLabel(at) : '?'}</span></div>`;
      } else {
        h += `<div class="cup-match${isPlayer ? ' cup-match-player' : ''}">` +
          `<span class="cup-team">${ht ? teamLabel(ht) : '?'}</span>` +
          `<span class="cup-score">vs</span>` +
          `<span class="cup-team">${at ? teamLabel(at) : '?'}</span></div>`;
      }
    }

    h += '</div></div>';
  }

  el.innerHTML = h;
}
