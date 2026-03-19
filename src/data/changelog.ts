/**
 * Game version constant and changelog data.
 *
 * Each entry records a version bump with its release date, a short title,
 * and a list of user-facing changes.  The UI renders these in the
 * changelog overlay accessible from Settings.
 */

import type { ChangelogEntry } from '../types';

/** Current game version string displayed in the footer and settings. */
export const GAME_VERSION = "3.0.0";

/** Full changelog, newest version first. */
export const CHANGELOG: readonly ChangelogEntry[] = [
  {
    version: "3.0.0",
    date: "2026-03-19",
    title: "Major Feature Update — 18 Game Improvements",
    changes: [
      "\ud83c\udfc5 21 Coach Achievements \u2014 unlockable milestones with progress tracking",
      "\u2694\ufe0f Dynamic AI Tactics \u2014 AI teams now choose tactics based on strength, form, and league position",
      "\ud83d\udcca Team Morale System \u2014 morale rises/falls with results, affects team strength by \u00b15%",
      "\ud83c\udfad Player Roles \u2014 6 specializations (Playmaker, Target Man, etc.) with tactic synergy bonuses",
      "\ud83c\udfe2 Stadium Facilities \u2014 3 upgradable buildings: Training, Youth Academy, Stadium",
      "\ud83d\udcb0 Sponsorship Deals \u2014 4 sponsor tiers with division requirements",
      "\ud83e\udd1d Loan System \u2014 borrow players from higher-division teams for one season",
      "\ud83d\udd34 Red Card Match Impact \u2014 red cards now weaken the team for the remainder of the match",
      "\ud83d\udd0d Pre-Match Scouting \u2014 opponent form, formation, key player shown before each match",
      "\ud83c\udfc6 Rivals & Derbies \u2014 10 rival pairs with double form changes and morale bonuses",
      "\ud83c\udf1f Season Awards Ceremony \u2014 Golden Boot, Player of the Season, Best Young Player",
      "\ud83e\uddd1 Youth Academy Pipeline \u2014 1-2 prospects generated each season",
      "\ud83d\udcdd Transfer Negotiation \u2014 multi-round haggling with AI counter-offers",
      "\ud83d\udd2d Scout Network \u2014 3 levels filtering visible transfer targets",
      "\ud83c\udf0d Full i18n \u2014 all new features translated to English, Portuguese, and Spanish",
    ],
  },
  {
    version: "2.1.0",
    date: "2026-02-27",
    title: "Elifoot-Style Visuals & Market Expansion",
    changes: [
      "\ud83c\udfa8 Elifoot-style team name plates \u2014 every team name now uses its club colors (background + text) across the entire game",
      "\ud83d\udce1 Upgraded live rival results \u2014 matches display with colored team name plates for much clearer visual identity",
      "\ud83d\udcb0 Expanded transfer market \u2014 16 free agents available each season (up from 12)",
      "\ud83d\uddd1\ufe0f Removed Youth Academy mechanic",
    ],
  },
  {
    version: "2.0.0",
    date: "2026-02-26",
    title: "Major Feature Update",
    changes: [
      "\ud83c\udfc6 Cup Competition \u2014 32-team knockout tournament alongside the league (5 rounds: R32 \u2192 Final)",
      "\u26bd Substitutions \u2014 Make up to 3 subs during animated matches, recalculating team strength",
      "\u2694\ufe0f Match Tactics \u2014 Attack, Balanced, Defensive, Counter-Attack with real gameplay effects",
      "\ud83c\udfaf Mid-Match Tactical Adjustments \u2014 Change tactics and formation during animated matches",
      "\ud83d\udcc8 Player Form \u2014 Hot/cold streaks affect player OVR by \u00b15% per form point",
      "\ud83d\udfe8 Red Cards & Suspensions \u2014 Yellow card accumulation (5=ban) and red card 2-match bans",
      "\ud83c\udfcb\ufe0f Training System \u2014 Weekly training with 5 focus options boosting player skills",
      "\ud83d\udcca Player Stats \u2014 Career and seasonal stats tracking, click any player name for profile",
      "\ud83d\udce1 Live Rival Results \u2014 Watch other matches unfold during your animated match",
      "\ud83d\udd0a Sound Effects \u2014 Synthesized audio for goals, whistles, cards, and more (volume control in settings)",
      "\ud83d\udcd6 How to Play \u2014 Comprehensive instructions accessible from settings and welcome screen",
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
