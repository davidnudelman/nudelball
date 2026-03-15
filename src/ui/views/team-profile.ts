/**
 * team-profile.ts — Team profile view renderer.
 *
 * Renders a detailed team profile with head-to-head stats,
 * club info, and a sorted squad list.
 */

import type { GameState, Settings, Player, Position } from '../../types';
import { FORMATIONS, DEFAULT_FORMATION_IDX, POS_CSS, POS_DISTANCE, OOP_PENALTY_PER_STEP, FORM_OVR_PCT } from '../../config';
import { teamLabel, plateColors } from '../../utils/helpers';
import { t } from '../../data/i18n';

/* ================================================================
   HELPERS
   ================================================================ */

/**
 * Get the OOP (out-of-position) penalty multiplier.
 *
 * @param naturalPos  - The player's natural position
 * @param assignedPos - The player's assigned tactical position (null if unassigned)
 * @returns Multiplier (1.0 = natural, 0.85 = 1 step, 0.70 = 2 steps, 0 = GK mismatch)
 */
function getOopPenalty(naturalPos: Position, assignedPos: Position | null): number {
  if (!assignedPos || assignedPos === naturalPos) return 1.0;
  if (naturalPos === 'GK' || assignedPos === 'GK') return 0;
  const steps = Math.abs(POS_DISTANCE[naturalPos] - POS_DISTANCE[assignedPos]);
  return 1.0 - (steps * OOP_PENALTY_PER_STEP);
}

/**
 * Calculate a player's effective overall rating.
 *
 * @param p - The player
 * @returns Effective OVR (capped at base skill)
 */
function playerOvr(p: Player): number {
  const stam = p.stamina != null ? p.stamina : 100;
  const base = p.skill * (0.5 + 0.5 * stam / 100);
  const freshBonus = (p.benchStreak >= 3 && p.selected) ? 1.10 : 1.0;
  const oopMult = getOopPenalty(p.pos, p.assignedPos);
  const formMult = 1.0 + ((p.form || 0) * FORM_OVR_PCT);
  const raw = Math.round(base * freshBonus * oopMult * formMult);
  return Math.max(1, Math.min(raw, p.skill));
}

/**
 * Calculate head-to-head stats between the player's team and a rival.
 *
 * Scans all divisions' fixtures in the current season.
 *
 * @param G       - The current game state
 * @param rivalId - The rival team's ID
 * @returns H2H record: { w, d, l, gf, ga }
 */
function getHeadToHead(G: GameState, rivalId: number): { w: number; d: number; l: number; gf: number; ga: number } {
  const ptId = G.playerTeamId!;
  const h2h = { w: 0, d: 0, l: 0, gf: 0, ga: 0 };
  for (let d = 1; d <= 4; d++) {
    if (!G.fixtures[d]) continue;
    for (const week of G.fixtures[d]) {
      for (const f of week) {
        if (f.homeGoals === null) continue;
        const isHome = f.home === ptId && f.away === rivalId;
        const isAway = f.away === ptId && f.home === rivalId;
        if (!isHome && !isAway) continue;
        const myGoals = isHome ? f.homeGoals! : f.awayGoals!;
        const theirGoals = isHome ? f.awayGoals! : f.homeGoals!;
        h2h.gf += myGoals;
        h2h.ga += theirGoals;
        if (myGoals > theirGoals) h2h.w++;
        else if (myGoals < theirGoals) h2h.l++;
        else h2h.d++;
      }
    }
  }
  return h2h;
}

/* ================================================================
   STATE: which team profile is being viewed
   ================================================================ */

/** Currently viewed team ID (module-level state) */
let _profileTeamId: number | null = null;

/**
 * Set the team profile to view and switch to the team profile view.
 *
 * @param teamId   - ID of the team to display
 * @param showView - Function to switch to the 'teamprofile' view
 */
export function openTeamProfile(teamId: number, showView: (v: string) => void): void {
  _profileTeamId = teamId;
  showView('teamprofile');
}

/**
 * Get the currently viewed team profile ID.
 */
export function getProfileTeamId(): number | null {
  return _profileTeamId;
}

/* ================================================================
   MAIN TEAM PROFILE RENDERER
   ================================================================ */

/**
 * Render the team profile view into the DOM.
 *
 * Shows:
 * - Team name plate with division and trophies
 * - Head-to-head record (if viewing a rival)
 * - Club info (squad size, formation, budget, season record, goals, trophies)
 * - Full squad list sorted by position then OVR
 *
 * @param G        - The current game state
 * @param settings - User settings (for i18n)
 */
export function renderTeamProfile(G: GameState, settings: Settings): void {
  const container = document.getElementById('teamprofile-content');
  if (!container) return;

  if (_profileTeamId === null) { container.innerHTML = ''; return; }
  const tm = G.teams[_profileTeamId];
  if (!tm) { container.innerHTML = ''; return; }

  const isPlayer = tm.id === G.playerTeamId;
  const budget = (G.budgets && G.budgets[tm.id]) || 0;

  /* Get formation label */
  let formLabel = '—';
  if (tm.id === G.playerTeamId) {
    const formObj = FORMATIONS[G.selectedFormationIdx];
    if (formObj) formLabel = formObj.label;
  } else {
    const formIdx = tm.aiFormation != null ? tm.aiFormation : DEFAULT_FORMATION_IDX;
    const formObj = FORMATIONS[formIdx];
    if (formObj) formLabel = formObj.label;
  }

  let h = '';

  /* Back button */
  h += `<button class="tp-back" onclick="showView('table')">&#8592; ${t(settings, 'tpBack')}</button>`;

  /* Header with team plate */
  h += `<div class="tp-header">`;
  const _tpc = plateColors(tm.c1, tm.c2);
  h += `<span class="team-plate" style="background:${_tpc.bg};color:${_tpc.txt};font-size:1.3rem;padding:4px 14px">${tm.name}</span>`;
  h += `<span class="tp-div">${t(settings, 'division')} ${tm.div}</span>`;
  if (tm.trophies && tm.trophies.length) {
    h += ' ';
    for (const tr of tm.trophies) {
      if (tr.type === 'gold_trophy') h += `<span class="trophy" title="${t(settings, 'div1Champion')} S${tr.season}">&#127942;</span>`;
      else if (tr.type === 'silver_trophy') h += `<span class="trophy silver" title="${t(settings, 'div1RunnerUp')} S${tr.season}">&#127942;</span>`;
      else if (tr.type === 'gold_medal') h += `<span class="trophy" title="${t(settings, 'div2Champion')} S${tr.season}">&#129351;</span>`;
      else if (tr.type === 'silver_medal') h += `<span class="trophy" title="${t(settings, 'div2RunnerUp')} S${tr.season}">&#129352;</span>`;
    }
  }
  h += `</div>`;

  /* Head-to-Head (only for rival teams) */
  if (!isPlayer) {
    const h2h = getHeadToHead(G, tm.id);
    const played = h2h.w + h2h.d + h2h.l;
    h += `<div class="tp-section">`;
    h += `<div class="tp-section-title">${t(settings, 'tpH2H')}</div>`;
    if (played === 0) {
      h += `<p style="color:var(--text-muted);font-size:.85rem">${t(settings, 'tpNoH2H')}</p>`;
    } else {
      h += `<div class="tp-h2h">`;
      h += `<div class="h2h-stat h2h-win"><div class="h2h-val">${h2h.w}</div><div class="h2h-lbl">${t(settings, 'thW')}</div></div>`;
      h += `<div class="h2h-stat h2h-draw"><div class="h2h-val">${h2h.d}</div><div class="h2h-lbl">${t(settings, 'thD')}</div></div>`;
      h += `<div class="h2h-stat h2h-loss"><div class="h2h-val">${h2h.l}</div><div class="h2h-lbl">${t(settings, 'thL')}</div></div>`;
      h += `</div>`;
      h += `<div style="font-size:.82rem;color:var(--text-dim)">${t(settings, 'tpH2HGoals', { gf: h2h.gf, ga: h2h.ga })}</div>`;
    }
    h += `</div>`;
  }

  /* Club Info */
  h += `<div class="tp-section">`;
  h += `<div class="tp-section-title">${t(settings, 'tpClubInfo')}</div>`;
  h += `<ul class="tp-list">`;
  h += `<li><span class="tp-label">${t(settings, 'tpSquadSize')}</span><span class="tp-val">${tm.players.length}</span></li>`;
  h += `<li><span class="tp-label">${t(settings, 'tpFormation')}</span><span class="tp-val">${formLabel}</span></li>`;
  h += `<li><span class="tp-label">${t(settings, 'tpBudget')}</span><span class="tp-val">$${budget.toLocaleString()}</span></li>`;
  const ss = tm.seasonStats;
  h += `<li><span class="tp-label">${t(settings, 'tpSeasonRecord')}</span><span class="tp-val">${ss.w}W ${ss.d}D ${ss.l}L</span></li>`;
  const gd = ss.gf - ss.ga;
  h += `<li><span class="tp-label">${t(settings, 'tpGoals')}</span><span class="tp-val">${ss.gf} ${t(settings, 'thGF')} / ${ss.ga} ${t(settings, 'thGA')} (${gd >= 0 ? '+' : ''}${gd})</span></li>`;
  h += `<li><span class="tp-label">${t(settings, 'tpTrophies')}</span><span class="tp-val">${tm.trophies ? tm.trophies.length : 0}</span></li>`;
  h += `</ul></div>`;

  /* Squad List */
  h += `<div class="tp-section">`;
  h += `<div class="tp-section-title">${t(settings, 'tpSquad')}</div>`;
  const sorted = [...tm.players].sort((a, b) => {
    const order: Record<string, number> = { GK: 0, DEF: 1, MID: 2, STR: 3 };
    return (order[a.pos] || 99) - (order[b.pos] || 99) || playerOvr(b) - playerOvr(a);
  });
  h += `<table class="tp-player-list"><thead><tr><th>${t(settings, 'tpPos')}</th><th>${t(settings, 'thPlayer')}</th><th>OVR</th></tr></thead><tbody>`;
  for (const p of sorted) {
    const ovr = playerOvr(p);
    const posClass = POS_CSS[p.pos] || '';
    h += `<tr><td><span class="p-pos ${posClass}" style="font-size:.75rem;padding:2px 6px">${p.pos}</span></td><td>${p.name}</td><td style="font-family:'Oswald';font-weight:600">${ovr}</td></tr>`;
  }
  h += `</tbody></table></div>`;

  container.innerHTML = h;
}
