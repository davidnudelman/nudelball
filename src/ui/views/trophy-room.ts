/**
 * trophy-room.ts — Trophy room view renderer.
 *
 * Renders the complete trophy room with:
 * - Trophy Cabinet (single-season stat records)
 * - Season Records (scorer, match, power records)
 * - All-Time Stats (cumulative career stats)
 * - Milestones (promotions, streaks, clean sheets)
 * - Badges & Hall of Fame (achievement badges, top scorers)
 */

import type { GameState, Settings, Team, Records, StatRecord, LeagueStatRecord,
  TopScorerRecord, LeagueTopScorerRecord, MatchResultRecord, LeagueMatchResultRecord,
  MostGoalsRecord, LeagueMostGoalsRecord } from '../../types';
import { t } from '../../data/i18n';

/* ================================================================
   HELPER: Single-season record card (your best vs league record)
   ================================================================ */

/**
 * Render a record comparison card for a single-season stat.
 *
 * @param settings      - User settings (for i18n)
 * @param title         - Record title text
 * @param yours         - The player's best record
 * @param league        - The league-wide best record
 * @param lowerIsBetter - True if lower values are better (e.g. fewest defeats)
 * @returns HTML string for the record card
 */
function trRecordCard(
  settings: Settings,
  title: string,
  yours: StatRecord,
  league: LeagueStatRecord,
  lowerIsBetter: boolean,
): string {
  const hasYours = yours.season > 0;
  const hasLeague = league.season > 0;
  const yoursVal = hasYours ? yours.value : '—';
  const isHolder = hasYours && hasLeague && (lowerIsBetter ? yours.value <= league.value : yours.value >= league.value);

  let h = `<div class="record-card${isHolder ? ' is-record' : ''}">`;
  h += `<div class="rc-title">${title}</div>`;
  h += `<div class="rc-value">${yoursVal}</div>`;
  if (hasYours) h += `<div class="rc-detail">${t(settings, 'season')} ${yours.season}</div>`;
  h += `<div class="rc-compare">`;
  h += `<span class="rc-yours">${t(settings, 'trYourBest')}: ${yoursVal}${hasYours ? ' (S' + yours.season + ')' : ''}</span>`;
  h += `<span class="rc-league">${t(settings, 'trLeagueRecord')}: ${hasLeague ? league.value + ' — ' + league.team + ' (S' + league.season + ')' : '—'}</span>`;
  h += `</div></div>`;
  return h;
}

/* ================================================================
   HELPER: Match/scorer/power record card
   ================================================================ */

/**
 * Render a record card for match-based, scorer-based, or power records.
 *
 * @param settings - User settings
 * @param title    - Record title
 * @param yours    - The player's record
 * @param league   - The league record
 * @param type     - Record type: 'scorer', 'match', or 'power'
 * @returns HTML string
 */
function trMatchRecord(
  settings: Settings,
  title: string,
  yours: TopScorerRecord | MatchResultRecord | MostGoalsRecord | StatRecord,
  league: LeagueTopScorerRecord | LeagueMatchResultRecord | LeagueMostGoalsRecord | LeagueStatRecord,
  type: 'scorer' | 'match' | 'power',
): string {
  let yourDisplay = '—';
  let leagueDisplay = '—';
  let mainVal: string | number = '—';

  if (type === 'scorer') {
    const y = yours as TopScorerRecord;
    const l = league as LeagueTopScorerRecord;
    if (y.goals > 0) {
      yourDisplay = y.name + ' — ' + y.goals + ' ' + t(settings, 'goals') + ' (S' + y.season + ')';
      mainVal = y.goals;
    }
    if (l.goals > 0) leagueDisplay = l.name + ' — ' + l.goals + ' ' + t(settings, 'goals') + ' (' + l.team + ', S' + l.season + ')';
  } else if (type === 'match') {
    const y = yours as MatchResultRecord;
    const l = league as LeagueMatchResultRecord;
    if (y.season > 0) {
      yourDisplay = y.score + ' vs ' + y.opponent + ' (S' + y.season + ')';
      mainVal = y.score;
    }
    if (l.season > 0) leagueDisplay = l.score + (l.team ? ' — ' + l.team : '') + ' (S' + l.season + ')';
  } else if (type === 'power') {
    const y = yours as StatRecord;
    const l = league as LeagueStatRecord;
    if (y.value > 0) {
      yourDisplay = y.value + ' (S' + y.season + ')';
      mainVal = y.value;
    }
    if (l.value > 0) leagueDisplay = l.value + ' — ' + l.team + ' (S' + l.season + ')';
  }

  let h = `<div class="record-card">`;
  h += `<div class="rc-title">${title}</div>`;
  h += `<div class="rc-value">${mainVal}</div>`;
  h += `<div class="rc-compare">`;
  h += `<span class="rc-yours">${t(settings, 'trYourBest')}: ${yourDisplay}</span>`;
  h += `<span class="rc-league">${t(settings, 'trLeagueRecord')}: ${leagueDisplay}</span>`;
  h += `</div></div>`;
  return h;
}

/* ================================================================
   HELPER: Milestone card
   ================================================================ */

/**
 * Render a compact milestone card with icon, value, and label.
 */
function trMilestone(icon: string, value: string | number, label: string): string {
  return `<div class="milestone-card"><div class="ms-icon">${icon}</div><div class="ms-value">${value}</div><div class="ms-label">${label}</div></div>`;
}

/* ================================================================
   HELPER: Achievement badges
   ================================================================ */

/**
 * Render achievement badges (Invincible Season, 100 Wins Club, 100 Goals Club).
 */
function trBadges(settings: Settings, pt: Team, r: Records): string {
  let h = '<div class="badge-row">';

  /* Invincible Season: 0 losses in a season */
  const hasInvincible = r.fewestDefeats.value === 0 && r.fewestDefeats.season > 0;
  if (hasInvincible) {
    h += `<span class="badge gold">&#128081; ${t(settings, 'trInvincible')} (S${r.fewestDefeats.season})</span>`;
  } else {
    h += `<span class="badge locked">&#128274; ${t(settings, 'trInvincible')}</span>`;
  }

  /* Centurion: 100 Wins */
  if (pt.stats.w >= 100) {
    h += `<span class="badge gold">&#128175; ${t(settings, 'trCenturionWins')}</span>`;
  } else {
    h += `<span class="badge locked">&#128274; ${t(settings, 'trCenturionWins')} (${pt.stats.w}/100)</span>`;
  }

  /* Centurion: 100 Goals */
  if (pt.stats.gf >= 100) {
    h += `<span class="badge gold">&#128175; ${t(settings, 'trCenturionGoals')}</span>`;
  } else {
    h += `<span class="badge locked">&#128274; ${t(settings, 'trCenturionGoals')} (${pt.stats.gf}/100)</span>`;
  }

  h += '</div>';
  return h;
}

/* ================================================================
   HELPER: Hall of Fame
   ================================================================ */

/**
 * Render the Hall of Fame — top 5 all-time goal scorers for the player's club.
 */
function trHallOfFame(settings: Settings, r: Records): string {
  const hof = r.hallOfFame || {};
  const entries = Object.entries(hof).sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (!entries.length) {
    return `<div style="color:var(--text-muted);text-align:center;padding:16px;font-size:.9rem">${t(settings, 'trNoHoF')}</div>`;
  }

  let h = `<table class="hof-table"><thead><tr><th>#</th><th>${t(settings, 'thPlayer')}</th><th>${t(settings, 'thGoals')}</th></tr></thead><tbody>`;
  entries.forEach(([name, goals], i) => {
    const icon = i === 0 ? '&#129351;' : i === 1 ? '&#129352;' : i === 2 ? '&#129353;' : '';
    h += `<tr><td class="hof-rank">${icon || (i + 1)}</td><td>${name}</td><td class="hof-goals">${goals}</td></tr>`;
  });
  h += '</tbody></table>';
  return h;
}

/* ================================================================
   MAIN TROPHY ROOM RENDERER
   ================================================================ */

/**
 * Render the trophy room view into the DOM.
 *
 * @param G              - The current game state
 * @param settings       - User settings (for i18n)
 * @param defaultRecords - Function to create default records if none exist
 */
export function renderTrophyRoom(
  G: GameState,
  settings: Settings,
  defaultRecords: () => Records,
): void {
  const container = document.getElementById('trophyroom-content');
  if (!container) return;

  const pt = G.teams[G.playerTeamId!];
  if (!G.records) G.records = defaultRecords();
  const r = G.records;

  let h = '';

  /* Section A: Trophy Cabinet */
  h += `<div class="trophy-room-section"><div class="section-title">&#127942; ${t(settings, 'trCabinet')}</div>`;
  h += `<div class="record-grid">`;
  h += trRecordCard(settings, t(settings, 'trBestPts'), r.bestPts, r.league.bestPts, false);
  h += trRecordCard(settings, t(settings, 'trBestWins'), r.bestWins, r.league.bestWins, false);
  h += trRecordCard(settings, t(settings, 'trFewestDefeats'), r.fewestDefeats, r.league.fewestDefeats, true);
  h += trRecordCard(settings, t(settings, 'trBestAttack'), r.bestAttack, r.league.bestAttack, false);
  h += trRecordCard(settings, t(settings, 'trBestDefence'), r.bestDefence, r.league.bestDefence, true);
  h += trRecordCard(settings, t(settings, 'trBestGD'), r.bestGD, r.league.bestGD, false);
  h += `</div></div>`;

  /* Section B: Season Records */
  h += `<div class="trophy-room-section"><div class="section-title">&#9917; ${t(settings, 'trSeasonRecords')}</div>`;
  h += `<div class="record-grid">`;
  h += trMatchRecord(settings, t(settings, 'trTopScorerSeason'), r.topScorerSeason, r.league.topScorerSeason, 'scorer');
  h += trMatchRecord(settings, t(settings, 'trBiggestWin'), r.biggestWin, r.league.biggestWin, 'match');
  h += trMatchRecord(settings, t(settings, 'trBiggestDefeat'), r.biggestDefeat, r.league.biggestDefeat, 'match');
  h += trMatchRecord(settings, t(settings, 'trMostGoalsMatch'), r.mostGoalsMatch, r.league.mostGoalsMatch, 'match');
  h += trMatchRecord(settings, t(settings, 'trHighestPower'), r.highestPower, r.league.highestPower, 'power');
  h += `</div></div>`;

  /* Section C: All-Time Stats */
  h += `<div class="trophy-room-section"><div class="section-title">&#128200; ${t(settings, 'trAllTime')}</div>`;
  h += `<div class="milestone-grid">`;
  const s = pt.stats;
  h += trMilestone('&#9917;', s.p, t(settings, 'trTotalPlayed'));
  h += trMilestone('&#9989;', s.w, t(settings, 'trTotalWins'));
  h += trMilestone('&#129309;', s.d, t(settings, 'trTotalDraws'));
  h += trMilestone('&#10060;', s.l, t(settings, 'trTotalLosses'));
  h += trMilestone('&#9918;', s.gf, t(settings, 'trTotalGF'));
  h += trMilestone('&#128737;', s.ga, t(settings, 'trTotalGA'));
  h += trMilestone('&#127775;', s.pts, t(settings, 'trTotalPts'));
  h += trMilestone('&#128200;', s.p > 0 ? (s.w / s.p * 100).toFixed(1) + '%' : '0%', t(settings, 'trWinPct'));
  h += trMilestone('&#127942;', pt.trophies ? pt.trophies.length : 0, t(settings, 'trTotalTrophies'));
  h += `</div></div>`;

  /* Section D: Milestones */
  h += `<div class="trophy-room-section"><div class="section-title">&#127919; ${t(settings, 'trMilestones')}</div>`;
  h += `<div class="milestone-grid">`;
  h += trMilestone('&#128197;', Math.max(0, G.season - 1), t(settings, 'trSeasonsManaged'));
  const divLabel = r.highestDiv <= 4 ? t(settings, 'div') + ' ' + r.highestDiv : '—';
  h += trMilestone('&#11014;', divLabel, t(settings, 'trHighestDiv'));
  h += trMilestone('&#128640;', r.totalPromotions, t(settings, 'trPromotions'));
  h += trMilestone('&#128546;', r.totalRelegations, t(settings, 'trRelegations'));
  h += trMilestone('&#127941;', r.maxConsecutiveDiv1, t(settings, 'trConsecDiv1'));
  h += trMilestone('&#128170;', r.longestUnbeaten, t(settings, 'trUnbeaten'));
  h += trMilestone('&#128293;', r.longestWinStreak, t(settings, 'trWinStreak'));
  h += trMilestone('&#128272;', r.totalCleanSheets, t(settings, 'trCleanSheets'));
  h += `</div></div>`;

  /* Section E: Badges & Hall of Fame */
  h += `<div class="trophy-room-section"><div class="section-title">&#127775; ${t(settings, 'trBadgesHoF')}</div>`;
  h += trBadges(settings, pt, r);
  h += trHallOfFame(settings, r);
  h += `</div>`;

  container.innerHTML = h;
}
