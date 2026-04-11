/**
 * trophy-room.ts — Trophy room view renderer.
 *
 * Renders the complete trophy room with:
 * - Trophy Cabinet (single-season stat records)
 * - Season Records (scorer, match, power records)
 * - All-Time Stats (cumulative career stats)
 * - Milestones (promotions, streaks, clean sheets)
 * - Coach Achievements (21 unlockable achievements)
 * - Badges & Hall of Fame (achievement badges, top scorers)
 */

import type { GameState, Settings, Team, Records, StatRecord, LeagueStatRecord,
  TopScorerRecord, LeagueTopScorerRecord, MatchResultRecord, LeagueMatchResultRecord,
  MostGoalsRecord, LeagueMostGoalsRecord } from '../../types';
import { t } from '../../data/i18n';
import { SEASON_WEEKS } from '../../config';
import { icon } from '../../assets/icons';

/** Icon names supported by the icon library; lets us reference icons by key. */
type IconKey = Parameters<typeof icon>[0];

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
function trMilestone(iconKey: IconKey, value: string | number, label: string): string {
  return `<div class="milestone-card"><div class="ms-icon">${icon(iconKey, 20)}</div><div class="ms-value">${value}</div><div class="ms-label">${label}</div></div>`;
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
    h += `<span class="badge gold"><span class="badge-icon">${icon('shield', 14)}</span> ${t(settings, 'trInvincible')} (S${r.fewestDefeats.season})</span>`;
  } else {
    h += `<span class="badge locked"><span class="badge-icon">${icon('lock', 14)}</span> ${t(settings, 'trInvincible')}</span>`;
  }

  /* Centurion: 100 Wins */
  if (pt.stats.w >= 100) {
    h += `<span class="badge gold"><span class="badge-icon">${icon('target', 14)}</span> ${t(settings, 'trCenturionWins')}</span>`;
  } else {
    h += `<span class="badge locked"><span class="badge-icon">${icon('lock', 14)}</span> ${t(settings, 'trCenturionWins')} (${pt.stats.w}/100)</span>`;
  }

  /* Centurion: 100 Goals */
  if (pt.stats.gf >= 100) {
    h += `<span class="badge gold"><span class="badge-icon">${icon('target', 14)}</span> ${t(settings, 'trCenturionGoals')}</span>`;
  } else {
    h += `<span class="badge locked"><span class="badge-icon">${icon('lock', 14)}</span> ${t(settings, 'trCenturionGoals')} (${pt.stats.gf}/100)</span>`;
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
    const medalCls = i === 0 ? 'medal-gold' : i === 1 ? 'medal-silver' : i === 2 ? 'medal-bronze' : '';
    const rankCell = i < 3
      ? `<span class="hof-medal ${medalCls}">${icon('medal', 16)}</span>`
      : String(i + 1);
    h += `<tr><td class="hof-rank">${rankCell}</td><td>${name}</td><td class="hof-goals">${goals}</td></tr>`;
  });
  h += '</tbody></table>';
  return h;
}

/* ================================================================
   COACH ACHIEVEMENTS — 21 unlockable achievements
   ================================================================ */

/** Achievement definition: id, icon key, i18n key, and check function */
interface CoachAchievement {
  id: string;
  iconKey: IconKey;
  labelKey: string;
  descKey: string;
  check: (G: GameState, pt: Team, r: Records) => boolean;
  progress?: (G: GameState, pt: Team, r: Records) => string;
}

/**
 * All 21 coach achievements.
 * Each is computed dynamically from existing game state — no new
 * fields required in GameState or Records.
 */
const COACH_ACHIEVEMENTS: readonly CoachAchievement[] = [
  /* 1. First Victory -- Win your first match */
  {
    id: 'firstVictory',
    iconKey: 'check',
    labelKey: 'achFirstVictory',
    descKey: 'achFirstVictoryDesc',
    check: (_G, pt) => pt.stats.w >= 1,
  },
  /* 2. First Trophy -- Win any trophy */
  {
    id: 'firstTrophy',
    iconKey: 'trophy',
    labelKey: 'achFirstTrophy',
    descKey: 'achFirstTrophyDesc',
    check: (_G, pt) => (pt.trophies?.length ?? 0) >= 1,
  },
  /* 3. Top of the World -- Reach Division 1 */
  {
    id: 'topOfWorld',
    iconKey: 'globe',
    labelKey: 'achTopOfWorld',
    descKey: 'achTopOfWorldDesc',
    check: (_G, _pt, r) => r.highestDiv === 1,
  },
  /* 4. League Champion -- Win the Division 1 title */
  {
    id: 'leagueChampion',
    iconKey: 'trophy',
    labelKey: 'achLeagueChampion',
    descKey: 'achLeagueChampionDesc',
    check: (_G, pt) => (pt.trophies ?? []).some(tr => tr.type === 'gold_trophy'),
  },
  /* 5. Invincible Season -- Complete a season with 0 losses */
  {
    id: 'invincible',
    iconKey: 'shield',
    labelKey: 'achInvincible',
    descKey: 'achInvincibleDesc',
    check: (_G, _pt, r) => r.fewestDefeats.value === 0 && r.fewestDefeats.season > 0,
  },
  /* 8. Perfect Season -- Win all league matches in a season */
  {
    id: 'perfectSeason',
    iconKey: 'target',
    labelKey: 'achPerfectSeason',
    descKey: 'achPerfectSeasonDesc',
    check: (_G, _pt, r) => r.bestWins.value >= SEASON_WEEKS && r.bestWins.season > 0,
  },
  /* 9. Promotion Master -- Achieve 3 promotions */
  {
    id: 'promotionMaster',
    iconKey: 'arrowUp',
    labelKey: 'achPromotionMaster',
    descKey: 'achPromotionMasterDesc',
    check: (_G, _pt, r) => r.totalPromotions >= 3,
    progress: (_G, _pt, r) => `${Math.min(r.totalPromotions, 3)}/3`,
  },
  /* 10. Comeback Kid -- Get promoted after being relegated */
  {
    id: 'comebackKid',
    iconKey: 'refresh',
    labelKey: 'achComebackKid',
    descKey: 'achComebackKidDesc',
    check: (_G, _pt, r) => r.totalRelegations >= 1 && r.totalPromotions >= 1,
  },
  /* 11. Dynasty Builder -- 5 consecutive seasons in Division 1 */
  {
    id: 'dynastyBuilder',
    iconKey: 'stadium',
    labelKey: 'achDynastyBuilder',
    descKey: 'achDynastyBuilderDesc',
    check: (_G, _pt, r) => r.maxConsecutiveDiv1 >= 5,
    progress: (_G, _pt, r) => `${Math.min(r.maxConsecutiveDiv1, 5)}/5`,
  },
  /* 12. Centurion Wins -- 100 career wins */
  {
    id: 'centurionWins',
    iconKey: 'dumbbell',
    labelKey: 'achCenturionWins',
    descKey: 'achCenturionWinsDesc',
    check: (_G, pt) => pt.stats.w >= 100,
    progress: (_G, pt) => `${Math.min(pt.stats.w, 100)}/100`,
  },
  /* 13. Centurion Goals -- 100 career goals scored */
  {
    id: 'centurionGoals',
    iconKey: 'ball',
    labelKey: 'achCenturionGoals',
    descKey: 'achCenturionGoalsDesc',
    check: (_G, pt) => pt.stats.gf >= 100,
    progress: (_G, pt) => `${Math.min(pt.stats.gf, 100)}/100`,
  },
  /* 14. Goal Machine -- 500 career goals scored */
  {
    id: 'goalMachine',
    iconKey: 'fire',
    labelKey: 'achGoalMachine',
    descKey: 'achGoalMachineDesc',
    check: (_G, pt) => pt.stats.gf >= 500,
    progress: (_G, pt) => `${Math.min(pt.stats.gf, 500)}/500`,
  },
  /* 15. Win Streak -- 10-match winning streak */
  {
    id: 'winStreak10',
    iconKey: 'bolt',
    labelKey: 'achWinStreak10',
    descKey: 'achWinStreak10Desc',
    check: (_G, _pt, r) => r.longestWinStreak >= 10,
    progress: (_G, _pt, r) => `${Math.min(r.longestWinStreak, 10)}/10`,
  },
  /* 16. Unbeaten Run -- 20-match unbeaten streak */
  {
    id: 'unbeatenRun',
    iconKey: 'shield',
    labelKey: 'achUnbeatenRun',
    descKey: 'achUnbeatenRunDesc',
    check: (_G, _pt, r) => r.longestUnbeaten >= 20,
    progress: (_G, _pt, r) => `${Math.min(r.longestUnbeaten, 20)}/20`,
  },
  /* 17. Clean Sheet King -- 50 career clean sheets */
  {
    id: 'cleanSheetKing',
    iconKey: 'medal',
    labelKey: 'achCleanSheetKing',
    descKey: 'achCleanSheetKingDesc',
    check: (_G, _pt, r) => r.totalCleanSheets >= 50,
    progress: (_G, _pt, r) => `${Math.min(r.totalCleanSheets, 50)}/50`,
  },
  /* 18. Fortress -- Concede 5 or fewer goals in a season */
  {
    id: 'fortress',
    iconKey: 'shield',
    labelKey: 'achFortress',
    descKey: 'achFortressDesc',
    check: (_G, _pt, r) => r.bestDefence.value <= 5 && r.bestDefence.season > 0,
  },
  /* 19. Marathon Manager -- Manage 10 seasons */
  {
    id: 'marathonManager',
    iconKey: 'calendar',
    labelKey: 'achMarathonManager',
    descKey: 'achMarathonManagerDesc',
    check: (G) => G.season > 10,
    progress: (G) => `${Math.min(G.season - 1, 10)}/10`,
  },
  /* 20. Veteran Manager -- Manage 20 seasons */
  {
    id: 'veteranManager',
    iconKey: 'clipboard',
    labelKey: 'achVeteranManager',
    descKey: 'achVeteranManagerDesc',
    check: (G) => G.season > 20,
    progress: (G) => `${Math.min(G.season - 1, 20)}/20`,
  },
  /* 21. Hall of Fame Legend -- Have a player score 50+ career goals */
  {
    id: 'hofLegend',
    iconKey: 'star',
    labelKey: 'achHoFLegend',
    descKey: 'achHoFLegendDesc',
    check: (_G, _pt, r) => {
      const hof = r.hallOfFame || {};
      return Object.values(hof).some(goals => goals >= 50);
    },
    progress: (_G, _pt, r) => {
      const hof = r.hallOfFame || {};
      const best = Math.max(0, ...Object.values(hof));
      return `${Math.min(best, 50)}/50`;
    },
  },
];

/**
 * Render the Coach Achievements section — 21 unlockable achievements
 * displayed as a grid of cards with unlocked/locked state.
 */
function trCoachAchievements(settings: Settings, G: GameState, pt: Team, r: Records): string {
  const unlocked = COACH_ACHIEVEMENTS.filter(a => a.check(G, pt, r)).length;
  let h = `<div class="trophy-room-section">`;
  h += `<div class="section-title"><span class="section-icon">${icon('trophy', 18)}</span> ${t(settings, 'trCoachAchievements')}</div>`;
  h += `<div class="achievement-summary">${t(settings, 'trAchProgress', { unlocked: String(unlocked), total: String(COACH_ACHIEVEMENTS.length) })}</div>`;
  h += `<div class="achievement-grid">`;

  for (const ach of COACH_ACHIEVEMENTS) {
    const isUnlocked = ach.check(G, pt, r);
    const cls = isUnlocked ? 'achievement-card unlocked' : 'achievement-card locked';
    const iconHtml = isUnlocked ? icon(ach.iconKey, 28) : icon('lock', 28);

    h += `<div class="${cls}">`;
    h += `<div class="ach-icon">${iconHtml}</div>`;
    h += `<div class="ach-info">`;
    h += `<div class="ach-name">${t(settings, ach.labelKey)}</div>`;
    h += `<div class="ach-desc">${t(settings, ach.descKey)}</div>`;
    if (!isUnlocked && ach.progress) {
      h += `<div class="ach-progress">${ach.progress(G, pt, r)}</div>`;
    }
    h += `</div></div>`;
  }

  h += `</div></div>`;
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
  h += `<div class="trophy-room-section"><div class="section-title"><span class="section-icon">${icon('trophy', 18)}</span> ${t(settings, 'trCabinet')}</div>`;
  h += `<div class="record-grid">`;
  h += trRecordCard(settings, t(settings, 'trBestPts'), r.bestPts, r.league.bestPts, false);
  h += trRecordCard(settings, t(settings, 'trBestWins'), r.bestWins, r.league.bestWins, false);
  h += trRecordCard(settings, t(settings, 'trFewestDefeats'), r.fewestDefeats, r.league.fewestDefeats, true);
  h += trRecordCard(settings, t(settings, 'trBestAttack'), r.bestAttack, r.league.bestAttack, false);
  h += trRecordCard(settings, t(settings, 'trBestDefence'), r.bestDefence, r.league.bestDefence, true);
  h += trRecordCard(settings, t(settings, 'trBestGD'), r.bestGD, r.league.bestGD, false);
  h += `</div></div>`;

  /* Section B: Season Records */
  h += `<div class="trophy-room-section"><div class="section-title"><span class="section-icon">${icon('ball', 18)}</span> ${t(settings, 'trSeasonRecords')}</div>`;
  h += `<div class="record-grid">`;
  h += trMatchRecord(settings, t(settings, 'trTopScorerSeason'), r.topScorerSeason, r.league.topScorerSeason, 'scorer');
  h += trMatchRecord(settings, t(settings, 'trBiggestWin'), r.biggestWin, r.league.biggestWin, 'match');
  h += trMatchRecord(settings, t(settings, 'trBiggestDefeat'), r.biggestDefeat, r.league.biggestDefeat, 'match');
  h += trMatchRecord(settings, t(settings, 'trMostGoalsMatch'), r.mostGoalsMatch, r.league.mostGoalsMatch, 'match');
  h += trMatchRecord(settings, t(settings, 'trHighestPower'), r.highestPower, r.league.highestPower, 'power');
  h += `</div></div>`;

  /* Section C: All-Time Stats */
  h += `<div class="trophy-room-section"><div class="section-title"><span class="section-icon">${icon('chartUp', 18)}</span> ${t(settings, 'trAllTime')}</div>`;
  h += `<div class="milestone-grid">`;
  const s = pt.stats;
  h += trMilestone('ball', s.p, t(settings, 'trTotalPlayed'));
  h += trMilestone('check', s.w, t(settings, 'trTotalWins'));
  h += trMilestone('handshake', s.d, t(settings, 'trTotalDraws'));
  h += trMilestone('close', s.l, t(settings, 'trTotalLosses'));
  h += trMilestone('arrowUp', s.gf, t(settings, 'trTotalGF'));
  h += trMilestone('shield', s.ga, t(settings, 'trTotalGA'));
  h += trMilestone('star', s.pts, t(settings, 'trTotalPts'));
  h += trMilestone('chartUp', s.p > 0 ? (s.w / s.p * 100).toFixed(1) + '%' : '0%', t(settings, 'trWinPct'));
  h += trMilestone('trophy', pt.trophies ? pt.trophies.length : 0, t(settings, 'trTotalTrophies'));
  h += `</div></div>`;

  /* Section D: Milestones */
  h += `<div class="trophy-room-section"><div class="section-title"><span class="section-icon">${icon('target', 18)}</span> ${t(settings, 'trMilestones')}</div>`;
  h += `<div class="milestone-grid">`;
  h += trMilestone('calendar', Math.max(0, G.season - 1), t(settings, 'trSeasonsManaged'));
  const divLabel = r.highestDiv <= 4 ? t(settings, 'div') + ' ' + r.highestDiv : '—';
  h += trMilestone('arrowUp', divLabel, t(settings, 'trHighestDiv'));
  h += trMilestone('arrowUp', r.totalPromotions, t(settings, 'trPromotions'));
  h += trMilestone('arrowDown', r.totalRelegations, t(settings, 'trRelegations'));
  h += trMilestone('stadium', r.maxConsecutiveDiv1, t(settings, 'trConsecDiv1'));
  h += trMilestone('shield', r.longestUnbeaten, t(settings, 'trUnbeaten'));
  h += trMilestone('fire', r.longestWinStreak, t(settings, 'trWinStreak'));
  h += trMilestone('lock', r.totalCleanSheets, t(settings, 'trCleanSheets'));
  h += `</div></div>`;

  /* Section E: Coach Achievements */
  h += trCoachAchievements(settings, G, pt, r);

  /* Section F: Badges & Hall of Fame */
  h += `<div class="trophy-room-section"><div class="section-title"><span class="section-icon">${icon('star', 18)}</span> ${t(settings, 'trBadgesHoF')}</div>`;
  h += trBadges(settings, pt, r);
  h += trHallOfFame(settings, r);
  h += `</div>`;

  container.innerHTML = h;
}
