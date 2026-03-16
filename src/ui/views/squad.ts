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
  TACTICS, TRAINING_FOCUSES,
  POS_ORDER, POS_CSS,
  FORM_OVR_PCT, YELLOW_ACCUMULATION, SEASON_WEEKS, RETIREMENT_AGE,
} from '../../config';
import { t } from '../../data/i18n';
import { isTopScorer, isPreviousTopScorer } from './scorers';

/* ================================================================
   HELPER FUNCTIONS (self-contained within this module)
   ================================================================ */

/** Effective overall rating (uses natural position — no OOP penalty) */
export function playerOvr(p: Player): number {
  const stam = p.stamina != null ? p.stamina : 100;
  const base = p.skill * (0.5 + 0.5 * stam / 100);
  const freshBonus = (p.benchStreak >= 3 && p.selected) ? 1.10 : 1.0;
  const formMult = 1.0 + ((p.form || 0) * FORM_OVR_PCT);
  const raw = Math.round(base * freshBonus * formMult);
  return Math.max(1, Math.min(raw, p.skill));
}

/** Average rating of selected starters */
export function getTeamAvgRating(team: { players: Player[] }): number {
  const starters = team.players.filter(p => p.selected);
  if (!starters.length) return 0;
  return Math.round(starters.reduce((s, p) => s + playerOvr(p) * (p.subbedIn ? 1.10 : 1.0), 0) / starters.length);
}

/** Power levels per position group (uses natural position) */
export function getTeamPowerLevels(team: { players: Player[] }): PowerLevels {
  const starters = team.players.filter(p => p.selected);
  const levels: PowerLevels = { GK: 0, DEF: 0, MID: 0, STR: 0, total: 0 };
  for (const p of starters) {
    const eff = playerOvr(p) * (p.subbedIn ? 1.10 : 1.0);
    levels[p.pos] = (levels[p.pos] || 0) + eff;
    levels.total += eff;
  }
  return levels;
}

/** Formation slot counts for selected starters (uses natural position) */
export function getFormationCounts(team: { players: Player[] }): Record<Position, number> {
  const starters = team.players.filter(p => p.selected);
  const counts: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, STR: 0 };
  for (const p of starters) {
    counts[p.pos] = (counts[p.pos] || 0) + 1;
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
      body += `<div class="inj-line">&#10014; <b>${p.name}</b> (${p.pos}) — ${p.injuredFor} ${p.injuredFor === 1 ? t(settings, 'match') : t(settings, 'matches')}</div>`;
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
      if (yrs <= 1) body += `<div class="retire-line">&#9888;&#65039; <b>${p.name}</b> (${p.pos}, ${t(settings, 'age')} ${p.age}) — ${t(settings, 'retiringThisSeason')}</div>`;
      else body += `<div class="retire-line">&#9203; <b>${p.name}</b> (${p.pos}, ${t(settings, 'age')} ${p.age}) — ${t(settings, 'retiresIn', { n: yrs })}</div>`;
    }
    items += `<div class="news-item news-retire"><div class="news-label">${t(settings, 'newsRetiring')}</div><div class="news-body">${body}</div></div>`;
  }

  /* 4. Dad Joke */
  if (dadJokes && dadJokes.length) {
    const jokeIdx = Math.floor(Math.random() * dadJokes.length);
    const joke = dadJokes[jokeIdx];
    items += `<div class="news-item news-joke"><div class="news-label">&#128516; ${t(settings, 'newsTitle')}</div><div class="news-body">${joke}</div></div>`;
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
    changePos?: string;
    showPlayerProfile: string;
    setTrainingFocus: string;
    onFormationChange?: string;
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
    let tb = '<span class="tactic-label">&#9876;&#65039; Tactic:</span>';
    for (const [k, v] of Object.entries(TACTICS)) {
      tb += `<button class="tactic-btn${G.tactic === k ? ' active' : ''}" onclick="G.tactic='${k}';SFX.tactic();${saveFn}();renderSquad()">${v.icon} ${v.label}</button>`;
    }
    tacticBar.innerHTML = tb;
  }

  /* ===== Training Focus Bar ===== */
  const trainingBar = document.getElementById('training-bar');
  if (trainingBar) {
    const focuses = [
      { key: 'balanced', label: 'Balanced', icon: '&#9878;&#65039;' },
      { key: 'attack', label: 'Attack', icon: '&#9876;&#65039;' },
      { key: 'defence', label: 'Defence', icon: '&#128737;&#65039;' },
      { key: 'fitness', label: 'Fitness', icon: '&#128170;' },
      { key: 'youth', label: 'Youth Dev', icon: '&#127793;' },
    ];
    let trb = '<span class="training-label">&#127919; Training Focus:</span>';
    for (const f of focuses) {
      trb += `<button class="training-btn${(G.trainingFocus || 'balanced') === f.key ? ' active' : ''}" onclick="${trainingFn}('${f.key}')">${f.icon} ${f.label}</button>`;
    }
    trainingBar.innerHTML = trb;
  }

  const grid = document.getElementById('player-grid');
  if (!grid) return;

  const selCount = pt.players.filter(p => p.selected).length;
  const hasGK = pt.players.filter(p => p.selected).some(p => p.pos === 'GK');

  /* ===== Formation Bar (auto-derived from natural positions) ===== */
  const formBar = document.getElementById('formation-bar');
  const formDisp = document.getElementById('formation-display');
  const formStatus = document.getElementById('formation-status');
  if (formBar && formDisp && formStatus) {
    if (selCount >= 2) {
      formBar.style.display = 'flex';
      formDisp.textContent = getFormationString(pt);
      formStatus.innerHTML = '';
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
      ? `<span class="retire-icon retire-urgent" title="${t(settings, 'retiringThisSeason')}">&#9888;&#65039;</span>`
      : retireYears === 2
        ? `<span class="retire-icon" title="${t(settings, 'retiresIn', { n: 2 })}">&#9203;</span>`
        : retireYears === 3
          ? `<span class="retire-icon" title="${t(settings, 'retiresIn', { n: 3 })}">&#9203;</span>`
          : '';

    const canSelect = !isInjured && !(p.suspendedFor > 0);
    const isChecked = p.selected;
    const isSuspended = p.suspendedFor > 0;
    const zebraClass = (rowIdx % 2 === 1) ? ' zebra' : '';

    /* Form badge */
    const formVal = p.form || 0;
    const formBadge = formVal >= 2 ? `<span class="form-badge form-hot" title="Hot streak (+${formVal})">&#128293;</span>`
      : formVal >= 1 ? '<span class="form-badge form-warm" title="Good form (+1)">&#128200;</span>'
      : formVal <= -2 ? `<span class="form-badge form-cold" title="Cold streak (${formVal})">&#129398;</span>`
      : formVal <= -1 ? '<span class="form-badge form-cool" title="Poor form (-1)">&#128201;</span>'
      : '';

    /* Suspension badge */
    const suspBadge = isSuspended
      ? `<span class="card-badge suspended-badge" title="Suspended ${p.suspendedFor} match${p.suspendedFor > 1 ? 'es' : ''}">&#128683;${p.suspendedFor}</span>`
      : '';

    /* Card stats */
    const cardBadges =
      ((p.seasonYellows || 0) > 0 ? `<span class="card-badge yellow-card-badge" title="${p.seasonYellows} yellow card${(p.seasonYellows || 0) > 1 ? 's' : ''}">&#129000;${(p.seasonYellows || 0) >= YELLOW_ACCUMULATION - 1 ? '!' : ''}</span>` : '') +
      ((p.seasonReds || 0) > 0 ? `<span class="card-badge red-card-badge" title="${p.seasonReds} red card${(p.seasonReds || 0) > 1 ? 's' : ''}">&#129001;</span>` : '');

    h += `<div class="squad-row${isChecked ? ' selected' : ''}${isInjured ? ' injured-row' : ''}${isSuspended ? ' suspended-row' : ''}${zebraClass}" data-idx="${p._idx}"
         onclick="${toggleFn}(${p._idx},event)">
      <div class="pr-sel"><input type="checkbox" ${isChecked ? 'checked' : ''}
        ${!canSelect ? 'disabled' : ''} onclick="event.stopPropagation();${toggleFn}(${p._idx},event)"
        title="${isInjured ? (t(settings, 'injuredMatches', { n: p.injuredFor }) || 'Injured') : isSuspended ? 'Suspended ' + p.suspendedFor + ' match(es)' : ''}"></div>
      <span class="pr-pos ${posCssClass}">${p.pos}</span>
      <div class="pr-info">
        <span class="pr-name"><a class="player-link" onclick="event.stopPropagation();${profileFn}(${p._idx})" title="View profile">${p.name}</a>${retireIcon}${isInjured ? `<span class="injury-icon" title="${t(settings, 'injuredMatches', { n: p.injuredFor }) || ''}">${'&#10014;'.repeat(Math.min(p.injuredFor, 3))}</span>` : ''}${isFresh ? '<span class="fresh-icon" title="' + (t(settings, 'freshPlayer') || 'Fresh') + '">&#9889;</span>' : ''}${starPlayer ? '<span class="top-scorer-star" title="' + (t(settings, 'seasonTopScorer') || '') + '">&#9733;</span>' : ''}${prevScorer ? '<span class="prev-scorer-ball" title="' + (t(settings, 'prevTopScorer') || '') + '">&#9917;</span>' : ''}${formBadge}${suspBadge}${cardBadges}</span>
        <span class="pr-secondary">${t(settings, 'age') || 'Age'} ${p.age || '?'} &middot; STA <span class="${stamClass}">${stam}%</span> &middot; OVR ${ovr}${(p.seasonGoals || 0) > 0 ? ` &middot; &#9917;${p.seasonGoals}` : ''}</span>
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
}
