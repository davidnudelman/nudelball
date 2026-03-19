/**
 * dashboard.ts — Dashboard view renderer.
 *
 * Renders the main dashboard showing last result, trophies,
 * cup status, next fixture, and a mini league standings table.
 */

import type { GameState, Settings, Team, Fixture, CupState } from '../../types';
import { SEASON_WEEKS, TOTAL_SEASON_WEEKS, CUP_ROUNDS, CUP_WEEKS, FORMATIONS, MORALE_MAX } from '../../config';
import { teamLabel, plateColors } from '../../utils/helpers';
import { t } from '../../data/i18n';

/* ================================================================
   HELPER: Build league standings table HTML for a given division
   ================================================================ */

/**
 * Sort teams by standings (pts > gd > gf) for a given division.
 *
 * @param G   - The current game state
 * @param div - Division number (1-4)
 * @returns Sorted array of teams in that division
 */
export function getSortedDiv(G: GameState, div: number): Team[] {
  return G.teams.filter(tm => tm.div === div).sort((a, b) => {
    if (b.seasonStats.pts !== a.seasonStats.pts) return b.seasonStats.pts - a.seasonStats.pts;
    const gdA = a.seasonStats.gf - a.seasonStats.ga;
    const gdB = b.seasonStats.gf - b.seasonStats.ga;
    if (gdB !== gdA) return gdB - gdA;
    return b.seasonStats.gf - a.seasonStats.gf;
  });
}

/**
 * Generate the HTML for a league standings table with trophies and links.
 *
 * Includes promotion/relegation zone indicators and highlights
 * the player's team row.
 *
 * @param G        - The current game state
 * @param settings - User settings (for i18n)
 * @param div      - Division number to render
 * @param teamLabelWithTrophiesFn - Function to render team label with trophy icons
 * @returns HTML string for the league table
 */
export function buildTableHTML(
  G: GameState,
  settings: Settings,
  div: number,
  teamLabelWithTrophiesFn: (tm: Team) => string,
): string {
  const divTeams = getSortedDiv(G, div);
  if (!divTeams.length) {
    return `<p style="color:var(--text-muted)">${t(settings, 'noTeamsInDiv')}</p>`;
  }

  let h = `<table class="league-table"><thead><tr>` +
    `<th class="pos">${t(settings, 'thPos')}</th>` +
    `<th>${t(settings, 'thTeam')}</th>` +
    `<th>${t(settings, 'thP')}</th>` +
    `<th>${t(settings, 'thW')}</th>` +
    `<th>${t(settings, 'thD')}</th>` +
    `<th>${t(settings, 'thL')}</th>` +
    `<th>${t(settings, 'thGF')}</th>` +
    `<th>${t(settings, 'thGA')}</th>` +
    `<th>${t(settings, 'thGD')}</th>` +
    `<th class="pts">${t(settings, 'thPts')}</th>` +
    `</tr></thead><tbody>`;

  divTeams.forEach((tm, i) => {
    const pos = i + 1;
    const cls = (pos <= 2 ? 'promote' : '') + (pos >= divTeams.length - 1 ? ' relegate' : '');
    const pr = tm.id === G.playerTeamId ? 'player-row' : '';
    const st = tm.seasonStats;
    const gd = st.gf - st.ga;
    h += `<tr class="${cls} ${pr}">` +
      `<td class="pos">${pos}</td>` +
      `<td><div class="team-cell team-link" onclick="openTeamProfile(${tm.id})">${teamLabelWithTrophiesFn(tm)}</div></td>` +
      `<td>${st.p}</td><td>${st.w}</td><td>${st.d}</td><td>${st.l}</td>` +
      `<td>${st.gf}</td><td>${st.ga}</td><td>${gd >= 0 ? '+' : ''}${gd}</td>` +
      `<td class="pts">${st.pts}</td></tr>`;
  });

  h += '</tbody></table>';
  h += `<div style="margin-top:8px;font-size:.72rem;color:var(--text-muted)">` +
    `<span style="color:var(--green)">&#9632;</span> ${t(settings, 'promotion')} &nbsp; ` +
    `<span style="color:var(--red)">&#9632;</span> ${t(settings, 'relegation')}</div>`;
  return h;
}

/* ================================================================
   MAIN DASHBOARD RENDERER
   ================================================================ */

/**
 * Render the dashboard view into the DOM.
 *
 * Shows: last result banner, trophies card, cup status,
 * next fixture card, and mini league table.
 *
 * @param G        - The current game state
 * @param settings - User settings
 * @param teamLabelWithTrophiesFn - Function to render team labels with trophy icons
 */
export function renderDashboard(
  G: GameState,
  settings: Settings,
  teamLabelWithTrophiesFn: (tm: Team) => string,
): void {
  const pt = G.teams[G.playerTeamId!];
  const div = pt.div;

  /* Division number display */
  const dashDivEl = document.getElementById('dash-div-num');
  if (dashDivEl) dashDivEl.textContent = String(div);

  /* ===== Trophies ===== */
  const tc = document.getElementById('club-trophies-card');
  const tcc = document.getElementById('club-trophies-content');
  if (tc && tcc) {
    if (pt.trophies && pt.trophies.length) {
      tc.style.display = '';
      let h = '<div class="trophy-shelf">';
      for (const tr of pt.trophies) {
        if (tr.type === 'gold_trophy') h += `<span class="trophy" title="${t(settings, 'div1Champion')} ${t(settings, 'season')} ${tr.season}" style="font-size:1.6rem">&#127942;</span>`;
        else if (tr.type === 'silver_trophy') h += `<span class="trophy silver" title="${t(settings, 'div1RunnerUp')} ${t(settings, 'season')} ${tr.season}" style="font-size:1.6rem">&#127942;</span>`;
        else if (tr.type === 'gold_medal') h += `<span class="trophy" title="${t(settings, 'div2Champion')} ${t(settings, 'season')} ${tr.season}" style="font-size:1.6rem">&#129351;</span>`;
        else if (tr.type === 'silver_medal') h += `<span class="trophy" title="${t(settings, 'div2RunnerUp')} ${t(settings, 'season')} ${tr.season}" style="font-size:1.6rem">&#129352;</span>`;
        else if (tr.type === 'cup') h += `<span class="trophy" title="Cup Winner ${t(settings, 'season')} ${tr.season}" style="font-size:1.6rem">&#127942;</span>`;
      }
      h += '</div>';
      tcc.innerHTML = h;
    } else {
      tc.style.display = 'none';
    }
  }

  /* ===== Last Result Banner ===== */
  const lr = document.getElementById('last-result');
  if (lr) {
    lr.innerHTML = '';
    if (G.week > 1 && G.fixtures[div]) {
      const prevWeek = G.week - 1;
      const fix = G.fixtures[div][prevWeek - 1];
      if (fix) {
        const pm = fix.find(f => f.home === G.playerTeamId || f.away === G.playerTeamId);
        if (pm && pm.homeGoals !== null && pm.awayGoals !== null) {
          const ht = G.teams[pm.home];
          const at = G.teams[pm.away];
          const isHome = pm.home === G.playerTeamId;
          const resultKey = pm.homeGoals > pm.awayGoals
            ? (isHome ? 'win' : 'loss')
            : pm.homeGoals < pm.awayGoals
              ? (isHome ? 'loss' : 'win')
              : 'draw';
          const resultLabel = t(settings, resultKey);
          const rc = resultKey === 'win' ? 'var(--green)' : resultKey === 'loss' ? 'var(--red)' : 'var(--yellow)';

          let detailHTML = '';
          for (const e of (pm.events || [])) {
            if (e.type === 'goal') {
              const side = e.teamId === pm.home ? 'rb-home' : 'rb-away';
              detailHTML += `<div class="rb-event ${side}"><span class="rb-min">${e.minute}'</span> &#9917; <b>${e.scorer}</b></div>`;
            }
          }
          for (const inj of (pm.injuries || [])) {
            const side = inj.teamId === pm.home ? 'rb-home' : 'rb-away';
            detailHTML += `<div class="rb-event rb-injury ${side}"><span class="rb-min">&#10014;</span> <b>${inj.name}</b> (${inj.duration})</div>`;
          }

          lr.innerHTML = `<div class="result-banner"><h3 style="color:${rc}">${t(settings, 'week')} ${prevWeek} — ${resultLabel}</h3>` +
            `<div class="score-line"><span>${teamLabel(ht)}</span><span class="score">${pm.homeGoals} — ${pm.awayGoals}</span><span>${teamLabel(at)}</span></div>` +
            `${detailHTML ? `<div class="rb-details">${detailHTML}</div>` : ''}</div>`;
        }
      }
    }
  }

  /* ===== Next Fixture ===== */
  const nf = document.getElementById('next-fixture');
  const nfl = document.getElementById('next-week-label');
  const nfc = document.getElementById('next-fixture-content');
  if (nf && nfl && nfc) {
    if (G.week <= SEASON_WEEKS && G.fixtures[div]) {
      nf.style.display = '';
      nfl.textContent = t(settings, 'week') + ' ' + G.week;
      const fix = G.fixtures[div][G.week - 1];
      if (fix) {
        const pm = fix.find(f => f.home === G.playerTeamId || f.away === G.playerTeamId);
        if (pm) {
          const ht = G.teams[pm.home];
          const at = G.teams[pm.away];
          nfc.innerHTML = `<div class="fixture-card player-match"><div class="fixture-main">` +
            `<div class="team-name home">${teamLabel(ht)}</div>` +
            `<div class="vs">${t(settings, 'vs')}</div>` +
            `<div class="team-name away">${teamLabel(at)}</div></div></div>`;
        } else {
          nfc.innerHTML = '';
        }
      }
    } else if (G.week > SEASON_WEEKS && G.week <= TOTAL_SEASON_WEEKS) {
      /* Cup final week */
      nf.style.display = '';
      nfl.textContent = 'Week ' + G.week + ' — Cup Final';
      if (G.cup && G.cup.active) {
        const fm = G.cup.rounds[G.cup.round] ? G.cup.rounds[G.cup.round][0] : null;
        if (fm && !fm.played) {
          const ht = G.teams[fm.home];
          const at = fm.away != null ? G.teams[fm.away] : null;
          nfc.innerHTML = `<div class="fixture-card cup-fixture"><div class="fixture-main">` +
            `<div class="team-name home">${ht ? teamLabel(ht) : 'TBD'}</div>` +
            `<div class="vs">&#127942; vs</div>` +
            `<div class="team-name away">${at ? teamLabel(at) : 'TBD'}</div></div></div>`;
        } else {
          nfc.innerHTML = '<p style="color:var(--text-dim)">Cup Final</p>';
        }
      } else {
        nfc.innerHTML = '<p style="color:var(--text-dim)">No cup final this season.</p>';
      }
    } else {
      nf.style.display = '';
      nfl.textContent = t(settings, 'seasonComplete');
      nfc.innerHTML = `<p style="color:var(--text-dim)">${t(settings, 'allMatchesPlayed', { count: SEASON_WEEKS })}</p>`;
    }
  }

  /* ===== Cup Status ===== */
  const cupStatus = document.getElementById('cup-status');
  if (cupStatus) {
    if (G.cup && G.cup.active) {
      const roundName = CUP_ROUNDS[G.cup.round] || 'Cup';
      const isCupWeek = CUP_WEEKS.includes(G.week);
      if (G.cup.playerEliminated) {
        cupStatus.innerHTML = '<div class="dash-cup">&#127942; Cup: <span style="color:var(--red)">Eliminated</span></div>';
      } else {
        cupStatus.innerHTML = `<div class="dash-cup">&#127942; Cup: <b>${roundName}</b>` +
          `${isCupWeek ? ' <span style="color:var(--yellow)">(Cup match this week!)</span>' : ''}` +
          ` <a style="cursor:pointer;color:var(--accent);text-decoration:underline" onclick="showView('cup')">View Bracket</a></div>`;
      }
    } else if (G.cup && G.cup.winner != null) {
      const w = G.teams[G.cup.winner];
      cupStatus.innerHTML = `<div class="dash-cup">&#127942; Cup Winner: <b>${w ? w.name : 'Unknown'}</b>${G.cup.winner === G.playerTeamId ? ' &#127881;' : ''}</div>`;
    } else {
      cupStatus.innerHTML = '';
    }
  }

  /* ===== Mini League Table (get reference early for status panel insertion) ===== */
  const dashTableWrap = document.getElementById('dash-table-wrap');

  /* ===== Morale & Scouting Panel (#3, #4) ===== */
  const morale = pt.morale ?? 0;
  const moraleLabel = morale >= 7 ? 'Euphoric' : morale >= 3 ? 'Happy' : morale >= -2 ? 'Neutral' : morale >= -6 ? 'Low' : 'Crisis';
  const moraleColor = morale >= 3 ? 'var(--green)' : morale <= -3 ? 'var(--red)' : 'var(--text-dim)';

  let extraHtml = `<div class="card" style="margin-top:8px"><div class="card-title">&#128200; ${t(settings, 'teamStatus')}</div>`;
  extraHtml += `<div style="display:flex;gap:16px;flex-wrap:wrap;padding:8px 0">`;
  extraHtml += `<div><span style="color:var(--text-dim);font-size:.8rem">Morale:</span> <b style="color:${moraleColor}">${moraleLabel}</b> <span style="font-size:.75rem;color:var(--text-dim)">(${morale > 0 ? '+' : ''}${morale})</span></div>`;

  /* Facilities */
  const fac = G.facilities;
  if (fac) {
    const tl = fac.trainingFacility || 0;
    const yl = fac.youthAcademy || 0;
    const sl = fac.stadium || 0;
    if (tl + yl + sl > 0) {
      extraHtml += `<div><span style="color:var(--text-dim);font-size:.8rem">Facilities:</span> `;
      if (tl) extraHtml += `Training Lv${tl} `;
      if (yl) extraHtml += `Youth Lv${yl} `;
      if (sl) extraHtml += `Stadium Lv${sl}`;
      extraHtml += `</div>`;
    }
  }

  /* Sponsorship */
  if (G.sponsorship) {
    extraHtml += `<div><span style="color:var(--text-dim);font-size:.8rem">Sponsor:</span> <b>${G.sponsorship.tier}</b> ($${G.sponsorship.incomePerSeason}/season)</div>`;
  }
  extraHtml += `</div>`;

  /* Pre-Match Scouting Report (#3) */
  if (G.week <= SEASON_WEEKS && G.fixtures[div]) {
    const fix = G.fixtures[div][G.week - 1];
    if (fix) {
      const pm = fix.find(f => f.home === G.playerTeamId || f.away === G.playerTeamId);
      if (pm && pm.homeGoals === null) {
        const oppId = pm.home === G.playerTeamId ? pm.away : pm.home;
        const opp = G.teams[oppId];
        if (opp) {
          const oppForm = opp.seasonStats.w - opp.seasonStats.l;
          const formStr = oppForm > 2 ? 'Hot streak' : oppForm < -2 ? 'Cold streak' : 'Steady';
          const formColor = oppForm > 2 ? 'var(--red)' : oppForm < -2 ? 'var(--green)' : 'var(--text-dim)';
          const oppFormation = FORMATIONS[opp.aiFormation]?.label || '4-4-2';
          const bestPlayer = [...opp.players].sort((a, b) => b.skill - a.skill)[0];

          extraHtml += `<div style="margin-top:8px;border-top:1px solid var(--border);padding-top:8px">`;
          extraHtml += `<div style="font-size:.82rem;font-weight:700;color:var(--text-dim);margin-bottom:4px">&#128270; ${t(settings, 'scoutReport')} — ${teamLabel(opp)}</div>`;
          extraHtml += `<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:.82rem">`;
          extraHtml += `<span>Form: <b style="color:${formColor}">${formStr}</b></span>`;
          extraHtml += `<span>Formation: <b>${oppFormation}</b></span>`;
          extraHtml += `<span>Record: ${opp.seasonStats.w}W ${opp.seasonStats.d}D ${opp.seasonStats.l}L</span>`;
          if (bestPlayer) {
            extraHtml += `<span>Key Player: <b>${bestPlayer.name}</b> (${bestPlayer.pos}, ${bestPlayer.skill})</span>`;
          }
          const oppMorale = opp.morale ?? 0;
          if (oppMorale !== 0) {
            extraHtml += `<span>Morale: ${oppMorale > 0 ? '+' : ''}${oppMorale}</span>`;
          }
          extraHtml += `</div></div>`;
        }
      }
    }
  }
  extraHtml += `</div>`;

  /* Insert the status card before the mini table */
  if (dashTableWrap) {
    const parent = dashTableWrap.parentElement;
    if (parent) {
      let statusCard = document.getElementById('team-status-card');
      if (!statusCard) {
        statusCard = document.createElement('div');
        statusCard.id = 'team-status-card';
        parent.insertBefore(statusCard, dashTableWrap.closest('.card'));
      }
      statusCard.innerHTML = extraHtml;
    }
  }

  /* ===== Mini League Table ===== */
  if (dashTableWrap) {
    dashTableWrap.innerHTML = buildTableHTML(G, settings, div, teamLabelWithTrophiesFn);
  }
}
