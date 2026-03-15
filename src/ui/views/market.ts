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
import { SQUAD_MAX, SQUAD_MIN, POS_CSS, SELL_VALUE_RATIO } from '../../config';
import { t } from '../../data/i18n';
import { teamLabel } from '../../utils/helpers';

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
      ? `&#127873; ${t(settings, 'marketReminderFree')}`
      : `&#128176; ${t(settings, 'marketReminder')}`;
    h += `</div>`;
    h += `<button class="btn btn-accent" onclick="${playFn}()" style="white-space:nowrap">${t(settings, 'marketSkip')}</button>`;
    h += `</div>`;
  }

  /* ===== Header ===== */
  h += `<div class="card-title">&#128176; ${t(settings, 'transferMarket')}</div>`;
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

      h += `<div class="fa-card">`;
      h += `<div class="fa-header">`;
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
      h += `<div class="market-section-title">&#128101; AI Team Players</div>`;
      h += '<div class="player-grid">';
      for (const ap of aiPlayers) {
        const canAfford = budget >= ap.price;
        const canBuy = canAfford && squadSize < SQUAD_MAX;
        const team = G.teams.find(tm => tm.players.includes(ap.player));
        const teamName = team ? teamLabel(team) : 'Unknown';

        h += `<div class="fa-card" style="border-left:3px solid var(--accent)">`;
        h += `<div class="fa-header">`;
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

      h += `<div class="fa-card">`;
      h += `<div class="fa-header">`;
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
      const icon = entry.type === 'buy' ? '&#128229;' : '&#128228;';
      h += `<div class="transfer-entry ${entry.type}">${icon} S${entry.season}: <b>${teamName}</b> ${entry.type === 'buy' ? t(settings, 'signed') : t(settings, 'sold')} <b>${entry.playerName}</b> — $${entry.amount.toLocaleString()}</div>`;
    }
    h += '</div>';
  }

  card.innerHTML = h;
}
