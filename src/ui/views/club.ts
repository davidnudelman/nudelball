/**
 * club.ts -- Club Management view renderer (Sponsors & Stadium).
 *
 * Renders a dedicated screen for managing club infrastructure:
 * - Facility upgrades (Training Ground, Youth Academy, Stadium)
 * - Sponsorship deals (Small, Medium, Large)
 * - Club overview with budget, morale, and transfer window status
 *
 * ## How It Works
 *
 * ### Facilities
 * Each facility has 3 upgrade levels. Upgrading costs money from your budget.
 * - **Training Ground**: +3% skill growth per level during weekly training.
 * - **Youth Academy**: +2 base skill per level for generated youth prospects.
 * - **Stadium**: +$500 season income per level (paid at season end).
 *
 * ### Sponsorship
 * Choose a sponsorship deal for guaranteed season income:
 * - **Small**: $500/season -- available to all divisions.
 * - **Medium**: $1,000/season -- requires Division 3 or higher.
 * - **Large**: $2,000/season -- requires Division 1.
 *
 * Sponsorship income is paid at the end of each season. You can switch
 * sponsors between seasons, but only if you meet the division requirement.
 *
 * ### Budget
 * Your budget is spent on transfers, facility upgrades, and loans.
 * Income comes from: season completion, sponsorship, stadium upgrades,
 * and player sales.
 */

import type { GameState, Settings, Team } from '../../types';
import { FACILITY_COSTS, SPONSORSHIP_TIERS, STADIUM_INCOME_BONUS, STADIUM_HOME_GAME_BONUS, TRAINING_FACILITY_BONUS, YOUTH_ACADEMY_SKILL_BONUS } from '../../config';
import { teamLabel, teamFlag } from '../../utils/helpers';
import { icon } from '../../assets/icons';
import { t } from '../../data/i18n';

/**
 * Render the Club Management view.
 *
 * @param G        - The current game state
 * @param settings - User settings
 */
export function renderClub(G: GameState, settings: Settings): void {
  const container = document.getElementById('club-content');
  if (!container) return;

  const pt = G.teams[G.playerTeamId!];
  if (!pt) return;

  const budget = G.budgets[pt.id] || 0;
  const fac = G.facilities || { trainingFacility: 0, youthAcademy: 0, stadium: 0 };
  const morale = pt.morale ?? 0;
  const moraleLabel = morale >= 7 ? 'Euphoric' : morale >= 3 ? 'Happy' : morale >= -2 ? 'Neutral' : morale >= -6 ? 'Low' : 'Crisis';
  const moraleColor = morale >= 3 ? 'var(--green)' : morale <= -3 ? 'var(--red)' : 'var(--text-dim)';

  let h = '';

  /* ===== Club Header ===== */
  h += `<div class="card club-header-card">`;
  h += `<div class="club-header-row">`;
  h += `<div class="club-identity">`;
  h += `<div class="club-flag-large">${teamFlag(pt.country)}</div>`;
  h += `<div><div class="club-name">${teamLabel(pt)}</div>`;
  h += `<div class="club-meta">Division ${pt.div} &middot; Season ${G.season}</div></div>`;
  h += `</div>`;
  h += `<div class="club-stats">`;
  h += `<div><span class="inline-icon">${icon('money', 14)}</span> Budget: <b style="color:var(--green)">$${budget.toLocaleString()}</b></div>`;
  h += `<div>Morale: <b style="color:${moraleColor}">${moraleLabel}</b></div>`;
  const windowStatus = G.transferWindow
    ? '<span style="color:var(--green);font-weight:700">OPEN</span>'
    : '<span style="color:var(--text-dim)">Closed</span>';
  h += `<div>Transfers: ${windowStatus}</div>`;
  h += `</div></div></div>`;

  /* ===== Facilities Section ===== */
  h += `<div class="card" style="margin-bottom:12px">`;
  h += `<div class="card-title"><span class="title-icon">${icon('stadium', 18)}</span> Stadium &amp; Facilities</div>`;
  h += `<div style="font-size:.8rem;color:var(--text-dim);margin-bottom:12px">Upgrade your club infrastructure to improve training, youth development, and match-day revenue.</div>`;
  h += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">`;

  type FacIconKey = 'dumbbell' | 'cap' | 'stadium';
  const facTypes: Array<{
    key: string; label: string; iconKey: FacIconKey; level: number;
    effect: string; detailedEffect: string;
  }> = [
    {
      key: 'trainingFacility', label: 'Training Ground', iconKey: 'dumbbell',
      level: fac.trainingFacility || 0,
      effect: `+${Math.round(TRAINING_FACILITY_BONUS * 100)}% skill growth/lv`,
      detailedEffect: `Current bonus: +${Math.round((fac.trainingFacility || 0) * TRAINING_FACILITY_BONUS * 100)}% skill growth`,
    },
    {
      key: 'youthAcademy', label: 'Youth Academy', iconKey: 'cap',
      level: fac.youthAcademy || 0,
      effect: `+${YOUTH_ACADEMY_SKILL_BONUS} regen skill/lv`,
      detailedEffect: `Current bonus: +${(fac.youthAcademy || 0) * YOUTH_ACADEMY_SKILL_BONUS} base skill for prospects`,
    },
    {
      key: 'stadium', label: 'Stadium', iconKey: 'stadium',
      level: fac.stadium || 0,
      effect: `+$${STADIUM_HOME_GAME_BONUS}/home game + $${STADIUM_INCOME_BONUS}/season per lv`,
      detailedEffect: `Current: +$${((fac.stadium || 0) * STADIUM_HOME_GAME_BONUS).toLocaleString()}/home game + $${((fac.stadium || 0) * STADIUM_INCOME_BONUS).toLocaleString()}/season`,
    },
  ];

  for (const f of facTypes) {
    const costs = FACILITY_COSTS[f.key] || [];
    const nextCost = f.level < costs.length ? costs[f.level] : null;
    const canUpgrade = nextCost !== null && budget >= nextCost;
    const maxLevel = 3;

    h += `<div class="fac-card">`;
    h += `<div class="fac-card-head">`;
    h += `<span class="fac-card-icon">${icon(f.iconKey, 26)}</span>`;
    h += `<div><div class="fac-card-label">${f.label}</div>`;
    h += `<div class="fac-card-effect">${f.effect}</div></div>`;
    h += `</div>`;

    /* Level bar */
    h += `<div style="display:flex;gap:4px;margin-bottom:6px">`;
    for (let lv = 0; lv < maxLevel; lv++) {
      const filled = lv < f.level;
      h += `<div style="flex:1;height:8px;border-radius:4px;background:${filled ? 'var(--accent)' : 'var(--border)'}"></div>`;
    }
    h += `</div>`;
    h += `<div style="font-size:.78rem;color:var(--accent);margin-bottom:4px">Level ${f.level}/${maxLevel}</div>`;
    h += `<div style="font-size:.72rem;color:var(--text-dim);margin-bottom:8px">${f.detailedEffect}</div>`;

    if (nextCost !== null) {
      h += `<button class="btn-sign" style="width:100%;padding:6px;font-size:.82rem" ${canUpgrade ? `onclick="upgradeFacility('${f.key}')"` : 'disabled'}>`;
      h += `Upgrade to Lv${f.level + 1} &mdash; $${nextCost.toLocaleString()}`;
      h += `</button>`;
      if (!canUpgrade && nextCost > budget) {
        h += `<div style="font-size:.7rem;color:var(--red);margin-top:2px;text-align:center">Need $${(nextCost - budget).toLocaleString()} more</div>`;
      }
    } else {
      h += `<div class="max-level-badge"><span class="inline-icon">${icon('check', 14)}</span> MAX LEVEL</div>`;
    }
    h += `</div>`;
  }
  h += `</div></div>`;

  /* ===== Sponsorship Section ===== */
  h += `<div class="card" style="margin-bottom:12px">`;
  h += `<div class="card-title"><span class="title-icon">${icon('money', 18)}</span> Sponsorship Deals</div>`;
  h += `<div style="font-size:.8rem;color:var(--text-dim);margin-bottom:12px">Choose a sponsor for guaranteed season income. Higher-tier sponsors require a higher division.</div>`;

  /* Current sponsor */
  if (G.sponsorship) {
    h += `<div class="sponsor-current sponsor-current-active">`;
    h += `<div class="sponsor-current-label">Current Sponsor</div>`;
    h += `<div class="sponsor-current-name">${G.sponsorship.tier.charAt(0).toUpperCase() + G.sponsorship.tier.slice(1)} Sponsor</div>`;
    h += `<div class="sponsor-current-amount">$${G.sponsorship.incomePerSeason.toLocaleString()} per season</div>`;
    h += `</div>`;
  } else {
    h += `<div class="sponsor-current sponsor-current-empty">`;
    h += `<div style="font-weight:700;color:var(--red)">No sponsor signed</div>`;
    h += `<div style="font-size:.78rem;color:var(--text-dim)">Select a deal below to earn season income</div>`;
    h += `</div>`;
  }

  h += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">`;
  for (const sp of SPONSORSHIP_TIERS) {
    const eligible = pt.div <= sp.requiredDiv;
    const isActive = G.sponsorship?.tier === sp.tier;
    const tierName = sp.tier.charAt(0).toUpperCase() + sp.tier.slice(1);
    const cls = `sponsor-tile${isActive ? ' active' : eligible ? ' eligible' : ' locked'}`;

    h += `<div class="${cls}">`;
    h += `<div class="sponsor-tile-name">${tierName} Sponsor</div>`;
    h += `<div class="sponsor-tile-amount">$${sp.incomePerSeason.toLocaleString()}/season</div>`;
    h += `<div class="sponsor-tile-req">Requires: Div ${sp.requiredDiv} or higher</div>`;

    if (isActive) {
      h += `<div class="sponsor-tile-status active"><span class="inline-icon">${icon('check', 14)}</span> Active</div>`;
    } else if (eligible) {
      h += `<button class="btn-sign" style="width:100%;padding:5px;font-size:.8rem;margin-top:4px" onclick="selectSponsor('${sp.tier}')">Sign Deal</button>`;
    } else {
      h += `<div class="sponsor-tile-status locked"><span class="inline-icon">${icon('lock', 14)}</span> Division too low</div>`;
    }
    h += `</div>`;
  }
  h += `</div></div>`;

  /* ===== How It Works Section ===== */
  h += `<div class="card">`;
  h += `<div class="card-title"><span class="title-icon">${icon('book', 18)}</span> How It Works</div>`;
  h += `<div style="font-size:.82rem;line-height:1.6;color:var(--text-dim)">`;
  h += `<div style="margin-bottom:10px"><b style="color:var(--text)">Facilities</b> &mdash; Each facility has 3 upgrade levels. Costs increase with each level. `;
  h += `The <b>Training Ground</b> improves weekly skill gains. The <b>Youth Academy</b> produces better youth prospects. `;
  h += `The <b>Stadium</b> generates income per home game and a bonus at the end of each season.</div>`;
  h += `<div style="margin-bottom:10px"><b style="color:var(--text)">Sponsorship</b> &mdash; Choose a deal for guaranteed season income. `;
  h += `Higher-tier sponsors pay more but require your team to be in a higher division. `;
  h += `You can change sponsors at any time. Income is paid at the end of each season.</div>`;
  h += `<div><b style="color:var(--text)">Budget</b> &mdash; Spent on transfers, facility upgrades, and loans. `;
  h += `Earned through season completion rewards, sponsorship, stadium income, and player sales. `;
  h += `Higher divisions earn more prize money. Promoted teams get a bonus, relegated teams lose income.</div>`;
  h += `</div></div>`;

  container.innerHTML = h;
}
