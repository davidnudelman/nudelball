/**
 * help.ts -- "How to Play" overlay renderer.
 *
 * Builds an accordion-style help overlay with collapsible sections
 * covering all game mechanics: getting started, squad management,
 * formations, tactics, match day, training, transfers, facilities,
 * player lifecycle, form, morale, and more.
 *
 * The first section is opened by default on render.
 */

import type { Settings } from '../../types';

/* ================================================================
   TOGGLE
   ================================================================ */

/**
 * Toggle the help overlay visibility.
 *
 * When opening, calls `renderHelp()` to populate the accordion content.
 *
 * @param settings - User settings (passed to renderHelp for potential i18n)
 */
export function toggleHelp(settings: Settings): void {
  const overlay = document.getElementById('help-overlay');
  if (!overlay) return;

  const visible = overlay.style.display === 'flex';
  overlay.style.display = visible ? 'none' : 'flex';
  if (!visible) renderHelp(settings);
}

/* ================================================================
   RENDER
   ================================================================ */

/**
 * Help section definition.
 */
interface HelpSection {
  /** Section title (shown in the accordion header) */
  title: string;
  /** Section body HTML content */
  content: string;
}

/**
 * Render the help overlay content with accordion sections.
 *
 * Each section is a collapsible panel. Clicking the section title
 * toggles it open/closed via the CSS class `.open`. The first
 * section is opened by default.
 *
 * @param _settings - User settings (reserved for future i18n, currently unused)
 */
export function renderHelp(_settings: Settings): void {
  const body = document.getElementById('help-body');
  if (!body) return;

  const sections: HelpSection[] = [
    {
      title: '\uD83C\uDFAE Getting Started',
      content: `
        <p>Welcome to <b>Park the Bus</b>! Pick a team, name your manager, and enter the dugout.</p>
        <p>Your goal is to climb through <b>4 divisions</b> to become the ultimate champion. Manage your squad, set tactics, buy and sell players, and lead your team to glory!</p>
        <p><b>Difficulty</b> affects AI strength, your budget, and training effectiveness:</p>
        <ul>
          <li><b>Easy</b> \u2014 AI teams 10% weaker, 50% more budget, 30% faster training</li>
          <li><b>Normal</b> \u2014 Standard settings</li>
          <li><b>Hard</b> \u2014 AI teams 10% stronger, 25% less budget, 20% slower training</li>
        </ul>
      `,
    },
    {
      title: '\uD83D\uDCCA Dashboard',
      content: `
        <p>The dashboard shows your upcoming match, last result, league standing, and any team news (injuries, suspensions, transfers).</p>
        <p>At the end of each season, review the <b>Season Recap</b> showing awards (Golden Boot, best defence, etc.), final standings, and promotion/relegation before starting the next season.</p>
      `,
    },
    {
      title: '\uD83D\uDC65 Squad Management',
      content: `
        <p>Select 11 players from your squad. Assign each a <b>formation role</b> using the dropdown. Every squad must have exactly 1 GK.</p>
        <p><b>Stamina</b> drains each match (8\u201315%). Players below 50% risk losing skill. Bench players recover 20% per week, so rotate your squad!</p>
        <p><b>Fresh players</b> (\u26A1) have been benched 3+ matches and get a <b>+10% OVR boost</b> when selected.</p>
        <p><b>Injured</b> (\u2720) and <b>suspended</b> (\uD83D\uDEAB) players cannot be selected until they recover.</p>
        <p><b>Auto-Pick</b> selects the best 11 for your formation using stamina-weighted skill, form, OOP fit, and freshness. Players below 60% stamina are excluded when possible.</p>
      `,
    },
    {
      title: '\u2699\uFE0F Squad Rules (Auto-Rotation)',
      content: `
        <p>Automate squad rotation with rules on the Squad page:</p>
        <ul>
          <li><b>Rest Tired</b> \u2014 Automatically bench players below 60% stamina before each match and fill gaps with the best available subs.</li>
          <li><b>Best XI</b> \u2014 Auto-pick the highest-rated available 11 each week.</li>
        </ul>
        <p>Manual overrides always take priority \u2014 you can still adjust after rules apply.</p>
      `,
    },
    {
      title: '\uD83E\uDDD1\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1 Player Roles',
      content: `
        <p>Each player can have a <b>role</b> that provides a synergy bonus when paired with the right tactic:</p>
        <table class="help-shortcuts-table" style="font-size:.82rem;margin:8px 0">
          <thead><tr><th>Role</th><th>Positions</th><th>Best Tactic</th><th>Bonus</th></tr></thead>
          <tbody>
            <tr><td>Target Man</td><td>STR</td><td>\u2694\uFE0F Attack</td><td>+5%</td></tr>
            <tr><td>Speedster</td><td>STR</td><td>\uD83C\uDFF9 Counter</td><td>+5%</td></tr>
            <tr><td>Ball Winner</td><td>DEF, MID</td><td>\uD83D\uDEE1\uFE0F Defensive</td><td>+4%</td></tr>
            <tr><td>Playmaker</td><td>MID</td><td>\u2696\uFE0F Balanced</td><td>+3%</td></tr>
            <tr><td>Creator</td><td>MID, STR</td><td>\u2694\uFE0F Attack</td><td>+3%</td></tr>
            <tr><td>Anchor</td><td>DEF, GK</td><td>\uD83D\uDEE1\uFE0F Defensive</td><td>+3%</td></tr>
          </tbody>
        </table>
        <p>Synergy bonuses stack \u2014 fill your squad with roles that match your tactic for maximum impact!</p>
      `,
    },
    {
      title: '\u26BD Formations & Tactics',
      content: `
        <p><b>Formations</b> determine how many players play in each position (DEF/MID/STR). Assigning a player out of position (OOP) gives a <b>-10% penalty</b>:</p>
        <ul>
          <li>DEF \u2192 MID or MID \u2192 STR: -10% (1 step)</li>
          <li>DEF \u2192 STR or STR \u2192 DEF: cannot play (2 steps)</li>
          <li>GK is locked \u2014 cannot play outfield</li>
        </ul>
        <p><b>Formations directly affect match results</b> in two ways:</p>
        <ul>
          <li><b>Positional power:</b> Your STR power vs their DEF (and vice versa) nudges expected goals. Midfield control also matters \u2014 dominating midfield gives a small edge.</li>
          <li><b>Formation-tactic synergy:</b> Pairing the right formation with the right tactic amplifies its effect. Mismatches weaken it.</li>
        </ul>
        <table class="help-shortcuts-table" style="font-size:.82rem;margin:8px 0">
          <thead><tr><th>Formation</th><th>Best With</th><th>Worst With</th></tr></thead>
          <tbody>
            <tr><td>3-3-4, 3-4-3</td><td>\u2694\uFE0F Attack (+12%)</td><td>\uD83D\uDEE1\uFE0F Defensive (-20%)</td></tr>
            <tr><td>4-4-2</td><td>\u2696\uFE0F Balanced (+8%)</td><td>\u2014 (versatile)</td></tr>
            <tr><td>3-5-2</td><td>\u2696\uFE0F Balanced (+5%)</td><td>\uD83D\uDEE1\uFE0F Defensive (-8%)</td></tr>
            <tr><td>4-3-3</td><td>\u2694\uFE0F Attack (+5%)</td><td>\uD83D\uDEE1\uFE0F Defensive (-10%)</td></tr>
            <tr><td>4-5-1</td><td>\uD83D\uDEE1\uFE0F Defensive (+8%)</td><td>\u2694\uFE0F Attack (-12%)</td></tr>
            <tr><td>5-3-2</td><td>\uD83D\uDEE1\uFE0F Defensive (+12%)</td><td>\u2694\uFE0F Attack (-18%)</td></tr>
            <tr><td>5-4-1</td><td>\uD83D\uDEE1\uFE0F Defensive (+15%)</td><td>\u2694\uFE0F Attack (-22%)</td></tr>
          </tbody>
        </table>
        <p><b>Tactics</b> affect how many goals you score and concede:</p>
        <ul>
          <li><b>\u2694\uFE0F All-Out Attack</b> \u2014 More goals scored AND conceded. High-risk, high-reward.</li>
          <li><b>\u2696\uFE0F Balanced</b> \u2014 Neutral modifiers. The default starting tactic.</li>
          <li><b>\uD83D\uDEE1\uFE0F Defensive</b> \u2014 Fewer goals all around. Good for protecting a lead.</li>
          <li><b>\uD83C\uDFF9 Counter-Attack</b> \u2014 Moderate balance. Good against stronger teams \u2014 concede less while still creating chances.</li>
        </ul>
        <p><b>Tactic matchups matter!</b> Tactics have rock-paper-scissors dynamics \u2014 picking the right one against your opponent's tactic gives a significant edge:</p>
        <table class="help-shortcuts-table" style="font-size:.82rem;margin:8px 0">
          <thead><tr><th>Your Tactic</th><th>Strong Against</th><th>Bonus</th><th>Weak Against</th><th>Penalty</th></tr></thead>
          <tbody>
            <tr><td>\uD83C\uDFF9 Counter</td><td>\u2694\uFE0F Attack</td><td>+15%</td><td>\uD83D\uDEE1\uFE0F Defensive</td><td>-12%</td></tr>
            <tr><td>\u2694\uFE0F Attack</td><td>\u2696\uFE0F Balanced</td><td>+12%</td><td>\uD83D\uDEE1\uFE0F Defensive</td><td>-12%</td></tr>
            <tr><td>\u2696\uFE0F Balanced</td><td>\uD83D\uDEE1\uFE0F Defensive</td><td>+10%</td><td>\u2694\uFE0F Attack</td><td>-10%</td></tr>
            <tr><td>\uD83D\uDEE1\uFE0F Defensive</td><td>\uD83C\uDFF9 Counter</td><td>+10%</td><td>\u2696\uFE0F Balanced</td><td>\u2014</td></tr>
          </tbody>
        </table>
        <p><b>Tip:</b> Watch your opponent's tactic during animated matches and switch mid-game to counter them!</p>
      `,
    },
    {
      title: '\uD83C\uDFDF\uFE0F Match Day',
      content: `
        <p>Matches can be played in <b>instant</b> mode (immediate result) or <b>animated</b> mode (minute-by-minute with events).</p>
        <p>During animated matches you can:</p>
        <ul>
          <li><b>Make substitutions</b> \u2014 Up to 3 per match. Click SUB next to a bench player, then pick which starter to replace. Subbed-in players get a +10% effectiveness boost.</li>
          <li><b>Change tactics</b> \u2014 Switch between Attack/Balanced/Defensive/Counter at any time to counter your opponent.</li>
          <li><b>Watch rival results</b> \u2014 See how other teams in your division are doing in real-time.</li>
        </ul>
        <p><b>Yellow cards</b> (\uD83D\uDFE8) accumulate \u2014 5 yellows = 1-match suspension. <b>Red cards</b> (\uD83D\uDFE5) give the opponent extra goal chances for the rest of the match, plus a 2-match ban for the offender.</p>
        <p><b>Man of the Match</b> is awarded based on goals scored and skill rating.</p>
      `,
    },
    {
      title: '\uD83D\uDCC8 Player Form & On Fire',
      content: `
        <p>Players build <b>form</b> based on results: wins give +1, losses give -1, scoring goals gives an extra +1.</p>
        <p>Form ranges from <b>-3 to +3</b>, each point adjusting effective OVR by \u00B15%:</p>
        <ul>
          <li>\uD83D\uDD25\uD83D\uDD25 = Hot streak (+2 or +3)</li>
          <li>\uD83E\uDD76 = Cold streak (-2 or -3)</li>
        </ul>
        <p><b>\uD83D\uDD25 On Fire:</b> Players with form +3 AND 3+ season goals enter "On Fire" status, gaining an additional <b>+8% OVR boost</b> on top of their form bonus.</p>
        <p>Bench players drift toward 0 form each week. Form resets at the start of each season.</p>
      `,
    },
    {
      title: '\uD83D\uDCAA Morale',
      content: `
        <p>Team <b>morale</b> ranges from -10 to +10 and affects team strength by <b>\u00B10.5% per point</b> (up to \u00B15% total).</p>
        <ul>
          <li><b>Win:</b> +1 morale</li>
          <li><b>Loss:</b> -1 morale</li>
          <li><b>Derby win:</b> +2 bonus morale on top of the standard win bonus</li>
          <li><b>Promotion:</b> +5 morale boost</li>
          <li><b>Relegation:</b> -5 morale penalty</li>
        </ul>
        <p>Keep winning to build momentum \u2014 a team on +10 morale is 5% stronger than baseline!</p>
      `,
    },
    {
      title: '\uD83D\uDD25 Derby Matches',
      content: `
        <p>Certain teams are <b>local rivals</b>. When they meet, the match is flagged as a <b>Derby</b> (\uD83D\uDD25 DERBY MATCH banner).</p>
        <p>Derby matches amplify the stakes:</p>
        <ul>
          <li><b>Form changes are doubled</b> \u2014 wins give +2 form, losses give -2</li>
          <li><b>Derby win morale bonus</b> \u2014 +2 extra morale on top of the standard +1</li>
        </ul>
        <p>Derbies are high-stakes \u2014 losing one can tank your squad's form and morale in one blow!</p>
      `,
    },
    {
      title: '\u26A0\uFE0F Pressure (Title Race & Relegation)',
      content: `
        <p>In the <b>final 4 weeks</b> of the season, teams in a title race or relegation battle come under <b>pressure</b>:</p>
        <ul>
          <li><b>Title race:</b> Top 3 teams within 6 points of the leader</li>
          <li><b>Relegation battle:</b> Bottom 4 teams within 6 points of safety</li>
        </ul>
        <p>Under pressure:</p>
        <ul>
          <li><b>Form changes are amplified 1.5\u00D7</b> \u2014 results matter more</li>
          <li><b>Team strength becomes unpredictable</b> \u2014 \u00B18% random variance (nerves can help or hurt!)</li>
        </ul>
      `,
    },
    {
      title: '\uD83C\uDFAF Training System',
      content: `
        <p><b>Training</b> runs automatically each week. Set your focus on the Squad page:</p>
        <ul>
          <li><b>Balanced</b> \u2014 All players get +8% skill gain chance on top of the 12% base</li>
          <li><b>Fitness</b> \u2014 Extra stamina recovery (5\u201312 points), but skill chance halved</li>
          <li><b>Development</b> \u2014 +8% skill chance for all; players under 22 get +16% total</li>
        </ul>
        <p><b>Training Facility</b> upgrades add +3% skill chance per level (see Facilities).</p>
      `,
    },
    {
      title: '\uD83D\uDCB0 Transfer Market',
      content: `
        <p>Buy free agents to strengthen your squad. Your <b>first signing each season is free</b>!</p>
        <p>Players cost based on their skill level and age. You can also <b>sell</b> unwanted players or <b>loan</b> players (at 30% of market value) to free up budget.</p>
        <p><b>Transfer Deadline:</b> Week 3 is deadline day \u2014 prices drop 20% and 4 extra free agents appear. No signings after the deadline!</p>
        <p>Budget comes from league prize money, sponsorship, stadium income, and solidarity payments.</p>
      `,
    },
    {
      title: '\uD83C\uDFD7\uFE0F Facilities & Sponsorships',
      content: `
        <p>Invest in <b>facilities</b> to gain long-term advantages (3 upgrade levels each):</p>
        <table class="help-shortcuts-table" style="font-size:.82rem;margin:8px 0">
          <thead><tr><th>Facility</th><th>Effect</th><th>Cost (L1/L2/L3)</th></tr></thead>
          <tbody>
            <tr><td>\uD83C\uDFCB\uFE0F Training Facility</td><td>+3% skill gain chance per level</td><td>5k / 8k / 12k</td></tr>
            <tr><td>\uD83C\uDF93 Youth Academy</td><td>+2 skill on regens per level</td><td>8k / 13k / 20k</td></tr>
            <tr><td>\uD83C\uDFDF\uFE0F Stadium</td><td>+150 per home game + 500 season bonus per level</td><td>3k / 5k / 8k</td></tr>
          </tbody>
        </table>
        <p><b>Sponsorships</b> provide income based on your division:</p>
        <ul>
          <li><b>Small:</b> 500/season (Div 4+)</li>
          <li><b>Medium:</b> 1,000/season (Div 3+)</li>
          <li><b>Large:</b> 2,000/season (Div 1 only)</li>
        </ul>
      `,
    },
    {
      title: '\uD83D\uDC74 Player Lifecycle & Retirement',
      content: `
        <p>Players develop based on age:</p>
        <ul>
          <li><b>16\u201320:</b> 50% chance of +1\u20133 skill per season (peak growth)</li>
          <li><b>21\u201325:</b> Moderate growth, tapering off</li>
          <li><b>26\u201329:</b> Plateau \u2014 small chance of +1 or -1</li>
          <li><b>30\u201332:</b> 20% chance of decline (-1)</li>
          <li><b>33\u201335:</b> 40% chance of decline (-1\u20132)</li>
          <li><b>36\u201337:</b> 60% chance of decline (-1\u20132)</li>
        </ul>
        <p>At <b>age 38</b>, players retire and are <b>automatically replaced</b> by a new 18-year-old in the same position. The replacement's skill matches your division (higher divisions = stronger regens). Youth Academy upgrades boost regen skill.</p>
        <p>Watch for \u23F3 and \u26A0\uFE0F icons next to players approaching retirement.</p>
      `,
    },
    {
      title: '\uD83D\uDCCA Promotion & Relegation',
      content: `
        <p>At season end, the <b>top 2</b> teams in each division are promoted, and the <b>bottom 2</b> are relegated.</p>
        <p>Division 1 champions win the league trophy! Division 4 bottom 2 are replaced by new teams.</p>
        <p>Prize money increases with each division level. Promotion gives +5 morale; relegation gives -5.</p>
      `,
    },
    {
      title: '\uD83C\uDFC6 Trophy Room',
      content: `
        <p>The Trophy Room tracks your all-time records and milestones:</p>
        <ul>
          <li><b>Season records:</b> Best points, most wins, fewest defeats, best attack, best defence, best goal difference</li>
          <li><b>Match records:</b> Biggest win, biggest defeat, highest-scoring match</li>
          <li><b>Streaks:</b> Longest unbeaten run, longest win streak, consecutive Div 1 seasons</li>
          <li><b>Milestones:</b> Total promotions, relegations, clean sheets, highest power rating</li>
          <li><b>Hall of Fame:</b> All-time career goal scorers for your team</li>
        </ul>
        <p>League-wide records are also tracked \u2014 can your team set the all-time best?</p>
      `,
    },
    {
      title: '\uD83D\uDD0A Sound Effects',
      content: `
        <p>The game uses synthesized sound effects for goals, whistles, cards, and more.</p>
        <p>Adjust the volume using the slider in Settings, or click the \uD83D\uDD0A/\uD83D\uDD07 button in the top bar to mute/unmute.</p>
      `,
    },
    {
      title: '\u2328\uFE0F Keyboard Shortcuts',
      content: `
        <p>Use keyboard shortcuts to navigate and play faster:</p>
        <table class="help-shortcuts-table">
          <thead><tr><th>Key</th><th>Action</th></tr></thead>
          <tbody>
            <tr><td><kbd>D</kbd></td><td>Dashboard</td></tr>
            <tr><td><kbd>S</kbd></td><td>Squad</td></tr>
            <tr><td><kbd>T</kbd></td><td>Table</td></tr>
            <tr><td><kbd>C</kbd></td><td>Calendar</td></tr>
            <tr><td><kbd>G</kbd></td><td>Top Goals / Scorers</td></tr>
            <tr><td><kbd>M</kbd></td><td>Market</td></tr>
            <tr><td><kbd>H</kbd></td><td>History</td></tr>
            <tr><td><kbd>R</kbd></td><td>Trophy Room</td></tr>
            <tr class="help-shortcuts-separator"><td colspan="2"></td></tr>
            <tr><td><kbd>P</kbd></td><td>Play Week / Play Match</td></tr>
            <tr><td><kbd>Space</kbd></td><td>Play Match / Continue (half-time & full-time)</td></tr>
            <tr><td><kbd>Esc</kbd></td><td>Close overlay (Settings, Help, Changelog)</td></tr>
            <tr class="help-shortcuts-separator"><td colspan="2"></td></tr>
            <tr><td><kbd>A</kbd></td><td>Auto-pick squad (Squad view only)</td></tr>
          </tbody>
        </table>
      `,
    },
  ];

  let h = '';
  for (const s of sections) {
    h += `<div class="help-section">` +
      `<div class="help-section-title" onclick="this.parentElement.classList.toggle('open')">${s.title}<span class="help-chevron">\u25B8</span></div>` +
      `<div class="help-section-body">${s.content}</div>` +
      `</div>`;
  }
  body.innerHTML = h;

  /* Open the first section by default */
  const firstSection = body.querySelector('.help-section');
  if (firstSection) firstSection.classList.add('open');
}
