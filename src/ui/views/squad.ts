/**
 * squad.ts — Squad management view renderer.
 *
 * Renders the full squad management interface including:
 * - News panel (injuries, next opponent, retiring players, dad joke)
 * - Tactic selector bar
 * - Training focus bar
 * - Formation selector and formation status bar
 * - Power bar (controlled by strengthDisplay setting)
 * - Player list with checkboxes, position dropdowns, and stats
 */

import type { GameState, Settings, Player, Position, TacticId, PowerLevels } from '../../types';
import {
  FORMATIONS, DEFAULT_FORMATION_IDX, TACTICS, TRAINING_FOCUSES,
  POS_CSS, POS_DISTANCE, OOP_PENALTY_PER_STEP,
  FORM_OVR_PCT, YELLOW_ACCUMULATION, SEASON_WEEKS, RETIREMENT_AGE,
} from '../../config';
import { t } from '../../data/i18n';
import { isTopScorer, isPreviousTopScorer } from './scorers';
import { playerAvatar } from '../../utils/helpers';
import { icon } from '../../assets/icons';

/* ================================================================
   HELPER FUNCTIONS (self-contained within this module)
   ================================================================ */

/** OOP penalty multiplier (simplified: natural=1.0, adjacent=-10%, 2+ steps=0) */
function getOopPenalty(naturalPos: Position, assignedPos: Position | null): number {
  if (!assignedPos || assignedPos === naturalPos) return 1.0;
  if (naturalPos === 'GK' || assignedPos === 'GK') return 0;
  const steps = Math.abs(POS_DISTANCE[naturalPos] - POS_DISTANCE[assignedPos]);
  if (steps === 1) return 0.90;
  return 0;
}

/** Effective overall rating */
export function playerOvr(p: Player): number {
  const stam = p.stamina != null ? p.stamina : 100;
  const base = p.skill * (0.5 + 0.5 * stam / 100);
  const freshBonus = (p.benchStreak >= 3 && p.selected) ? 1.10 : 1.0;
  const oopMult = getOopPenalty(p.pos, p.assignedPos);
  const formMult = 1.0 + ((p.form || 0) * FORM_OVR_PCT);
  const raw = Math.round(base * freshBonus * oopMult * formMult);
  return Math.max(1, Math.min(raw, p.skill));
}

/** Average rating of selected starters */
export function getTeamAvgRating(team: { players: Player[] }): number {
  const starters = team.players.filter(p => p.selected);
  if (!starters.length) return 0;
  return Math.round(starters.reduce((s, p) => s + playerOvr(p) * (p.subbedIn ? 1.10 : 1.0), 0) / starters.length);
}

/** Power levels per position group */
export function getTeamPowerLevels(team: { players: Player[] }): PowerLevels {
  const starters = team.players.filter(p => p.selected);
  const levels: PowerLevels = { GK: 0, DEF: 0, MID: 0, STR: 0, total: 0 };
  for (const p of starters) {
    const pos = (p.assignedPos || p.pos) as Position;
    const eff = playerOvr(p) * (p.subbedIn ? 1.10 : 1.0);
    levels[pos] = (levels[pos] || 0) + eff;
    levels.total += eff;
  }
  return levels;
}

/** Formation slot counts for selected starters */
export function getFormationCounts(team: { players: Player[] }): Record<Position, number> {
  const starters = team.players.filter(p => p.selected);
  const counts: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, STR: 0 };
  for (const p of starters) {
    const pos = (p.assignedPos || p.pos) as Position;
    counts[pos] = (counts[pos] || 0) + 1;
  }
  return counts;
}

/** Formation string like "4-4-2" */
export function getFormationString(team: { players: Player[] }): string {
  const c = getFormationCounts(team);
  return `${c.DEF}-${c.MID}-${c.STR}`;
}

/* ================================================================
   NEWS PANEL RENDERER
   ================================================================ */

/**
 * Render the news panel with injuries, next opponent,
 * retiring players, and a dad joke.
 *
 * @param G        - The current game state
 * @param settings - User settings
 * @param dadJokes - Array of dad joke strings (optional)
 */
export function renderNews(
  G: GameState,
  settings: Settings,
  dadJokes?: readonly string[],
): void {
  const panel = document.getElementById('news-panel');
  if (!panel) return;

  const pt = G.teams[G.playerTeamId!];
  if (!pt) { panel.style.display = 'none'; return; }
  const div = pt.div;
  let items = '';

  /* 1. Injury Report */
  const injured = pt.players.filter(p => p.injuredFor > 0);
  if (injured.length) {
    let body = '';
    for (const p of injured) {
      body += `<div class="inj-line"><span class="inline-icon">${icon('cross', 14)}</span> <b>${p.name}</b> (${p.pos}) — ${p.injuredFor} ${p.injuredFor === 1 ? t(settings, 'match') : t(settings, 'matches')}</div>`;
    }
    items += `<div class="news-item news-injuries"><div class="news-label">${t(settings, 'newsInjuries')}</div><div class="news-body">${body}</div></div>`;
  }

  /* 2. Next Opponent */
  if (G.week <= SEASON_WEEKS && G.fixtures[div]) {
    const weekFix = G.fixtures[div][G.week - 1];
    if (weekFix) {
      const pm = weekFix.find(f => f.home === G.playerTeamId || f.away === G.playerTeamId);
      if (pm) {
        const oppId = pm.home === G.playerTeamId ? pm.away : pm.home;
        const opp = G.teams[oppId];
        const isHome = pm.home === G.playerTeamId;
        const oppAvg = opp.players.length
          ? Math.round(opp.players.reduce((s, p) => s + p.skill, 0) / opp.players.length)
          : 0;
        items += `<div class="news-item news-match"><div class="news-label">${t(settings, 'newsNextMatch')} — ${t(settings, 'week')} ${G.week}</div>` +
          `<div class="news-body"><b>${opp.name}</b> (${isHome ? 'Home' : 'Away'})<br>${t(settings, 'skill')} AVG: <b>${oppAvg}</b> | ${opp.players.length} players</div></div>`;
      }
    }
  }

  /* 3. Retiring Soon */
  const retiring = pt.players.filter(p => (RETIREMENT_AGE - (p.age || 25)) <= 3 && (p.age || 25) >= 35);
  if (retiring.length) {
    let body = '';
    for (const p of retiring) {
      const yrs = RETIREMENT_AGE - (p.age || 25);
      if (yrs <= 1) body += `<div class="retire-line"><span class="inline-icon warn">${icon('warning', 14)}</span> <b>${p.name}</b> (${p.pos}, ${t(settings, 'age')} ${p.age}) — ${t(settings, 'retiringThisSeason')}</div>`;
      else body += `<div class="retire-line"><span class="inline-icon">${icon('clock', 14)}</span> <b>${p.name}</b> (${p.pos}, ${t(settings, 'age')} ${p.age}) — ${t(settings, 'retiresIn', { n: yrs })}</div>`;
    }
    items += `<div class="news-item news-retire"><div class="news-label">${t(settings, 'newsRetiring')}</div><div class="news-body">${body}</div></div>`;
  }

  /* 4. Dad Joke */
  if (dadJokes && dadJokes.length) {
    const jokeIdx = Math.floor(Math.random() * dadJokes.length);
    const joke = dadJokes[jokeIdx];
    items += `<div class="news-item news-joke"><div class="news-label"><span class="inline-icon">${icon('smile', 14)}</span> ${t(settings, 'newsTitle')}</div><div class="news-body">${joke}</div></div>`;
  }

  if (items) {
    panel.style.display = '';
    panel.innerHTML = `<div class="news-title">${t(settings, 'newsTitle')}</div><div class="news-grid">${items}</div>`;
  } else {
    panel.style.display = 'none';
  }
}

/* ================================================================
   MAIN SQUAD RENDERER
   ================================================================ */

/**
 * Render the squad management view into the DOM.
 *
 * @param G        - The current game state
 * @param settings - User settings
 * @param callbacks - Object with global function names for player actions
 * @param dadJokes - Array of dad jokes for the news panel
 */
export function renderSquad(
  G: GameState,
  settings: Settings,
  callbacks?: {
    togglePlayer: string;
    changePos: string;
    showPlayerProfile: string;
    setTrainingFocus: string;
    onFormationChange: string;
    saveGame: string;
  },
  dadJokes?: readonly string[],
): void {
  /* Render the news panel first */
  renderNews(G, settings, dadJokes);

  const pt = G.teams[G.playerTeamId!];
  const toggleFn = callbacks?.togglePlayer ?? 'togglePlayer';
  const profileFn = callbacks?.showPlayerProfile ?? 'showPlayerProfile';
  const trainingFn = callbacks?.setTrainingFocus ?? 'setTrainingFocus';
  const saveFn = callbacks?.saveGame ?? 'saveGame';

  /* Sort players */
  type IndexedPlayer = Player & { _idx: number };
  let players: IndexedPlayer[] = pt.players.map((p, i) => ({ ...p, _idx: i }));

  if (G.sortByPos) {
    const order: Record<string, number> = { GK: 0, DEF: 1, MID: 2, STR: 3 };
    players.sort((a, b) => order[a.pos] - order[b.pos] || b.skill - a.skill);
  } else {
    players.sort((a, b) => playerOvr(b) - playerOvr(a));
  }

  /* ===== Tactic Selector Bar ===== */
  const tacticBar = document.getElementById('tactic-bar');
  if (tacticBar) {
    let tb = `<span class="tactic-label"><span class="inline-icon">${icon('tactic', 14)}</span> Tactic:</span>`;
    for (const [k, v] of Object.entries(TACTICS)) {
      tb += `<button class="tactic-btn${G.tactic === k ? ' active' : ''}" onclick="G.tactic='${k}';SFX.tactic();${saveFn}();renderSquad()">${v.label}</button>`;
    }
    tacticBar.innerHTML = tb;
  }

  /* ===== Training Focus Bar (simplified: 3 focuses) ===== */
  const trainingBar = document.getElementById('training-bar');
  if (trainingBar) {
    const focuses = [
      { key: 'balanced', label: 'Balanced', iconKey: 'tactic' as const, desc: 'All positions +8%' },
      { key: 'fitness', label: 'Fitness', iconKey: 'dumbbell' as const, desc: 'Stamina recovery' },
      { key: 'development', label: 'Development', iconKey: 'seedling' as const, desc: 'Skill growth, youth bonus' },
    ];
    let trb = `<span class="training-label"><span class="inline-icon">${icon('target', 14)}</span> Training:</span>`;
    for (const f of focuses) {
      trb += `<button class="training-btn${(G.trainingFocus || 'balanced') === f.key ? ' active' : ''}" onclick="${trainingFn}('${f.key}')" title="${f.desc}"><span class="btn-icon">${icon(f.iconKey, 14)}</span> ${f.label}</button>`;
    }
    trainingBar.innerHTML = trb;
  }

  /* ===== Squad Rules Panel ===== */
  const rulesPanel = document.getElementById('squad-rules-panel');
  if (rulesPanel) {
    const rules = G.squadRules || { restBelowStamina: null, alwaysStartBest: false };
    let rp = '<div class="squad-rules-bar">';
    rp += `<span class="training-label"><span class="inline-icon">${icon('gear', 14)}</span> Auto:</span>`;
    rp += `<button class="training-btn${rules.restBelowStamina != null ? ' active' : ''}" onclick="toggleSquadRule('restBelowStamina', 60)" title="Auto-bench players below 60% stamina">Rest Tired</button>`;
    rp += `<button class="training-btn${rules.alwaysStartBest ? ' active' : ''}" onclick="toggleSquadRule('alwaysStartBest')" title="Auto-pick best XI each week">Best XI</button>`;
    rp += '</div>';
    rulesPanel.innerHTML = rp;
  }

  const grid = document.getElementById('player-grid');
  if (!grid) return;

  const selCount = pt.players.filter(p => p.selected).length;
  const hasGK = pt.players.filter(p => p.selected).some(p => (p.assignedPos || p.pos) === 'GK');

  /* ===== Formation Selector Dropdown ===== */
  const formSelect = document.getElementById('formation-select') as HTMLSelectElement | null;
  if (formSelect && formSelect.options.length === 0) {
    FORMATIONS.forEach((f, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = f.label;
      formSelect.appendChild(opt);
    });
  }
  if (formSelect) formSelect.value = String(G.selectedFormationIdx);

  /* ===== Formation Bar ===== */
  const formBar = document.getElementById('formation-bar');
  const formDisp = document.getElementById('formation-display');
  const formStatus = document.getElementById('formation-status');
  if (formBar && formDisp && formStatus) {
    if (selCount >= 2) {
      formBar.style.display = 'flex';
      formDisp.textContent = getFormationString(pt);
      formStatus.innerHTML = `<span class="form-ok"><span class="inline-icon">${icon('check', 14)}</span> ${t(settings, 'balancedFormation')}</span>`;
    } else {
      formBar.style.display = 'none';
    }
  }

  /* ===== Power Bar ===== */
  const powerBar = document.getElementById('power-bar');
  if (powerBar) {
    if (selCount === 11 && settings.strengthDisplay !== 'none') {
      powerBar.style.display = 'flex';
      if (settings.strengthDisplay === 'power') {
        const avgRating = getTeamAvgRating(pt);
        const levels = getTeamPowerLevels(pt);
        powerBar.innerHTML =
          `<div class="pb-item"><span class="pb-label">${t(settings, 'avgRating')}</span> <span class="pb-value pb-avg">${avgRating}</span></div>` +
          `<div class="pb-item"><span class="pb-label">GK</span> <span class="pb-value pb-pos gk">${levels.GK}</span></div>` +
          `<div class="pb-item"><span class="pb-label">DEF</span> <span class="pb-value pb-pos def">${levels.DEF}</span></div>` +
          `<div class="pb-item"><span class="pb-label">MID</span> <span class="pb-value pb-pos mid">${levels.MID}</span></div>` +
          `<div class="pb-item"><span class="pb-label">STR</span> <span class="pb-value pb-pos str">${levels.STR}</span></div>` +
          `<div class="pb-item"><span class="pb-label">${t(settings, 'totalPower')}</span> <span class="pb-value pb-total">${levels.total}</span></div>`;
      } else {
        const avgRating = getTeamAvgRating(pt);
        powerBar.innerHTML = `<div class="pb-item"><span class="pb-label">${t(settings, 'avgRating')}</span> <span class="pb-value pb-avg">${avgRating}</span></div>`;
      }
    } else {
      powerBar.style.display = 'none';
    }
  }

  /* ===== Selection Warning ===== */
  const warn = document.getElementById('selection-warning');
  if (warn) {
    if (selCount > 0 && selCount < 11) {
      warn.style.display = 'block';
      const remaining = 11 - selCount;
      let msg = t(settings, 'selectMore', { count: remaining, s: remaining > 1 ? 's' : '' });
      if (!hasGK && selCount > 0) msg += ' ' + t(settings, 'mustIncludeGK');
      warn.textContent = msg;
    } else if (selCount === 11 && !hasGK) {
      warn.style.display = 'block';
      warn.textContent = t(settings, 'mustAssignGK');
    } else {
      warn.style.display = 'none';
    }
  }

  const pt_id = G.playerTeamId!;

  /* ===== List Header ===== */
  let h = `<div class="player-list-header">
    <span></span>
    <span>POS</span>
    <span>${t(settings, 'name') || 'PLAYER'}</span>
    <span>${t(settings, 'skill') || 'SKILL'}</span>
  </div>`;

  /* Position group names for section headers */
  const posGroupNames: Record<string, string> = { GK: 'Goalkeepers', DEF: 'Defenders', MID: 'Midfielders', STR: 'Strikers' };
  let lastPosGroup: string | null = null;
  let rowIdx = 0;

  /* ===== Player Rows ===== */
  for (const p of players) {
    /* Position group header (when sorted by position) */
    if (G.sortByPos && p.pos !== lastPosGroup) {
      const groupCount = players.filter(x => x.pos === p.pos).length;
      h += `<div class="pos-group-header">
        <span class="pos-group-label">${posGroupNames[p.pos] || p.pos}</span>
        <span class="pos-group-count">${groupCount} ${groupCount === 1 ? t(settings, 'player') || 'player' : t(settings, 'players') || 'players'}</span>
      </div>`;
      lastPosGroup = p.pos;
      rowIdx = 0;
    }

    const ovr = playerOvr(p);
    const stam = p.stamina != null ? p.stamina : 100;
    const isFresh = p.benchStreak >= 3;
    const starPlayer = isTopScorer(G, p.name, pt_id);
    const prevScorer = !starPlayer && isPreviousTopScorer(G, p.name, pt_id);
    const posCssClass = POS_CSS[p.pos] || '';
    const isInjured = p.injuredFor > 0;
    const stamClass = stam >= 70 ? 'stam-good' : stam >= 40 ? 'stam-warn' : 'stam-low';
    const retireYears = RETIREMENT_AGE - (p.age || 25);

    /* Retire icon */
    const retireIcon = retireYears <= 1
      ? `<span class="retire-icon retire-urgent" title="${t(settings, 'retiringThisSeason')}">${icon('warning', 14)}</span>`
      : retireYears === 2
        ? `<span class="retire-icon" title="${t(settings, 'retiresIn', { n: 2 })}">${icon('clock', 14)}</span>`
        : retireYears === 3
          ? `<span class="retire-icon" title="${t(settings, 'retiresIn', { n: 3 })}">${icon('clock', 14)}</span>`
          : '';

    const canSelect = !isInjured && !(p.suspendedFor > 0);
    const isChecked = p.selected;
    const isSuspended = p.suspendedFor > 0;
    const zebraClass = (rowIdx % 2 === 1) ? ' zebra' : '';

    /* Form arrows -- visual up/down indicators with On Fire status */
    const formVal = p.form || 0;
    const isOnFire = p.onFire === true;
    const formBadge = isOnFire
      ? `<span class="form-badge form-onfire" title="ON FIRE! Form +${formVal}, ${p.seasonGoals || 0} goals">${icon('fire', 14)}</span>`
      : formVal >= 2 ? `<span class="form-badge form-hot" title="Hot form (+${formVal})">${icon('arrowUp', 12)}${icon('arrowUp', 12)}</span>`
      : formVal >= 1 ? `<span class="form-badge form-good" title="Good form (+1)">${icon('arrowUp', 12)}</span>`
      : formVal <= -2 ? `<span class="form-badge form-cold" title="Cold form (${formVal})">${icon('arrowDown', 12)}${icon('arrowDown', 12)}</span>`
      : formVal <= -1 ? `<span class="form-badge form-poor" title="Poor form (-1)">${icon('arrowDown', 12)}</span>`
      : `<span class="form-badge form-neutral" title="Neutral form">&mdash;</span>`;

    /* Suspension badge */
    const suspBadge = isSuspended
      ? `<span class="card-badge suspended-badge" title="Suspended ${p.suspendedFor} match${p.suspendedFor > 1 ? 'es' : ''}">${icon('ban', 12)}${p.suspendedFor}</span>`
      : '';

    /* Card stats -- coloured square badges stand in for yellow/red cards */
    const cardBadges =
      ((p.seasonYellows || 0) > 0 ? `<span class="card-badge yellow-card-badge" title="${p.seasonYellows} yellow card${(p.seasonYellows || 0) > 1 ? 's' : ''}"><span class="card-rect yellow"></span>${(p.seasonYellows || 0) >= YELLOW_ACCUMULATION - 1 ? '!' : ''}</span>` : '') +
      ((p.seasonReds || 0) > 0 ? `<span class="card-badge red-card-badge" title="${p.seasonReds} red card${(p.seasonReds || 0) > 1 ? 's' : ''}"><span class="card-rect red"></span></span>` : '');

    /* Procedural player portrait -- deterministic per name, tinted with team colours. */
    const avatar = playerAvatar(p.name, { c1: pt.c1, c2: pt.c2, size: 40 });

    /* Injury, fresh, and scorer icons -- built from the SVG icon library */
    const injuryMark = isInjured
      ? `<span class="injury-icon" title="${t(settings, 'injuredMatches', { n: p.injuredFor }) || ''}">${icon('cross', 12)}</span>`
      : '';
    const freshMark = isFresh
      ? `<span class="fresh-icon" title="${t(settings, 'freshPlayer') || 'Fresh'}">${icon('bolt', 12)}</span>`
      : '';
    const starMark = starPlayer
      ? `<span class="top-scorer-star" title="${t(settings, 'seasonTopScorer') || ''}">${icon('star', 12)}</span>`
      : '';
    const prevMark = prevScorer
      ? `<span class="prev-scorer-ball" title="${t(settings, 'prevTopScorer') || ''}">${icon('ball', 12)}</span>`
      : '';
    const goalMark = (p.seasonGoals || 0) > 0
      ? ` &middot; <span class="inline-icon">${icon('ball', 12)}</span>${p.seasonGoals}`
      : '';

    h += `<div class="squad-row${isChecked ? ' selected' : ''}${isInjured ? ' injured-row' : ''}${isSuspended ? ' suspended-row' : ''}${zebraClass}" data-idx="${p._idx}"
         onclick="${toggleFn}(${p._idx},event)">
      <div class="pr-sel"><input type="checkbox" ${isChecked ? 'checked' : ''}
        ${!canSelect ? 'disabled' : ''} onclick="event.stopPropagation();${toggleFn}(${p._idx},event)"
        title="${isInjured ? (t(settings, 'injuredMatches', { n: p.injuredFor }) || 'Injured') : isSuspended ? 'Suspended ' + p.suspendedFor + ' match(es)' : ''}"></div>
      <div class="pr-avatar">${avatar}</div>
      <span class="pr-pos ${posCssClass}">${p.pos}</span>
      <div class="pr-info">
        <span class="pr-name"><a class="player-link" onclick="event.stopPropagation();${profileFn}(${p._idx})" title="View profile">${p.name}</a>${retireIcon}${injuryMark}${freshMark}${starMark}${prevMark}${formBadge}${suspBadge}${cardBadges}</span>
        <span class="pr-secondary">${t(settings, 'age') || 'Age'} ${p.age || '?'} &middot; STA <span class="${stamClass}">${stam}%</span> &middot; OVR ${ovr}${p.role ? ` &middot; <span class="role-tag">${p.role}</span>` : ''}${goalMark}</span>
      </div>
      <span class="pr-skill">${p.skill}</span>
    </div>`;
    rowIdx++;
  }

  grid.innerHTML = h;

  /* Update selection count and sort button text */
  const selCountEl = document.getElementById('sel-count');
  if (selCountEl) selCountEl.textContent = String(selCount);

  const sortBtn = document.getElementById('sort-btn');
  if (sortBtn) sortBtn.textContent = G.sortByPos ? t(settings, 'sortPosition') : t(settings, 'sortOverall');

  /* ===== Youth Academy Pipeline (#14) ===== */
  let youthContainer = document.getElementById('youth-prospects-panel');
  if (!youthContainer) {
    youthContainer = document.createElement('div');
    youthContainer.id = 'youth-prospects-panel';
    grid.parentElement?.appendChild(youthContainer);
  }
  if (G.youthProspects && G.youthProspects.length > 0) {
    let yh = `<div class="card" style="margin-top:12px"><div class="card-title"><span class="title-icon">${icon('cap', 18)}</span> Youth Academy Prospects</div>`;
    yh += `<div style="font-size:.78rem;color:var(--text-dim);padding:4px 0">Young players from your academy &mdash; promote to first team or release:</div>`;
    yh += `<div class="player-grid">`;
    G.youthProspects.forEach((yp, yi) => {
      if (yp.promoted) return;
      const p = yp.player;
      const canPromote = pt.players.length < 25;
      const youthAvatar = playerAvatar(p.name, { c1: pt.c1, c2: pt.c2, size: 40 });
      yh += `<div class="fa-card" style="border-left:3px solid var(--green)">`;
      yh += `<div class="fa-header">`;
      yh += `<div class="fa-avatar">${youthAvatar}</div>`;
      yh += `<span class="p-pos ${POS_CSS[p.pos]}">${p.pos}</span>`;
      yh += `<span class="p-name" style="font-weight:600;font-size:.92rem">${p.name}</span>`;
      yh += `<span class="p-skill-label">Skill: <b>${p.skill}</b></span>`;
      yh += `<span style="font-size:.75rem;color:var(--text-muted)">Age: ${p.age || 16}</span>`;
      yh += `</div>`;
      yh += `<div class="fa-actions">`;
      yh += `<button class="btn-sign" ${canPromote ? `onclick="promoteProspect(${yi})"` : 'disabled'}>${canPromote ? 'Promote' : 'Squad full'}</button>`;
      yh += `</div></div>`;
    });
    yh += `</div></div>`;
    youthContainer.innerHTML = yh;
  } else {
    youthContainer.innerHTML = '';
  }
}
