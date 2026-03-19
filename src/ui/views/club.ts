/**
 * club.ts — Club Management view renderer (Sponsors & Stadium).
 *
 * Renders a dedicated screen for managing club infrastructure:
 * - Facility upgrades (Training Ground, Youth Academy, Stadium)
 * - Sponsorship deals (Small, Medium, Large, Cup-focused)
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
 * - **Small**: $500/season — available to all divisions.
 * - **Medium**: $1,000/season — requires Division 3 or higher.
 * - **Large**: $2,000/season — requires Division 1.
 * - **Cup**: $300/season + cup bonuses — available to all divisions.
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
import { FACILITY_COSTS, SPONSORSHIP_TIERS, STADIUM_INCOME_BONUS, TRAINING_FACILITY_BONUS, YOUTH_ACADEMY_SKILL_BONUS } from '../../config';
import { teamLabel } from '../../utils/helpers';
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
  h += `<div class="card" style="margin-bottom:12px">`;
  h += `<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">`;
  h += `<div style="display:flex;align-items:center;gap:12px">`;
  h += `<span style="font-size:2rem">&#127963;&#65039;</span>`;
  h += `<div><div style="font-family:'Oswald';font-size:1.3rem;font-weight:600">${teamLabel(pt)}</div>`;
  h += `<div style="font-size:.82rem;color:var(--text-dim)">Division ${pt.div} &middot; Season ${G.season}</div></div>`;
  h += `</div>`;
  h += `<div style="display:flex;gap:16px;align-items:center;font-size:.88rem">`;
  h += `<div>&#128176; Budget: <b style="color:var(--green)">$${budget.toLocaleString()}</b></div>`;
  h += `<div>Morale: <b style="color:${moraleColor}">${moraleLabel}</b></div>`;
  const windowStatus = G.transferWindow
    ? '<span style="color:var(--green);font-weight:700">OPEN</span>'
    : '<span style="color:var(--text-dim)">Closed</span>';
  h += `<div>Transfers: ${windowStatus}</div>`;
  h += `</div></div></div>`;

  /* ===== Facilities Section ===== */
  h += `<div class="card" style="margin-bottom:12px">`;
  h += `<div class="card-title">&#127967;&#65039; Stadium & Facilities</div>`;
  h += `<div style="font-size:.8rem;color:var(--text-dim);margin-bottom:12px">Upgrade your club infrastructure to improve training, youth development, and match-day revenue.</div>`;
  h += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">`;

  const facTypes: Array<{
    key: string; label: string; icon: string; level: number;
    effect: string; detailedEffect: string;
  }> = [
    {
      key: 'trainingFacility', label: 'Training Ground', icon: '&#127947;',
      level: fac.trainingFacility || 0,
      effect: `+${Math.round(TRAINING_FACILITY_BONUS * 100)}% skill growth/lv`,
      detailedEffect: `Current bonus: +${Math.round((fac.trainingFacility || 0) * TRAINING_FACILITY_BONUS * 100)}% skill growth`,
    },
    {
      key: 'youthAcademy', label: 'Youth Academy', icon: '&#127891;',
      level: fac.youthAcademy || 0,
      effect: `+${YOUTH_ACADEMY_SKILL_BONUS} regen skill/lv`,
      detailedEffect: `Current bonus: +${(fac.youthAcademy || 0) * YOUTH_ACADEMY_SKILL_BONUS} base skill for prospects`,
    },
    {
      key: 'stadium', label: 'Stadium', icon: '&#127967;',
      level: fac.stadium || 0,
      effect: `+$${STADIUM_INCOME_BONUS} income/lv`,
      detailedEffect: `Current bonus: +$${((fac.stadium || 0) * STADIUM_INCOME_BONUS).toLocaleString()} per season`,
    },
  ];

  for (const f of facTypes) {
    const costs = FACILITY_COSTS[f.key] || [];
    const nextCost = f.level < costs.length ? costs[f.level] : null;
    const canUpgrade = nextCost !== null && budget >= nextCost;
    const maxLevel = 3;

    h += `<div style="background:var(--surface2);padding:14px;border-radius:8px">`;
    h += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">`;
    h += `<span style="font-size:1.6rem">${f.icon}</span>`;
    h += `<div><div style="font-weight:700;font-size:.95rem">${f.label}</div>`;
    h += `<div style="font-size:.75rem;color:var(--text-dim)">${f.effect}</div></div>`;
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
      h += `Upgrade to Lv${f.level + 1} — $${nextCost.toLocaleString()}`;
      h += `</button>`;
      if (!canUpgrade && nextCost > budget) {
        h += `<div style="font-size:.7rem;color:var(--red);margin-top:2px;text-align:center">Need $${(nextCost - budget).toLocaleString()} more</div>`;
      }
    } else {
      h += `<div style="text-align:center;font-size:.85rem;color:var(--green);font-weight:700;padding:6px">&#10003; MAX LEVEL</div>`;
    }
    h += `</div>`;
  }
  h += `</div></div>`;

  /* ===== Sponsorship Section ===== */
  h += `<div class="card" style="margin-bottom:12px">`;
  h += `<div class="card-title">&#128176; Sponsorship Deals</div>`;
  h += `<div style="font-size:.8rem;color:var(--text-dim);margin-bottom:12px">Choose a sponsor for guaranteed season income. Higher-tier sponsors require a higher division.</div>`;

  /* Current sponsor */
  if (G.sponsorship) {
    h += `<div style="background:var(--surface2);padding:10px 14px;border-radius:8px;margin-bottom:12px;border-left:3px solid var(--green)">`;
    h += `<div style="font-size:.78rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px">Current Sponsor</div>`;
    h += `<div style="font-weight:700;font-size:1rem;margin:2px 0">${G.sponsorship.tier.charAt(0).toUpperCase() + G.sponsorship.tier.slice(1)} Sponsor</div>`;
    h += `<div style="font-size:.85rem;color:var(--green)">$${G.sponsorship.incomePerSeason.toLocaleString()} per season</div>`;
    if (G.sponsorship.cupBonusPerRound > 0) {
      h += `<div style="font-size:.78rem;color:var(--text-dim)">+$${G.sponsorship.cupBonusPerRound} per cup round</div>`;
    }
    h += `</div>`;
  } else {
    h += `<div style="background:var(--surface2);padding:10px 14px;border-radius:8px;margin-bottom:12px;border-left:3px solid var(--red)">`;
    h += `<div style="font-weight:700;color:var(--red)">No sponsor signed</div>`;
    h += `<div style="font-size:.78rem;color:var(--text-dim)">Select a deal below to earn season income</div>`;
    h += `</div>`;
  }

  h += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">`;
  for (const sp of SPONSORSHIP_TIERS) {
    const eligible = pt.div <= sp.requiredDiv;
    const isActive = G.sponsorship?.tier === sp.tier;
    const tierName = sp.tier.charAt(0).toUpperCase() + sp.tier.slice(1);
    const borderColor = isActive ? 'var(--green)' : eligible ? 'var(--accent)' : 'var(--border)';

    h += `<div style="background:var(--surface2);padding:12px;border-radius:8px;border:2px solid ${borderColor};${isActive ? 'box-shadow:0 0 8px rgba(76,175,80,.2);' : ''}">`;
    h += `<div style="font-weight:700;font-size:.92rem;margin-bottom:4px">${tierName} Sponsor</div>`;
    h += `<div style="font-size:.95rem;color:var(--green);font-weight:600;margin-bottom:2px">$${sp.incomePerSeason.toLocaleString()}/season</div>`;
    if (sp.cupBonusPerRound > 0) {
      h += `<div style="font-size:.78rem;color:var(--text-dim)">+$${sp.cupBonusPerRound}/cup round</div>`;
    }
    h += `<div style="font-size:.72rem;color:var(--text-dim);margin:4px 0">Requires: Div ${sp.requiredDiv} or higher</div>`;

    if (isActive) {
      h += `<div style="text-align:center;font-size:.82rem;color:var(--green);font-weight:700;padding:4px">&#10003; Active</div>`;
    } else if (eligible) {
      h += `<button class="btn-sign" style="width:100%;padding:5px;font-size:.8rem;margin-top:4px" onclick="selectSponsor('${sp.tier}')">Sign Deal</button>`;
    } else {
      h += `<div style="text-align:center;font-size:.78rem;color:var(--red);padding:4px">&#128274; Division too low</div>`;
    }
    h += `</div>`;
  }
  h += `</div></div>`;

  /* ===== How It Works Section ===== */
  h += `<div class="card">`;
  h += `<div class="card-title">&#128214; How It Works</div>`;
  h += `<div style="font-size:.82rem;line-height:1.6;color:var(--text-dim)">`;
  h += `<div style="margin-bottom:10px"><b style="color:var(--text)">Facilities</b> — Each facility has 3 upgrade levels. Costs increase with each level. `;
  h += `The <b>Training Ground</b> improves weekly skill gains. The <b>Youth Academy</b> produces better youth prospects. `;
  h += `The <b>Stadium</b> generates extra income at the end of each season.</div>`;
  h += `<div style="margin-bottom:10px"><b style="color:var(--text)">Sponsorship</b> — Choose a deal for guaranteed season income. `;
  h += `Higher-tier sponsors pay more but require your team to be in a higher division. `;
  h += `You can change sponsors at any time. Income is paid at the end of each season.</div>`;
  h += `<div><b style="color:var(--text)">Budget</b> — Spent on transfers, facility upgrades, and loans. `;
  h += `Earned through season completion rewards, sponsorship, stadium income, and player sales. `;
  h += `Higher divisions earn more prize money. Promoted teams get a bonus, relegated teams lose income.</div>`;
  h += `</div></div>`;

  container.innerHTML = h;
}
