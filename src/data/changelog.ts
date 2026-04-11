/**
 * Game version constant and changelog data.
 *
 * Each entry records a version bump with its release date, a short title,
 * and a list of user-facing changes.  The UI renders these in the
 * changelog overlay accessible from Settings.
 */

import type { ChangelogEntry } from '../types';

/** Current game version string displayed in the footer and settings. */
export const GAME_VERSION = "0.90";

/** Full changelog, newest version first. */
export const CHANGELOG: readonly ChangelogEntry[] = [
  {
    version: "0.90",
    date: "2026-03-31",
    title: "Balance Patch — Fairer Progression",
    changes: [
      "AI teams now train weekly (at 60% of human rate) — no more compounding skill gap",
      "Youth academy bonus reduced from +2 to +1 skill per level (max +3 instead of +6)",
      "Youth development curve scaled: ages 16-20 now 35% chance / +2 max (was 50% / +3)",
      "Bench stamina recovery reduced from +20 to +12 per week — rotation requires more thought",
      "Training facility bonus reduced from +3% to +2% per level",
      "Game guide updated to reflect all balance changes",
    ],
  },
  {
    version: "0.89",
    date: "2026-03-31",
    title: "Complete Game Guide & Tactical Depth",
    changes: [
      "Comprehensive How to Play guide — 18 sections covering every game mechanic",
      "Formation-tactic synergy — pair formation with tactic for up to +15% boost (or -22% penalty!)",
      "Tactic counter system — rock-paper-scissors matchups (Counter beats Attack +15%, etc.)",
      "Positional power matchups — STR vs DEF and midfield control affect expected goals",
      "Smarter auto-pick — stamina-weighted rating, OOP penalties, form, and freshness bonus",
      "AI teams no longer field exhausted players (stamina threshold 30% → 60%)",
      "New guide sections: Morale, Derby Matches, Pressure, On Fire, Player Roles, Squad Rules, Facilities, Trophy Room, Difficulty, and more",
    ],
  },
  {
    version: "0.87",
    date: "2026-03-25",
    title: "Park the Bus — Rebrand & Stadium Nights UI",
    changes: [
      "Rebranded to Park the Bus — Football Manager",
      "New 'Stadium Nights' color scheme — pitch green + warm amber palette",
      "Version reset to 0.87 for the new era",
    ],
  },
  {
    version: "4.0.0",
    date: "2026-03-24",
    title: "Dynamic Leagues, Cup Removal & Translation Polish",
    changes: [
      "Dynamic Team Pool — 97 teams now available; 32 are randomly selected and assigned to divisions each new game for a unique experience every playthrough",
      "Cup System Removed — knockout cup competition removed to streamline gameplay around the league season",
      "Dashboard Fix — season recap now renders correctly inline on the dashboard instead of showing a blank screen",
      "Translation Improvements — 40+ new Portuguese and Spanish translation keys covering dashboard, match, recap, club, and scout views",
      "Expanded Name Pools — 60 first and 60 last names per country (up from 30) with more authentic common names",
      "Waiting Pool Expanded — 12 reserve teams ready to rotate into the league across seasons",
    ],
  },
  {
    version: "3.1.1",
    date: "2026-03-24",
    title: "Season Recap Gate & Match Flow Polish",
    changes: [
      "Season Recap Gate \u2014 end-of-year awards, stats, and promotion/relegation now render inline on the dashboard as a mandatory step before starting the next season",
      "Match Transition Fix \u2014 dashboard now shows correct week, last result, and next fixture immediately after a match",
      "Faster Post-Match \u2014 full-time countdown reduced to 15 seconds for quicker progression",
      "Smart Play Button \u2014 greyed out with contextual messages (select squad, assign GK, unavailable starters, match in progress)",
      "Live Budget Updates \u2014 top bar budget and club view now refresh instantly after facility upgrades and sponsor changes",
      "Stadium Rework \u2014 lower upgrade costs, new per-home-game income ($150/level) plus end-of-season bonus ($500/level) for ~3 season ROI",
    ],
  },
  {
    version: "3.0.0",
    date: "2026-03-19",
    title: "Major Feature Update — 18 Game Improvements",
    changes: [
      "21 Coach Achievements \u2014 unlockable milestones with progress tracking",
      "Dynamic AI Tactics \u2014 AI teams now choose tactics based on strength, form, and league position",
      "Team Morale System \u2014 morale rises/falls with results, affects team strength by \u00b15%",
      "Player Roles \u2014 6 specializations (Playmaker, Target Man, etc.) with tactic synergy bonuses",
      "Stadium Facilities \u2014 3 upgradable buildings: Training, Youth Academy, Stadium",
      "Sponsorship Deals \u2014 4 sponsor tiers with division requirements",
      "Loan System \u2014 borrow players from higher-division teams for one season",
      "Red Card Match Impact \u2014 red cards now weaken the team for the remainder of the match",
      "Pre-Match Scouting \u2014 opponent form, formation, key player shown before each match",
      "Rivals & Derbies \u2014 10 rival pairs with double form changes and morale bonuses",
      "Season Awards Ceremony \u2014 Golden Boot, Player of the Season, Best Young Player",
      "Youth Academy Pipeline \u2014 1-2 prospects generated each season",
      "Transfer Negotiation \u2014 multi-round haggling with AI counter-offers",
      "Scout Network \u2014 3 levels filtering visible transfer targets",
      "Full i18n \u2014 all new features translated to English, Portuguese, and Spanish",
    ],
  },
  {
    version: "2.1.0",
    date: "2026-02-27",
    title: "Elifoot-Style Visuals & Market Expansion",
    changes: [
      "Elifoot-style team name plates \u2014 every team name now uses its club colors (background + text) across the entire game",
      "Upgraded live rival results \u2014 matches display with colored team name plates for much clearer visual identity",
      "Expanded transfer market \u2014 16 free agents available each season (up from 12)",
      "Removed Youth Academy mechanic",
    ],
  },
  {
    version: "2.0.0",
    date: "2026-02-26",
    title: "Major Feature Update",
    changes: [
      "Cup Competition \u2014 32-team knockout tournament alongside the league (5 rounds: R32 \u2192 Final)",
      "Substitutions \u2014 Make up to 3 subs during animated matches, recalculating team strength",
      "Match Tactics \u2014 Attack, Balanced, Defensive, Counter-Attack with real gameplay effects",
      "Mid-Match Tactical Adjustments \u2014 Change tactics and formation during animated matches",
      "Player Form \u2014 Hot/cold streaks affect player OVR by \u00b15% per form point",
      "Red Cards & Suspensions \u2014 Yellow card accumulation (5=ban) and red card 2-match bans",
      "Training System \u2014 Weekly training with 5 focus options boosting player skills",
      "Player Stats \u2014 Career and seasonal stats tracking, click any player name for profile",
      "Live Rival Results \u2014 Watch other matches unfold during your animated match",
      "Sound Effects \u2014 Synthesized audio for goals, whistles, cards, and more (volume control in settings)",
      "How to Play \u2014 Comprehensive instructions accessible from settings and welcome screen",
      "Player lifecycle explained in instructions (retirement at 38, auto-replacement)",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-02-26",
    title: "Squad Selection Redesign & QoL",
    changes: [
      "Squad selection redesigned: cards replaced with a clean 5-column list layout",
      "Inline position dropdowns replace drag-and-drop for assigning roles",
      "Position group headers (GK / DEF / MID / STR) when sorted by position",
      "Two-line player info cell: name + Age \u00b7 Stamina \u00b7 OVR on second line",
      "Zebra striping and improved selected / unselected visual hierarchy",
      "Mobile-responsive squad list (4 columns at 640px and below)",
      "Maximum squad size increased from 24 to 25 players",
      "Jokes are now randomized instead of cycling in order",
      "Added 150 new jokes about winning and losing",
      "Added changelog accessible from Settings",
      "Version number displayed in footer",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-02-01",
    title: "Initial Release",
    changes: [
      "4-division league system with promotion and relegation",
      "20 international teams per division with real country flags",
      "Full season simulation with week-by-week match engine",
      "Squad management with formation selection and player roles",
      "Transfer market with free agents and contract system",
      "Financial system: budgets, wages, prize money, solidarity payments",
      "Player attributes: skill, stamina, age, morale, and injury system",
      "Manager naming and team selection at game start",
      "Dark and light theme support",
      "English, Portuguese, and Spanish language support",
      "Team strength display options (hidden / AVG / power)",
      "Season-end summary with awards and promotions",
      "Head-to-head stats and team profile pages",
      "Dad jokes in the news panel",
    ],
  },
] as const;
