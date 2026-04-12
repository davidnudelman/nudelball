/**
 * club.ts -- Office view renderer (Sponsors, Stadium, Training, Youth Academy).
 *
 * Renders the dedicated "Office" management screen for club infrastructure:
 * - Facility upgrades (Training Ground, Youth Academy, Stadium) with
 *   evolving visual scenes that grow with each upgrade level.
 * - Sponsorship deals (Bronze / Silver / Gold) with heraldic badges that
 *   reflect the prestige tier of the deal.
 * - Club overview with budget, morale, and transfer window status.
 *
 * The route name `club` is preserved for backwards compatibility with saved
 * preferences and routing, but the user-facing label is "Office".
 *
 * ## How It Works
 *
 * ### Facilities
 * Each facility has 3 upgrade levels. Upgrading costs money from your budget.
 * - **Training Ground**: +3% skill growth per level during weekly training.
 * - **Youth Academy**: +1 base skill per level for generated youth prospects.
 * - **Stadium**: +$150/home game and +$500/season per level.
 *
 * Each card displays an SVG illustration that visibly evolves as you upgrade,
 * giving immediate visual feedback on your investment.
 *
 * ### Sponsorship
 * Choose a sponsorship deal for guaranteed season income:
 * - **Bronze**: $500/season -- available to all divisions.
 * - **Silver**: $1,000/season -- requires Division 3 or higher.
 * - **Gold**: $2,000/season -- requires Division 1.
 *
 * Each tier shows a custom heraldic badge whose ornamentation grows with the
 * tier (bronze plain shield -> silver with rays -> gold with full sunburst).
 */

import type { GameState, Settings } from '../../types';
import { FACILITY_COSTS, SPONSORSHIP_TIERS, STADIUM_INCOME_BONUS, STADIUM_HOME_GAME_BONUS, TRAINING_FACILITY_BONUS, YOUTH_ACADEMY_SKILL_BONUS } from '../../config';
import { teamLabel, teamFlag } from '../../utils/helpers';
import { icon } from '../../assets/icons';
import { t } from '../../data/i18n';
import { stadiumScene, trainingScene, youthScene, sponsorBadge, levelPips } from './office-visuals';

/* ================================================================
   FACILITY METADATA
   ================================================================ */

/** Maximum upgrade level for any facility. */
const MAX_FACILITY_LEVEL = 3;

/**
 * Per-level descriptive flavour text for each facility.
 *
 * Index 0 corresponds to "level 0" (uninvested), so each array has
 * MAX_FACILITY_LEVEL + 1 entries.
 */
const FACILITY_FLAVOUR: Record<string, string[]> = {
  trainingFacility: [
    'A muddy patch of grass and a few cones.',
    'Portable goals and proper kit storage.',
    'Full gym, weights room and rehab beds.',
    'Indoor dome, sports science lab, elite staff.',
  ],
  youthAcademy: [
    'A wooden cabin where the kids change.',
    'Brick schoolhouse with classrooms and a sign.',
    'Dormitory wing for visiting prospects.',
    'Full residential campus with dedicated coaches.',
  ],
  stadium: [
    'Wooden bleachers behind the touchline.',
    'Single-tier covered stands with floodlights.',
    'Two-tier ground with corner flags and atmosphere.',
    'Three-tier elite arena with roof and big-game lights.',
  ],
};

/** Stable ordering for the facility cards left-to-right. */
type FacilityKey = 'trainingFacility' | 'youthAcademy' | 'stadium';

/* ================================================================
   MAIN RENDERER
   ================================================================ */

/**
 * Render the Office view (formerly "Club Management").
 *
 * @param G        - The current game state
 * @param settings - User settings (used for i18n strings)
 */
export function renderClub(G: GameState, settings: Settings): void {
  const container = document.getElementById('club-content');
  if (!container) return;

  const pt = G.teams[G.playerTeamId!];
  if (!pt) return;

  const budget = G.budgets[pt.id] || 0;
  const fac = G.facilities || { trainingFacility: 0, youthAcademy: 0, stadium: 0 };
  const morale = pt.morale ?? 0;
  const moraleLabel =
    morale >= 7 ? 'Euphoric' :
    morale >= 3 ? 'Happy' :
    morale >= -2 ? 'Neutral' :
    morale >= -6 ? 'Low' : 'Crisis';
  const moraleColor =
    morale >= 3 ? 'var(--green)' :
    morale <= -3 ? 'var(--red)' : 'var(--text-dim)';

  let h = '';

  /* ===== Office Header ===== */
  h += `<div class="card club-header-card">`;
  h += `<div class="club-header-row">`;
  h += `<div class="club-identity">`;
  h += `<div class="club-flag-large">${teamFlag(pt.country)}</div>`;
  h += `<div>`;
  h += `<div class="club-name">${teamLabel(pt)}</div>`;
  h += `<div class="club-meta">${t(settings, 'office')} &middot; Division ${pt.div} &middot; Season ${G.season}</div>`;
  h += `</div>`;
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
  h += `<div class="card-title"><span class="title-icon">${icon('stadium', 18)}</span> Facilities</div>`;
  h += `<div style="font-size:.8rem;color:var(--text-dim);margin-bottom:12px">Invest in your facilities to grow your club. Each upgrade visibly transforms your training ground, academy and stadium.</div>`;
  h += `<div class="of-facility-grid">`;

  /** Card definitions in display order. */
  const facCards: Array<{
    key: FacilityKey;
    label: string;
    iconKey: 'dumbbell' | 'cap' | 'stadium';
    sceneFn: (level: number) => string;
    bonusEffect: string;
    detailedEffect: string;
  }> = [
    {
      key: 'trainingFacility',
      label: 'Training Ground',
      iconKey: 'dumbbell',
      sceneFn: trainingScene,
      bonusEffect: `+${Math.round(TRAINING_FACILITY_BONUS * 100)}% skill growth per level`,
      detailedEffect: `Current bonus: +${Math.round((fac.trainingFacility || 0) * TRAINING_FACILITY_BONUS * 100)}% skill growth from weekly training`,
    },
    {
      key: 'youthAcademy',
      label: 'Youth Academy',
      iconKey: 'cap',
      sceneFn: youthScene,
      bonusEffect: `+${YOUTH_ACADEMY_SKILL_BONUS} regen skill per level`,
      detailedEffect: `Current bonus: +${(fac.youthAcademy || 0) * YOUTH_ACADEMY_SKILL_BONUS} base skill on new youth prospects`,
    },
    {
      key: 'stadium',
      label: 'Stadium',
      iconKey: 'stadium',
      sceneFn: stadiumScene,
      bonusEffect: `+$${STADIUM_HOME_GAME_BONUS}/home game and +$${STADIUM_INCOME_BONUS}/season per level`,
      detailedEffect: `Current: +$${((fac.stadium || 0) * STADIUM_HOME_GAME_BONUS).toLocaleString()}/home game, +$${((fac.stadium || 0) * STADIUM_INCOME_BONUS).toLocaleString()}/season`,
    },
  ];

  for (const card of facCards) {
    const level = (fac as unknown as Record<string, number>)[card.key] || 0;
    const costs = FACILITY_COSTS[card.key] || [];
    const nextCost = level < costs.length ? costs[level] : null;
    const canUpgrade = nextCost !== null && budget >= nextCost;
    const flavour = FACILITY_FLAVOUR[card.key]?.[level] || '';

    h += `<div class="of-card of-facility-card" data-level="${level}">`;

    /* Visual scene at the top */
    h += `<div class="of-card-visual">${card.sceneFn(level)}`;
    /* Level badge overlay */
    h += `<div class="of-card-level-badge">LV ${level}/${MAX_FACILITY_LEVEL}</div>`;
    h += `</div>`;

    /* Card body */
    h += `<div class="of-card-body">`;
    h += `<div class="of-card-head">`;
    h += `<span class="of-card-icon">${icon(card.iconKey, 22)}</span>`;
    h += `<div>`;
    h += `<div class="of-card-label">${card.label}</div>`;
    h += `<div class="of-card-effect">${card.bonusEffect}</div>`;
    h += `</div>`;
    h += `</div>`;

    /* Level pips */
    h += levelPips(level, MAX_FACILITY_LEVEL);

    /* Flavour text */
    h += `<div class="of-card-flavour">${flavour}</div>`;

    /* Detailed effect / current bonus */
    h += `<div class="of-card-current">${card.detailedEffect}</div>`;

    /* Upgrade button or max-level badge */
    if (nextCost !== null) {
      h += `<button class="btn-sign of-upgrade-btn" ${canUpgrade ? `onclick="upgradeFacility('${card.key}')"` : 'disabled'}>`;
      h += `Upgrade to LV ${level + 1} &mdash; $${nextCost.toLocaleString()}`;
      h += `</button>`;
      if (!canUpgrade && budget < nextCost) {
        h += `<div class="of-need-more">Need $${(nextCost - budget).toLocaleString()} more</div>`;
      }
    } else {
      h += `<div class="of-max-badge"><span class="inline-icon">${icon('check', 14)}</span> MAX LEVEL</div>`;
    }

    h += `</div></div>`;
  }
  h += `</div></div>`;

  /* ===== Sponsorship Section ===== */
  h += `<div class="card" style="margin-bottom:12px">`;
  h += `<div class="card-title"><span class="title-icon">${icon('money', 18)}</span> Sponsorship Deals</div>`;
  h += `<div style="font-size:.8rem;color:var(--text-dim);margin-bottom:12px">Sign a sponsor for guaranteed end-of-season income. Higher tiers pay more but require a higher division.</div>`;

  /* Current sponsor banner */
  if (G.sponsorship) {
    const tierName = G.sponsorship.tier.charAt(0).toUpperCase() + G.sponsorship.tier.slice(1);
    h += `<div class="sponsor-current sponsor-current-active">`;
    h += `<div class="sponsor-current-label">Current Sponsor</div>`;
    h += `<div class="sponsor-current-name">${tierName} Tier</div>`;
    h += `<div class="sponsor-current-amount">$${G.sponsorship.incomePerSeason.toLocaleString()} per season</div>`;
    h += `</div>`;
  } else {
    h += `<div class="sponsor-current sponsor-current-empty">`;
    h += `<div style="font-weight:700;color:var(--red)">No sponsor signed</div>`;
    h += `<div style="font-size:.78rem;color:var(--text-dim)">Pick a deal below to start earning season income.</div>`;
    h += `</div>`;
  }

  /* Sponsor card grid */
  h += `<div class="of-sponsor-grid">`;
  for (const sp of SPONSORSHIP_TIERS) {
    const eligible = pt.div <= sp.requiredDiv;
    const isActive = G.sponsorship?.tier === sp.tier;
    const tierName = sp.tier.charAt(0).toUpperCase() + sp.tier.slice(1);
    const cls = `of-card of-sponsor-card sponsor-tile${isActive ? ' active' : eligible ? ' eligible' : ' locked'}`;

    h += `<div class="${cls}">`;

    /* Visual badge */
    h += `<div class="of-sponsor-badge-wrap">${sponsorBadge(sp.tier, isActive)}</div>`;

    h += `<div class="of-card-body">`;
    h += `<div class="sponsor-tile-name">${tierName} Sponsor</div>`;
    h += `<div class="sponsor-tile-amount">$${sp.incomePerSeason.toLocaleString()}/season</div>`;
    h += `<div class="sponsor-tile-req">Requires Div ${sp.requiredDiv} or higher</div>`;

    if (isActive) {
      h += `<div class="sponsor-tile-status active"><span class="inline-icon">${icon('check', 14)}</span> Active</div>`;
    } else if (eligible) {
      h += `<button class="btn-sign of-upgrade-btn" onclick="selectSponsor('${sp.tier}')">Sign Deal</button>`;
    } else {
      h += `<div class="sponsor-tile-status locked"><span class="inline-icon">${icon('lock', 14)}</span> Division too low</div>`;
    }
    h += `</div></div>`;
  }
  h += `</div>`;
  h += `</div>`;

  /* ===== How It Works Section ===== */
  h += `<div class="card">`;
  h += `<div class="card-title"><span class="title-icon">${icon('book', 18)}</span> How It Works</div>`;
  h += `<div style="font-size:.82rem;line-height:1.6;color:var(--text-dim)">`;
  h += `<div style="margin-bottom:10px"><b style="color:var(--text)">Facilities</b> &mdash; Each facility has 3 upgrade levels. Costs increase with each level. `;
  h += `The <b>Training Ground</b> improves weekly skill gains. The <b>Youth Academy</b> produces better youth prospects. `;
  h += `The <b>Stadium</b> generates income per home game and a bonus at the end of each season.</div>`;
  h += `<div style="margin-bottom:10px"><b style="color:var(--text)">Sponsorship</b> &mdash; Sign a deal for guaranteed season income. `;
  h += `Higher-tier sponsors pay more but require a higher division. `;
  h += `You can change sponsors at any time. Income is paid at the end of each season.</div>`;
  h += `<div><b style="color:var(--text)">Budget</b> &mdash; Spent on transfers, facility upgrades, and loans. `;
  h += `Earned through season completion rewards, sponsorship, stadium income, and player sales. `;
  h += `Higher divisions earn more prize money. Promoted teams get a bonus, relegated teams lose income.</div>`;
  h += `</div></div>`;

  container.innerHTML = h;
}
