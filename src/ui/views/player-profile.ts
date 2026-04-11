/**
 * player-profile.ts — Individual player profile/stats page renderer.
 *
 * Renders detailed player stats including age, skill, OVR, stamina,
 * form, season stats, career stats, and retirement information.
 */

import type { GameState, Settings, Player, Position } from '../../types';
import { POS_CSS, POS_DISTANCE, OOP_PENALTY_PER_STEP, FORM_OVR_PCT, RETIREMENT_AGE } from '../../config';
import { playerAvatar } from '../../utils/helpers';
import { icon } from '../../assets/icons';

/* ================================================================
   HELPERS
   ================================================================ */

/** OOP penalty calculation (duplicated here to keep module self-contained) */
function getOopPenalty(naturalPos: Position, assignedPos: Position | null): number {
  if (!assignedPos || assignedPos === naturalPos) return 1.0;
  if (naturalPos === 'GK' || assignedPos === 'GK') return 0;
  const steps = Math.abs(POS_DISTANCE[naturalPos] - POS_DISTANCE[assignedPos]);
  return 1.0 - (steps * OOP_PENALTY_PER_STEP);
}

/** Calculate effective overall rating for a player */
function playerOvr(p: Player): number {
  const stam = p.stamina != null ? p.stamina : 100;
  const base = p.skill * (0.5 + 0.5 * stam / 100);
  const freshBonus = (p.benchStreak >= 3 && p.selected) ? 1.10 : 1.0;
  const oopMult = getOopPenalty(p.pos, p.assignedPos);
  const formMult = 1.0 + ((p.form || 0) * FORM_OVR_PCT);
  const raw = Math.round(base * freshBonus * oopMult * formMult);
  return Math.max(1, Math.min(raw, p.skill));
}

/* ================================================================
   MAIN PLAYER PROFILE RENDERER
   ================================================================ */

/**
 * Render the player profile view into the DOM.
 *
 * Shows:
 * - Player header (position badge + name)
 * - Key stats: Age, Skill, OVR, Stamina, Form
 * - This Season stats: Apps, Goals, Yellow/Red cards
 * - Career stats: Total Apps, Total Goals
 * - Retirement warning (if applicable)
 * - Back to Squad button
 *
 * @param G        - The current game state
 * @param settings - User settings
 */
export function renderPlayerProfile(G: GameState, settings: Settings): void {
  const el = document.getElementById('playerprofile-content');
  if (!el) return;

  const pt = G.teams[G.playerTeamId!];
  const viewing = G.viewingPlayerId;
  if (viewing == null) {
    el.innerHTML = '<div class="card-title">Player Profile</div><p style="padding:16px;color:var(--text-dim)">No player selected.</p>';
    return;
  }
  /* viewingPlayerId can be a plain number (legacy) or a ViewingPlayerId object */
  const idx = typeof viewing === 'number' ? viewing : (viewing as { playerIdx: number }).playerIdx;
  if (!pt.players[idx]) {
    el.innerHTML = '<div class="card-title">Player Profile</div><p style="padding:16px;color:var(--text-dim)">No player selected.</p>';
    return;
  }

  const p = pt.players[idx];
  const ovr = playerOvr(p);
  const posClass = POS_CSS[p.pos as keyof typeof POS_CSS] || '';
  const formVal = p.form || 0;
  const formLabel = formVal > 0 ? ('+' + formVal) : formVal.toString();
  const formIcon =
    formVal >= 2 ? icon('fire', 14) :
    formVal >= 1 ? icon('chartUp', 14) :
    formVal <= -2 ? icon('chartDown', 14) :
    formVal <= -1 ? icon('arrowDown', 14) :
    icon('close', 14);
  const streakLabel = (p.formStreak || 0) > 1 ? (' (' + p.formStreak + ' match streak)') : '';

  /* Procedural portrait, tinted with the player's team colours */
  const portrait = playerAvatar(p.name, { c1: pt.c1, c2: pt.c2, size: 96 });

  let h = `<div class="card-title">Player Profile</div>`;

  /* Header with portrait + identity */
  h += `<div class="pp-header">`;
  h += `<div class="pp-portrait">${portrait}</div>`;
  h += `<div class="pp-identity">`;
  h += `<div class="pp-name-row"><span class="pp-pos ${posClass}" style="background:var(--pos-${posClass})">${p.pos}</span><span class="pp-name">${p.name}</span></div>`;
  h += `<div class="pp-club">${pt.name}</div>`;
  h += `</div>`;
  h += `</div>`;

  /* Key stats grid */
  h += `<div class="pp-stat-grid">`;
  h += `<div class="pp-stat-card"><span class="ps-val">${p.age || '?'}</span><span class="ps-label">Age</span></div>`;
  h += `<div class="pp-stat-card"><span class="ps-val">${p.skill}</span><span class="ps-label">Skill</span></div>`;
  h += `<div class="pp-stat-card"><span class="ps-val">${ovr}</span><span class="ps-label">OVR</span></div>`;
  h += `<div class="pp-stat-card"><span class="ps-val">${p.stamina || 100}%</span><span class="ps-label">Stamina</span></div>`;
  h += `<div class="pp-stat-card"><span class="ps-val">${formIcon} ${formLabel}</span><span class="ps-label">Form${streakLabel}</span></div>`;
  if (p.suspendedFor > 0) {
    h += `<div class="pp-stat-card"><span class="ps-val" style="color:var(--red)">${p.suspendedFor}</span><span class="ps-label">Suspended</span></div>`;
  }
  if (p.injuredFor > 0) {
    h += `<div class="pp-stat-card"><span class="ps-val" style="color:var(--red)">${p.injuredFor}</span><span class="ps-label">Injured</span></div>`;
  }
  h += `</div>`;

  /* This Season stats */
  h += `<div class="pp-section"><div class="pp-section-title">This Season</div>`;
  h += `<div class="pp-stat-grid">`;
  h += `<div class="pp-stat-card"><span class="ps-val">${p.seasonApps || 0}</span><span class="ps-label">Appearances</span></div>`;
  h += `<div class="pp-stat-card"><span class="ps-val">${p.seasonGoals || 0}</span><span class="ps-label">Goals</span></div>`;
  h += `<div class="pp-stat-card"><span class="ps-val">${p.seasonYellows || 0}</span><span class="ps-label">Yellow Cards</span></div>`;
  h += `<div class="pp-stat-card"><span class="ps-val">${p.seasonReds || 0}</span><span class="ps-label">Red Cards</span></div>`;
  h += `</div></div>`;

  /* Career stats */
  h += `<div class="pp-section"><div class="pp-section-title">Career Stats</div>`;
  h += `<div class="pp-stat-grid">`;
  h += `<div class="pp-stat-card"><span class="ps-val">${p.careerApps || 0}</span><span class="ps-label">Appearances</span></div>`;
  h += `<div class="pp-stat-card"><span class="ps-val">${p.careerGoals || 0}</span><span class="ps-label">Goals</span></div>`;
  h += `</div></div>`;

  /* Retirement info */
  const retireYears = RETIREMENT_AGE - (p.age || 25);
  if (retireYears <= 3) {
    h += `<div class="pp-section"><div class="pp-section-title">Retirement</div>`;
    h += `<p style="color:var(--text-dim);font-size:.85rem">${
      retireYears <= 1
        ? `<span class="inline-icon warn">${icon('warning', 14)}</span> This player will retire at the end of this season!`
        : `<span class="inline-icon">${icon('clock', 14)}</span> This player will retire in ` + retireYears + ' seasons.'
    } Players who retire are automatically replaced by a new 18-year-old in the same position, with skill matching your division level.</p>`;
    h += `</div>`;
  }

  /* Back button */
  h += `<div style="margin-top:16px"><button class="btn btn-outline btn-has-icon" onclick="showView('squad')"><span class="btn-icon">${icon('arrowLeft', 14)}</span> Back to Squad</button></div>`;

  el.innerHTML = h;
}

/**
 * Set the player to view and navigate to the player profile.
 *
 * @param G        - The current game state
 * @param playerIdx - Index of the player in the team's roster
 * @param showView - Function to switch views
 */
export function showPlayerProfile(
  G: GameState,
  playerIdx: number,
  showView: (v: string) => void,
): void {
  G.viewingPlayerId = playerIdx as unknown as typeof G.viewingPlayerId;
  showView('playerprofile');
}
