/**
 * dashboard.ts — Dashboard view renderer.
 *
 * Renders the main dashboard showing last result, trophies,
 * cup status, next fixture, and a mini league standings table.
 */

import type { GameState, Settings, Team, Fixture } from '../../types';
import { SEASON_WEEKS, FORMATIONS, MORALE_MAX, FACILITY_COSTS, SPONSORSHIP_TIERS, SCOUT_COSTS, STADIUM_HOME_GAME_BONUS, STADIUM_INCOME_BONUS } from '../../config';
import { teamLabel, plateColors } from '../../utils/helpers';
import { t } from '../../data/i18n';

/* ================================================================
   HELPER: Ordinal suffix (1st, 2nd, 3rd, etc.)
   ================================================================ */

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

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
              /* Show narrative instead of just scorer name if available */
              const desc = e.narrative || `&#9917; ${e.scorer}`;
              detailHTML += `<div class="rb-event ${side}"><span class="rb-min">${e.minute}'</span> ${desc}</div>`;
            } else if (e.type === 'yellow' && e.narrative) {
              const side = e.teamId === pm.home ? 'rb-home' : 'rb-away';
              detailHTML += `<div class="rb-event ${side}" style="font-size:.78rem;color:var(--text-dim)"><span class="rb-min">${e.minute}'</span> ${e.narrative}</div>`;
            } else if (e.type === 'red' && e.narrative) {
              const side = e.teamId === pm.home ? 'rb-home' : 'rb-away';
              detailHTML += `<div class="rb-event ${side}" style="font-size:.78rem;color:var(--red)"><span class="rb-min">${e.minute}'</span> ${e.narrative}</div>`;
            }
          }
          for (const inj of (pm.injuries || [])) {
            const side = inj.teamId === pm.home ? 'rb-home' : 'rb-away';
            detailHTML += `<div class="rb-event rb-injury ${side}"><span class="rb-min">&#10014;</span> <b>${inj.name}</b> (${inj.duration})</div>`;
          }

          /* Man of the Match */
          let motmHTML = '';
          if (pm.motm) {
            const motmTeam = pm.motmTeamId != null ? G.teams[pm.motmTeamId] : null;
            motmHTML = `<div style="text-align:center;margin-top:6px;padding:4px 8px;background:var(--surface2);border-radius:6px;font-size:.82rem">` +
              `&#11088; <b>Man of the Match:</b> ${pm.motm}${motmTeam ? ` (${teamLabel(motmTeam)})` : ''}</div>`;
          }

          lr.innerHTML = `<div class="result-banner"><h3 style="color:${rc}">${t(settings, 'week')} ${prevWeek} — ${resultLabel}</h3>` +
            `<div class="score-line"><span>${teamLabel(ht)}</span><span class="score">${pm.homeGoals} — ${pm.awayGoals}</span><span>${teamLabel(at)}</span></div>` +
            `${detailHTML ? `<div class="rb-details">${detailHTML}</div>` : ''}${motmHTML}</div>`;
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
          const oppId = pm.home === G.playerTeamId ? pm.away : pm.home;
          const opp = G.teams[oppId];
          const isDerby = (ht.rivals?.includes(at.id)) || (at.rivals?.includes(ht.id));
          const derbyBadge = isDerby ? '<div style="text-align:center;font-size:.78rem;font-weight:700;color:var(--red);margin-bottom:4px">&#128293; DERBY MATCH &#128293;</div>' : '';

          /* Opponent insights: league position, W-D-L, form, head-to-head */
          let insightsHTML = '';
          if (opp) {
            /* League position */
            const divTeams = getSortedDiv(G, div);
            const oppPos = divTeams.findIndex(tm => tm.id === oppId) + 1;
            const ptPos = divTeams.findIndex(tm => tm.id === G.playerTeamId) + 1;
            const oppSt = opp.seasonStats;

            /* Recent form from past fixture results (last 5 matches) */
            let recentForm = '';
            if (G.week > 1) {
              for (let w = Math.max(0, G.week - 6); w < G.week - 1; w++) {
                const wFix = G.fixtures[div]?.[w];
                if (!wFix) continue;
                const oppMatch = wFix.find(f => (f.home === oppId || f.away === oppId) && f.homeGoals !== null);
                if (oppMatch) {
                  const oppIsHome = oppMatch.home === oppId;
                  const oppG = oppIsHome ? oppMatch.homeGoals! : oppMatch.awayGoals!;
                  const otherG = oppIsHome ? oppMatch.awayGoals! : oppMatch.homeGoals!;
                  if (oppG > otherG) recentForm += '<span style="color:var(--green);font-weight:700">W</span>';
                  else if (oppG < otherG) recentForm += '<span style="color:var(--red);font-weight:700">L</span>';
                  else recentForm += '<span style="color:var(--yellow);font-weight:700">D</span>';
                }
              }
            }

            /* Head-to-head record from this season's already-played fixtures */
            let h2hW = 0, h2hD = 0, h2hL = 0;
            if (G.fixtures[div]) {
              for (const round of G.fixtures[div]) {
                if (!round) continue;
                for (const f of round) {
                  if (f.homeGoals === null) continue;
                  const isH2H = (f.home === G.playerTeamId && f.away === oppId) || (f.home === oppId && f.away === G.playerTeamId);
                  if (!isH2H) continue;
                  const ptIsHome = f.home === G.playerTeamId;
                  const ptG = ptIsHome ? f.homeGoals! : f.awayGoals!;
                  const opG = ptIsHome ? f.awayGoals! : f.homeGoals!;
                  if (ptG > opG) h2hW++;
                  else if (ptG < opG) h2hL++;
                  else h2hD++;
                }
              }
            }

            insightsHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px 16px;justify-content:center;font-size:.8rem;margin-top:6px;padding-top:6px;border-top:1px solid var(--border)">`;
            insightsHTML += `<span>&#127942; League: <b>${oppPos ? ordinal(oppPos) : '?'}</b> <span style="color:var(--text-dim)">(You: ${ptPos ? ordinal(ptPos) : '?'})</span></span>`;
            insightsHTML += `<span>Record: <b>${oppSt.w}W ${oppSt.d}D ${oppSt.l}L</b></span>`;
            insightsHTML += `<span>GD: <b>${(oppSt.gf - oppSt.ga) >= 0 ? '+' : ''}${oppSt.gf - oppSt.ga}</b></span>`;
            if (recentForm) insightsHTML += `<span>Form: ${recentForm}</span>`;
            if (h2hW + h2hD + h2hL > 0) {
              insightsHTML += `<span>H2H: <b style="color:var(--green)">${h2hW}W</b> ${h2hD}D <b style="color:var(--red)">${h2hL}L</b></span>`;
            }
            insightsHTML += `</div>`;
          }

          nfc.innerHTML = `<div class="fixture-card player-match">${derbyBadge}<div class="fixture-main">` +
            `<div class="team-name home">${teamLabel(ht)}</div>` +
            `<div class="vs">${t(settings, 'vs')}</div>` +
            `<div class="team-name away">${teamLabel(at)}</div></div>${insightsHTML}</div>`;
        } else {
          nfc.innerHTML = '';
        }
      }
    } else {
      nf.style.display = '';
      nfl.textContent = t(settings, 'seasonComplete');
      nfc.innerHTML = `<p style="color:var(--text-dim)">${t(settings, 'allMatchesPlayed', { count: SEASON_WEEKS })}</p>`;
    }
  }

  /* ===== Cup Status (disabled) ===== */
  const cupStatus = document.getElementById('cup-status');
  if (cupStatus) {
    cupStatus.innerHTML = '';
  }

  /* ===== Mini League Table (get reference early for status panel insertion) ===== */
  const dashTableWrap = document.getElementById('dash-table-wrap');

  /* ===== Morale & Scouting Panel (#3, #4) ===== */
  const morale = pt.morale ?? 0;
  const moraleLabel = morale >= 7 ? 'Euphoric' : morale >= 3 ? 'Happy' : morale >= -2 ? 'Neutral' : morale >= -6 ? 'Low' : 'Crisis';
  const moraleColor = morale >= 3 ? 'var(--green)' : morale <= -3 ? 'var(--red)' : 'var(--text-dim)';

  const budget = G.budgets[pt.id] || 0;

  let extraHtml = `<div class="card" style="margin-top:8px"><div class="card-title">&#127963;&#65039; Club Development</div>`;

  /* ===== Morale & Transfer Window status ===== */
  const windowStatus = G.transferWindow
    ? `<span style="color:var(--green);font-weight:700">OPEN</span>`
    : '<span style="color:var(--text-dim)">Closed</span>';
  extraHtml += `<div style="display:flex;gap:16px;flex-wrap:wrap;padding:8px 0;font-size:.85rem">`;
  extraHtml += `<div>Morale: <b style="color:${moraleColor}">${moraleLabel}</b> <span style="font-size:.75rem;color:var(--text-dim)">(${morale > 0 ? '+' : ''}${morale})</span></div>`;
  extraHtml += `<div>Transfer Window: ${windowStatus}</div>`;
  extraHtml += `</div>`;

  /* ===== Facilities + Sponsorship merged into upgrade tree ===== */
  const fac = G.facilities || { trainingFacility: 0, youthAcademy: 0, stadium: 0 };
  extraHtml += `<div style="margin-top:4px;border-top:1px solid var(--border);padding-top:8px">`;
  extraHtml += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px">`;

  const facTypes: Array<{ key: string; label: string; icon: string; level: number; effect: string }> = [
    { key: 'trainingFacility', label: 'Training Ground', icon: '&#127947;', level: fac.trainingFacility || 0, effect: '+3% skill growth/lv' },
    { key: 'youthAcademy', label: 'Youth Academy', icon: '&#127891;', level: fac.youthAcademy || 0, effect: '+2 regen skill/lv' },
    { key: 'stadium', label: 'Stadium', icon: '&#127967;', level: fac.stadium || 0, effect: `+$${STADIUM_HOME_GAME_BONUS}/home game + $${STADIUM_INCOME_BONUS}/season per lv` },
  ];
  for (const f of facTypes) {
    const costs = FACILITY_COSTS[f.key] || [];
    const nextCost = f.level < costs.length ? costs[f.level] : null;
    const canUpgrade = nextCost !== null && budget >= nextCost;
    const lvlPips = '&#9608;'.repeat(f.level) + '&#9617;'.repeat(3 - f.level);
    extraHtml += `<div style="background:var(--surface2);padding:8px 10px;border-radius:6px">`;
    extraHtml += `<div style="font-weight:700;font-size:.85rem">${f.icon} ${f.label}</div>`;
    extraHtml += `<div style="font-size:.78rem;color:var(--accent);margin:2px 0">${lvlPips} Lv${f.level}/3</div>`;
    extraHtml += `<div style="font-size:.72rem;color:var(--text-dim)">${f.effect}</div>`;
    if (nextCost !== null) {
      extraHtml += `<button class="btn-sign" style="margin-top:4px;font-size:.72rem;padding:2px 8px;width:100%" ${canUpgrade ? `onclick="upgradeFacility('${f.key}')"` : 'disabled'}>Upgrade $${nextCost.toLocaleString()}</button>`;
    } else {
      extraHtml += `<div style="font-size:.72rem;color:var(--green);font-weight:700;margin-top:4px">MAX LEVEL</div>`;
    }
    extraHtml += `</div>`;
  }

  /* Sponsorship as part of the upgrade grid */
  const spLabel = G.sponsorship
    ? `<b style="color:var(--green)">${G.sponsorship.tier}</b> $${G.sponsorship.incomePerSeason}/s`
    : '<span style="color:var(--text-dim)">None</span>';
  extraHtml += `<div style="background:var(--surface2);padding:8px 10px;border-radius:6px">`;
  extraHtml += `<div style="font-weight:700;font-size:.85rem">&#128176; Sponsor</div>`;
  extraHtml += `<div style="font-size:.78rem;margin:2px 0">${spLabel}</div>`;
  extraHtml += `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">`;
  for (const sp of SPONSORSHIP_TIERS) {
    const eligible = pt.div <= sp.requiredDiv;
    const isActive = G.sponsorship?.tier === sp.tier;
    extraHtml += `<button class="btn-sign" style="padding:2px 6px;font-size:.68rem;${isActive ? 'background:var(--green);color:#fff;' : ''}" `;
    extraHtml += eligible && !isActive ? `onclick="selectSponsor('${sp.tier}')"` : 'disabled';
    extraHtml += `>${sp.tier}${!eligible ? '*' : ''}${isActive ? '✓' : ''}</button>`;
  }
  extraHtml += `</div></div>`;

  extraHtml += `</div></div>`;

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
