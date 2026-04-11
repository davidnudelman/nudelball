/**
 * market.ts — Transfer market view renderer.
 *
 * Renders the transfer market with:
 * - Budget & squad info header
 * - Free agents section
 * - NEW: AI Team Players section (players from other teams for sale)
 * - Sell players section
 * - Transfer log
 */

import type { GameState, Settings, Player, AIPlayerForSale } from '../../types';
import { SQUAD_MAX, SQUAD_MIN, POS_CSS, SELL_VALUE_RATIO, SCOUT_COSTS } from '../../config';
import { t } from '../../data/i18n';
import { teamLabel, playerAvatar } from '../../utils/helpers';
import { icon } from '../../assets/icons';

/* ================================================================
   PRICE CALCULATION HELPERS
   ================================================================ */

/**
 * Calculate a player's market value based on base skill.
 * Uses exponential scaling so top players cost significantly more.
 *
 * @param p - The player (needs at least a `skill` field)
 * @returns Market value rounded to nearest 100
 */
export function playerMarketValue(p: { skill: number }): number {
  const sk = p.skill || 1;
  return Math.round(sk * sk * 50 / 100) * 100;
}

/**
 * Calculate a player's sell value (fraction of market value).
 *
 * @param p - The player
 * @returns Sell value rounded to nearest 100
 */
export function playerSellValue(p: { skill: number }): number {
  return Math.round(playerMarketValue(p) * SELL_VALUE_RATIO / 100) * 100;
}

/* ================================================================
   NEW: AI TEAM PLAYERS — generate list of players other teams
   are willing to sell to the human player
   ================================================================ */

/**
 * Generate a list of players available from AI teams.
 *
 * Each AI team offers their weakest non-essential player for sale
 * at a markup over market value. Only teams that aren't the player's
 * team and have enough squad depth participate.
 *
 * @param G - The current game state
 * @returns Array of AIPlayerForSale objects
 */
export function getAIPlayersForSale(G: GameState): AIPlayerForSale[] {
  const result: AIPlayerForSale[] = [];

  for (const team of G.teams) {
    if (team.id === G.playerTeamId) continue;
    /* AI team needs enough depth to sell (more than SQUAD_MIN) */
    if (team.players.length <= SQUAD_MIN) continue;

    /* Offer the weakest player above minimum squad requirements */
    const sorted = team.players
      .map((p, idx) => ({ p, idx, value: p.skill }))
      .sort((a, b) => a.value - b.value);

    /* Pick the weakest player (with at least some skill) */
    const candidate = sorted[0];
    if (!candidate) continue;

    /* AI teams charge a premium (1.5x market value) */
    const price = Math.round(playerMarketValue(candidate.p) * 1.5 / 100) * 100;

    result.push({
      playerIdx: candidate.idx,
      player: candidate.p,
      price,
    });
  }

  /* Sort by price ascending so cheapest options appear first */
  result.sort((a, b) => a.price - b.price);
  return result;
}

/* ================================================================
   LOAN CANDIDATES HELPER
   ================================================================ */

/**
 * Get available loan players from higher-division AI teams.
 * Duplicates the engine logic inline to avoid circular imports.
 */
function getLoanCandidates(G: GameState): Array<{ player: Player; teamId: number; teamName: string; fee: number }> {
  if (G.playerTeamId == null) return [];
  const pt = G.teams[G.playerTeamId];
  const results: Array<{ player: Player; teamId: number; teamName: string; fee: number }> = [];

  for (const tm of G.teams) {
    if (tm.id === G.playerTeamId) continue;
    if (tm.div >= pt.div) continue; /* Only higher-division teams */
    if (tm.div < 1 || tm.div > 4) continue;

    const sorted = [...tm.players].sort((a, b) => a.skill - b.skill);
    const count = Math.min(2, Math.floor(sorted.length * 0.3));
    for (let i = 0; i < count; i++) {
      const p = sorted[i];
      const fee = Math.round(playerMarketValue(p) * 0.30 / 100) * 100;
      results.push({ player: p, teamId: tm.id, teamName: tm.name, fee });
    }
  }
  results.sort((a, b) => a.fee - b.fee);
  return results;
}

/* ================================================================
   MAIN MARKET RENDERER
   ================================================================ */

/**
 * Render the transfer market view into the DOM.
 *
 * Includes:
 * - Market reminder banner (if showReminder is true)
 * - Budget, squad size, window status header
 * - Free agents grid with sign buttons
 * - NEW: AI Team Players section showing players from other teams
 * - Sell players section with confirmation dialogs
 * - Recent transfers log
 *
 * @param G            - The current game state
 * @param settings     - User settings (for i18n)
 * @param showReminder - If true, show a reminder banner to visit the market
 * @param callbacks    - Object with callback function names for signing/selling
 */
export function renderMarket(
  G: GameState,
  settings: Settings,
  showReminder?: boolean,
  callbacks?: {
    signPlayer: string;
    sellPlayer: string;
    buyAIPlayer: string;
    playMatch: string;
  },
): void {
  const card = document.getElementById('market-card');
  if (!card) return;

  const pt = G.teams[G.playerTeamId!];
  const budget = G.budgets[pt.id] || 0;
  const squadSize = pt.players.length;
  const isOpen = G.transferWindow;
  const hasFreeSign = !G.usedFreeSign;

  const signFn = callbacks?.signPlayer ?? 'signPlayer';
  const sellFn = callbacks?.sellPlayer ?? 'sellPlayer';
  const buyAIFn = callbacks?.buyAIPlayer ?? 'buyAIPlayer';
  const playFn = callbacks?.playMatch ?? 'playMatch';

  let h = '';

  /* ===== Transfer Window Reminder Banner ===== */
  if (showReminder) {
    h += `<div class="market-reminder">`;
    h += `<div class="mr-text">`;
    h += hasFreeSign
      ? `<span class="inline-icon">${icon('star', 14)}</span> ${t(settings, 'marketReminderFree')}`
      : `<span class="inline-icon">${icon('money', 14)}</span> ${t(settings, 'marketReminder')}`;
    h += `</div>`;
    h += `<button class="btn btn-accent" onclick="${playFn}()" style="white-space:nowrap">${t(settings, 'marketSkip')}</button>`;
    h += `</div>`;
  }

  /* ===== Header ===== */
  h += `<div class="card-title"><span class="title-icon">${icon('money', 18)}</span> ${t(settings, 'transferMarket')}</div>`;
  h += `<div class="market-header">`;
  h += `<div class="budget-display">${t(settings, 'budget')} <span class="amount">$${budget.toLocaleString()}</span></div>`;
  h += `<div class="squad-size-display">${t(settings, 'squadLabel')} <span>${squadSize}</span>/${SQUAD_MAX} (${t(settings, 'min')} ${SQUAD_MIN})</div>`;
  if (hasFreeSign) {
    h += `<div style="font-size:.82rem;padding:3px 10px;border-radius:4px;font-family:'Oswald';letter-spacing:.05em;background:#ffdf00;color:#000;font-weight:700">${t(settings, 'freeFirstSigning')}</div>`;
  }
  h += `<div style="margin-left:auto;font-size:.82rem;padding:3px 10px;border-radius:4px;font-family:'Oswald';letter-spacing:.05em;${isOpen ? 'background:var(--green);color:#fff' : 'background:var(--bg-deep);color:var(--text-muted)'}">${isOpen ? t(settings, 'windowOpen') : t(settings, 'windowClosed')}</div>`;
  h += `</div>`;

  /* ===== Free Agents Section ===== */
  h += `<div class="market-section-title">${t(settings, 'freeAgents')}</div>`;
  if (!G.freeAgents || !G.freeAgents.length) {
    h += `<p style="color:var(--text-muted);font-size:.88rem;padding:8px 0">${t(settings, 'noFreeAgents')}</p>`;
  } else {
    h += '<div class="player-grid">';
    G.freeAgents.forEach((fa, i) => {
      const canAfford = hasFreeSign || budget >= fa.marketValue;
      const canSign = isOpen && canAfford && squadSize < SQUAD_MAX;
      const priceLabel = hasFreeSign
        ? `<span style="text-decoration:line-through;opacity:.5">$${fa.marketValue.toLocaleString()}</span> ${t(settings, 'free')}`
        : `$${fa.marketValue.toLocaleString()}`;
      const btnLabel = !isOpen ? t(settings, 'closed')
        : !canAfford ? t(settings, 'tooExpensive')
        : squadSize >= SQUAD_MAX ? t(settings, 'squadFull')
        : hasFreeSign ? t(settings, 'signFree')
        : t(settings, 'sign');

      const faAvatar = playerAvatar(fa.name, { size: 40 });
      h += `<div class="fa-card">`;
      h += `<div class="fa-header">`;
      h += `<div class="fa-avatar">${faAvatar}</div>`;
      h += `<span class="p-pos ${POS_CSS[fa.pos]}">${fa.pos}</span>`;
      h += `<span class="p-name" style="font-weight:600;font-size:.92rem">${fa.name}</span>`;
      h += `<span class="p-skill-label">${t(settings, 'skill')}: <b>${fa.skill}</b></span>`;
      h += `<span style="font-size:.75rem;color:${(fa.age || 25) >= 33 ? 'var(--red)' : (fa.age || 25) >= 30 ? '#e8a735' : 'var(--text-muted)'}">${t(settings, 'age')}: ${fa.age || '?'}</span>`;
      h += `</div>`;
      h += `<div class="fa-actions">`;
      h += `<span class="fa-price">${priceLabel}</span>`;
      h += `<button class="btn-sign" ${canSign ? `onclick="${signFn}(${i})"` : 'disabled'}>${btnLabel}</button>`;
      h += `</div></div>`;
    });
    h += '</div>';
  }

  /* ===== NEW: AI Team Players Section ===== */
  if (isOpen) {
    const aiPlayers = getAIPlayersForSale(G);
    if (aiPlayers.length) {
      h += `<div class="market-section-title"><span class="inline-icon">${icon('users', 14)}</span> AI Team Players</div>`;
      h += '<div class="player-grid">';
      for (const ap of aiPlayers) {
        const canAfford = budget >= ap.price;
        const canBuy = canAfford && squadSize < SQUAD_MAX;
        const team = G.teams.find(tm => tm.players.includes(ap.player));
        const teamName = team ? teamLabel(team) : 'Unknown';
        const apAvatar = playerAvatar(ap.player.name, team ? { c1: team.c1, c2: team.c2, size: 40 } : { size: 40 });

        h += `<div class="fa-card" style="border-left:3px solid var(--accent)">`;
        h += `<div class="fa-header">`;
        h += `<div class="fa-avatar">${apAvatar}</div>`;
        h += `<span class="p-pos ${POS_CSS[ap.player.pos]}">${ap.player.pos}</span>`;
        h += `<span class="p-name" style="font-weight:600;font-size:.92rem">${ap.player.name}</span>`;
        h += `<span class="p-skill-label">${t(settings, 'skill')}: <b>${ap.player.skill}</b></span>`;
        h += `<span style="font-size:.75rem;color:${(ap.player.age || 25) >= 33 ? 'var(--red)' : (ap.player.age || 25) >= 30 ? '#e8a735' : 'var(--text-muted)'}">${t(settings, 'age')}: ${ap.player.age || '?'}</span>`;
        h += `</div>`;
        h += `<div style="font-size:.75rem;color:var(--text-dim);padding:2px 8px">From: ${teamName}</div>`;
        h += `<div class="fa-actions">`;
        h += `<span class="fa-price">$${ap.price.toLocaleString()}</span>`;
        h += `<button class="btn-sign" ${canBuy ? `onclick="${buyAIFn}(${team?.id},${ap.playerIdx})"` : 'disabled'}>${!canAfford ? t(settings, 'tooExpensive') : squadSize >= SQUAD_MAX ? t(settings, 'squadFull') : t(settings, 'sign')}</button>`;
        h += `</div></div>`;
      }
      h += '</div>';
    }
  }

  /* ===== Loan Players Section (#8) ===== */
  if (isOpen && G.loans !== undefined) {
    h += `<div class="market-section-title"><span class="inline-icon">${icon('handshake', 14)}</span> Loan Players</div>`;
    /* Show current loans */
    if (G.loans && G.loans.length > 0) {
      h += `<div style="font-size:.82rem;color:var(--text-dim);padding:4px 0">Active loans (returned at season end):</div>`;
      for (const loan of G.loans) {
        const fromTeam = G.teams[loan.fromTeamId];
        h += `<div style="font-size:.82rem;padding:2px 8px"><span class="inline-icon">${icon('user', 12)}</span> <b>${loan.player.name}</b> (${loan.player.pos}, ${loan.player.skill}) from ${fromTeam ? fromTeam.name : 'Unknown'} &mdash; Fee: $${loan.loanFee.toLocaleString()}</div>`;
      }
    }
    /* Available loans from higher-division teams */
    h += `<div style="font-size:.78rem;color:var(--text-dim);padding:4px 0">Borrow players from higher-division teams for one season:</div>`;
    h += `<div class="player-grid">`;
    const loanCandidates = getLoanCandidates(G);
    if (loanCandidates.length === 0) {
      h += `<p style="color:var(--text-muted);font-size:.82rem">No loan players available (you must be in a lower division).</p>`;
    }
    for (const lc of loanCandidates.slice(0, 12)) {
      const canAfford = budget >= lc.fee;
      const canLoan = canAfford && squadSize < SQUAD_MAX;
      const fromT = G.teams[lc.teamId];
      const lcAvatar = playerAvatar(lc.player.name, fromT ? { c1: fromT.c1, c2: fromT.c2, size: 40 } : { size: 40 });
      h += `<div class="fa-card" style="border-left:3px solid var(--yellow)">`;
      h += `<div class="fa-header">`;
      h += `<div class="fa-avatar">${lcAvatar}</div>`;
      h += `<span class="p-pos ${POS_CSS[lc.player.pos]}">${lc.player.pos}</span>`;
      h += `<span class="p-name" style="font-weight:600;font-size:.92rem">${lc.player.name}</span>`;
      h += `<span class="p-skill-label">Skill: <b>${lc.player.skill}</b></span>`;
      h += `</div>`;
      h += `<div style="font-size:.75rem;color:var(--text-dim);padding:2px 8px">From: ${lc.teamName} (Div ${G.teams[lc.teamId]?.div || '?'})</div>`;
      h += `<div class="fa-actions">`;
      h += `<span class="fa-price">Loan: $${lc.fee.toLocaleString()}</span>`;
      h += `<button class="btn-sign" ${canLoan ? `onclick="loanPlayerAction(${lc.teamId},'${lc.player.name.replace(/'/g, "\\'")}',${lc.fee})"` : 'disabled'}>${!canAfford ? 'Too expensive' : squadSize >= SQUAD_MAX ? 'Squad full' : 'Loan'}</button>`;
      h += `</div></div>`;
    }
    h += `</div>`;
  }

  /* ===== Scout Network (#18) ===== */
  const scoutLevel = G.scoutLevel ?? 0;
  h += `<div class="market-section-title"><span class="inline-icon">${icon('radar', 14)}</span> Scout Network &mdash; Level ${scoutLevel}</div>`;
  h += `<div style="font-size:.82rem;padding:4px 0;color:var(--text-dim)">`;
  h += scoutLevel === 0 ? 'Basic scouting — only nearby divisions visible.' :
       scoutLevel === 1 ? 'Advanced scouting — all divisions visible.' :
       'Elite scouting — all divisions + hidden gems visible.';
  h += `</div>`;
  if (scoutLevel < SCOUT_COSTS.length - 1) {
    const nextCost = SCOUT_COSTS[scoutLevel + 1];
    const canUpgrade = budget >= nextCost;
    h += `<button class="btn-sign" style="margin:4px 0" ${canUpgrade ? `onclick="upgradeScout()"` : 'disabled'}>Upgrade to Level ${scoutLevel + 1} — $${nextCost.toLocaleString()}</button>`;
  } else {
    h += `<span style="font-size:.78rem;color:var(--green);font-weight:700">MAX LEVEL</span>`;
  }

  /* ===== Sell Players Section ===== */
  h += `<div class="market-section-title">${t(settings, 'sellPlayers')}</div>`;
  if (!isOpen) {
    h += `<p style="color:var(--text-muted);font-size:.88rem;padding:8px 0">${t(settings, 'windowClosedMsg')}</p>`;
  } else {
    h += '<div class="player-grid">';
    pt.players.forEach((p, i) => {
      const sellVal = playerSellValue(p);
      const canSell = squadSize > SQUAD_MIN;
      const stam = p.stamina != null ? p.stamina : 100;
      const stamColor = stam >= 70 ? 'stam-green' : stam >= 40 ? 'stam-yellow' : 'stam-red';
      const ownAvatar = playerAvatar(p.name, { c1: pt.c1, c2: pt.c2, size: 40 });

      h += `<div class="fa-card">`;
      h += `<div class="fa-header">`;
      h += `<div class="fa-avatar">${ownAvatar}</div>`;
      h += `<span class="p-pos ${POS_CSS[p.pos]}">${p.pos}</span>`;
      h += `<span class="p-name" style="font-weight:600;font-size:.92rem">${p.name}</span>`;
      h += `<span class="p-skill-label">${t(settings, 'skill')}: <b>${p.skill}</b></span>`;
      h += `<span style="font-size:.75rem;color:${(p.age || 25) >= 33 ? 'var(--red)' : (p.age || 25) >= 30 ? '#e8a735' : 'var(--text-muted)'}">${t(settings, 'age')}: ${p.age || '?'}</span>`;
      h += `</div>`;
      h += `<div class="stamina-bar" style="margin:4px 0"><div class="stamina-fill ${stamColor}" style="width:${stam}%"></div><span class="stamina-text">${stam}%</span></div>`;
      h += `<div class="fa-actions">`;
      h += `<span class="fa-price" style="color:var(--red)">$${sellVal.toLocaleString()}</span>`;
      h += `<button class="btn-sell" ${canSell ? `onclick="if(confirm('${t(settings, 'sellConfirm', { name: p.name.replace(/'/g, "\\'"), amount: sellVal.toLocaleString() })}'))${sellFn}(${i})"` : 'disabled'}>${canSell ? t(settings, 'sell') : t(settings, 'minSquad')}</button>`;
      h += `</div></div>`;
    });
    h += '</div>';
  }

  /* ===== Transfer Log ===== */
  if (G.transferLog && G.transferLog.length) {
    h += `<div class="market-section-title">${t(settings, 'recentTransfers')}</div>`;
    h += '<div class="transfer-log">';
    const recent = [...G.transferLog].reverse().slice(0, 20);
    for (const entry of recent) {
      const tm2 = G.teams.find(tm => tm.id === entry.teamId);
      const teamName = entry.teamName || (tm2 ? tm2.name : 'Unknown');
      const entryIcon = entry.type === 'buy' ? icon('inboxIn', 14) : icon('inboxOut', 14);
      h += `<div class="transfer-entry ${entry.type}"><span class="inline-icon">${entryIcon}</span> S${entry.season}: <b>${teamName}</b> ${entry.type === 'buy' ? t(settings, 'signed') : t(settings, 'sold')} <b>${entry.playerName}</b> &mdash; $${entry.amount.toLocaleString()}</div>`;
    }
    h += '</div>';
  }

  card.innerHTML = h;
}
