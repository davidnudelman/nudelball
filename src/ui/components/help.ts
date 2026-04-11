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
      title: 'Getting Started',
      content: `
        <p>Welcome to <b>Park the Bus</b>! Pick a team, name your manager, and enter the dugout.</p>
        <p>Your goal is to climb through <b>4 divisions</b> to become the ultimate champion. Manage your squad, set tactics, buy and sell players, and lead your team to glory!</p>
        <p><b>Difficulty</b> affects AI strength, your budget, and training effectiveness:</p>
        <ul>
          <li><b>Easy</b> AI teams 10% weaker, 50% more budget, 30% faster training</li>
          <li><b>Normal</b> Standard settings</li>
          <li><b>Hard</b> AI teams 10% stronger, 25% less budget, 20% slower training</li>
        </ul>
      `,
    },
    {
      title: 'Dashboard',
      content: `
        <p>The dashboard shows your upcoming match, last result, league standing, and any team news (injuries, suspensions, transfers).</p>
        <p>At the end of each season, review the <b>Season Recap</b> showing awards (Golden Boot, best defence, etc.), final standings, and promotion/relegation before starting the next season.</p>
      `,
    },
    {
      title: 'Squad Management',
      content: `
        <p>Select 11 players from your squad. Assign each a <b>formation role</b> using the dropdown. Every squad must have exactly 1 GK.</p>
        <p><b>Stamina</b> drains each match (815%). Players below 50% risk losing skill. Bench players recover 12% per week, so rotate your squad!</p>
        <p><b>Fresh players</b> () have been benched 3+ matches and get a <b>+10% OVR boost</b> when selected.</p>
        <p><b>Injured</b> () and <b>suspended</b> () players cannot be selected until they recover.</p>
        <p><b>Auto-Pick</b> selects the best 11 for your formation using stamina-weighted skill, form, OOP fit, and freshness. Players below 60% stamina are excluded when possible.</p>
      `,
    },
    {
      title: 'Squad Rules (Auto-Rotation)',
      content: `
        <p>Automate squad rotation with rules on the Squad page:</p>
        <ul>
          <li><b>Rest Tired</b> Automatically bench players below 60% stamina before each match and fill gaps with the best available subs.</li>
          <li><b>Best XI</b> Auto-pick the highest-rated available 11 each week.</li>
        </ul>
        <p>Manual overrides always take priority you can still adjust after rules apply.</p>
      `,
    },
    {
      title: 'Player Roles',
      content: `
        <p>Each player can have a <b>role</b> that provides a synergy bonus when paired with the right tactic:</p>
        <table class="help-shortcuts-table" style="font-size:.82rem;margin:8px 0">
          <thead><tr><th>Role</th><th>Positions</th><th>Best Tactic</th><th>Bonus</th></tr></thead>
          <tbody>
            <tr><td>Target Man</td><td>STR</td><td>Attack</td><td>+5%</td></tr>
            <tr><td>Speedster</td><td>STR</td><td>Counter</td><td>+5%</td></tr>
            <tr><td>Ball Winner</td><td>DEF, MID</td><td>Defensive</td><td>+4%</td></tr>
            <tr><td>Playmaker</td><td>MID</td><td>Balanced</td><td>+3%</td></tr>
            <tr><td>Creator</td><td>MID, STR</td><td>Attack</td><td>+3%</td></tr>
            <tr><td>Anchor</td><td>DEF, GK</td><td>Defensive</td><td>+3%</td></tr>
          </tbody>
        </table>
        <p>Synergy bonuses stack fill your squad with roles that match your tactic for maximum impact!</p>
      `,
    },
    {
      title: 'Formations & Tactics',
      content: `
        <p><b>Formations</b> determine how many players play in each position (DEF/MID/STR). Assigning a player out of position (OOP) gives a <b>-10% penalty</b>:</p>
        <ul>
          <li>DEF MID or MID STR: -10% (1 step)</li>
          <li>DEF STR or STR DEF: cannot play (2 steps)</li>
          <li>GK is locked cannot play outfield</li>
        </ul>
        <p><b>Formations directly affect match results</b> in two ways:</p>
        <ul>
          <li><b>Positional power:</b> Your STR power vs their DEF (and vice versa) nudges expected goals. Midfield control also matters dominating midfield gives a small edge.</li>
          <li><b>Formation-tactic synergy:</b> Pairing the right formation with the right tactic amplifies its effect. Mismatches weaken it.</li>
        </ul>
        <table class="help-shortcuts-table" style="font-size:.82rem;margin:8px 0">
          <thead><tr><th>Formation</th><th>Best With</th><th>Worst With</th></tr></thead>
          <tbody>
            <tr><td>3-3-4, 3-4-3</td><td>Attack (+12%)</td><td>Defensive (-20%)</td></tr>
            <tr><td>4-4-2</td><td>Balanced (+8%)</td><td>(versatile)</td></tr>
            <tr><td>3-5-2</td><td>Balanced (+5%)</td><td>Defensive (-8%)</td></tr>
            <tr><td>4-3-3</td><td>Attack (+5%)</td><td>Defensive (-10%)</td></tr>
            <tr><td>4-5-1</td><td>Defensive (+8%)</td><td>Attack (-12%)</td></tr>
            <tr><td>5-3-2</td><td>Defensive (+12%)</td><td>Attack (-18%)</td></tr>
            <tr><td>5-4-1</td><td>Defensive (+15%)</td><td>Attack (-22%)</td></tr>
          </tbody>
        </table>
        <p><b>Tactics</b> affect how many goals you score and concede:</p>
        <ul>
          <li><b>All-Out Attack</b> More goals scored AND conceded. High-risk, high-reward.</li>
          <li><b>Balanced</b> Neutral modifiers. The default starting tactic.</li>
          <li><b>Defensive</b> Fewer goals all around. Good for protecting a lead.</li>
          <li><b>Counter-Attack</b> Moderate balance. Good against stronger teams concede less while still creating chances.</li>
        </ul>
        <p><b>Tactic matchups matter!</b> Tactics have rock-paper-scissors dynamics picking the right one against your opponent's tactic gives a significant edge:</p>
        <table class="help-shortcuts-table" style="font-size:.82rem;margin:8px 0">
          <thead><tr><th>Your Tactic</th><th>Strong Against</th><th>Bonus</th><th>Weak Against</th><th>Penalty</th></tr></thead>
          <tbody>
            <tr><td>Counter</td><td>Attack</td><td>+15%</td><td>Defensive</td><td>-12%</td></tr>
            <tr><td>Attack</td><td>Balanced</td><td>+12%</td><td>Defensive</td><td>-12%</td></tr>
            <tr><td>Balanced</td><td>Defensive</td><td>+10%</td><td>Attack</td><td>-10%</td></tr>
            <tr><td>Defensive</td><td>Counter</td><td>+10%</td><td>Balanced</td><td></td></tr>
          </tbody>
        </table>
        <p><b>Tip:</b> Watch your opponent's tactic during animated matches and switch mid-game to counter them!</p>
      `,
    },
    {
      title: 'Match Day',
      content: `
        <p>Matches can be played in <b>instant</b> mode (immediate result) or <b>animated</b> mode (minute-by-minute with events).</p>
        <p>During animated matches you can:</p>
        <ul>
          <li><b>Make substitutions</b> Up to 3 per match. Click SUB next to a bench player, then pick which starter to replace. Subbed-in players get a +10% effectiveness boost.</li>
          <li><b>Change tactics</b> Switch between Attack/Balanced/Defensive/Counter at any time to counter your opponent.</li>
          <li><b>Watch rival results</b> See how other teams in your division are doing in real-time.</li>
        </ul>
        <p><b>Yellow cards</b> () accumulate 5 yellows = 1-match suspension. <b>Red cards</b> () give the opponent extra goal chances for the rest of the match, plus a 2-match ban for the offender.</p>
        <p><b>Man of the Match</b> is awarded based on goals scored and skill rating.</p>
      `,
    },
    {
      title: 'Player Form & On Fire',
      content: `
        <p>Players build <b>form</b> based on results: wins give +1, losses give -1, scoring goals gives an extra +1.</p>
        <p>Form ranges from <b>-3 to +3</b>, each point adjusting effective OVR by \u00B15%:</p>
        <ul>
          <li>= Hot streak (+2 or +3)</li>
          <li>= Cold streak (-2 or -3)</li>
        </ul>
        <p><b>On Fire:</b> Players with form +3 AND 3+ season goals enter "On Fire" status, gaining an additional <b>+8% OVR boost</b> on top of their form bonus.</p>
        <p>Bench players drift toward 0 form each week. Form resets at the start of each season.</p>
      `,
    },
    {
      title: 'Morale',
      content: `
        <p>Team <b>morale</b> ranges from -10 to +10 and affects team strength by <b>\u00B10.5% per point</b> (up to \u00B15% total).</p>
        <ul>
          <li><b>Win:</b> +1 morale</li>
          <li><b>Loss:</b> -1 morale</li>
          <li><b>Derby win:</b> +2 bonus morale on top of the standard win bonus</li>
          <li><b>Promotion:</b> +5 morale boost</li>
          <li><b>Relegation:</b> -5 morale penalty</li>
        </ul>
        <p>Keep winning to build momentum a team on +10 morale is 5% stronger than baseline!</p>
      `,
    },
    {
      title: 'Derby Matches',
      content: `
        <p>Certain teams are <b>local rivals</b>. When they meet, the match is flagged as a <b>Derby</b> (DERBY MATCH banner).</p>
        <p>Derby matches amplify the stakes:</p>
        <ul>
          <li><b>Form changes are doubled</b> wins give +2 form, losses give -2</li>
          <li><b>Derby win morale bonus</b> +2 extra morale on top of the standard +1</li>
        </ul>
        <p>Derbies are high-stakes losing one can tank your squad's form and morale in one blow!</p>
      `,
    },
    {
      title: 'Pressure (Title Race & Relegation)',
      content: `
        <p>In the <b>final 4 weeks</b> of the season, teams in a title race or relegation battle come under <b>pressure</b>:</p>
        <ul>
          <li><b>Title race:</b> Top 3 teams within 6 points of the leader</li>
          <li><b>Relegation battle:</b> Bottom 4 teams within 6 points of safety</li>
        </ul>
        <p>Under pressure:</p>
        <ul>
          <li><b>Form changes are amplified 1.5\u00D7</b> results matter more</li>
          <li><b>Team strength becomes unpredictable</b> \u00B18% random variance (nerves can help or hurt!)</li>
        </ul>
      `,
    },
    {
      title: 'Training System',
      content: `
        <p><b>Training</b> runs automatically each week. Set your focus on the Squad page:</p>
        <ul>
          <li><b>Balanced</b> All players get +8% skill gain chance on top of the 12% base</li>
          <li><b>Fitness</b> Extra stamina recovery (512 points), but skill chance halved</li>
          <li><b>Development</b> +8% skill chance for all; players under 22 get +16% total</li>
        </ul>
        <p><b>Training Facility</b> upgrades add +2% skill chance per level (see Facilities).</p>
        <p><b>Note:</b> AI teams also train each week at a reduced rate, so investing in your training facility gives a competitive edge rather than an insurmountable advantage.</p>
      `,
    },
    {
      title: 'Transfer Market',
      content: `
        <p>Buy free agents to strengthen your squad. Your <b>first signing each season is free</b>!</p>
        <p>Players cost based on their skill level and age. You can also <b>sell</b> unwanted players or <b>loan</b> players (at 30% of market value) to free up budget.</p>
        <p><b>Transfer Deadline:</b> Week 3 is deadline day prices drop 20% and 4 extra free agents appear. No signings after the deadline!</p>
        <p>Budget comes from league prize money, sponsorship, stadium income, and solidarity payments.</p>
      `,
    },
    {
      title: 'Facilities & Sponsorships',
      content: `
        <p>Invest in <b>facilities</b> to gain long-term advantages (3 upgrade levels each):</p>
        <table class="help-shortcuts-table" style="font-size:.82rem;margin:8px 0">
          <thead><tr><th>Facility</th><th>Effect</th><th>Cost (L1/L2/L3)</th></tr></thead>
          <tbody>
            <tr><td>Training Facility</td><td>+2% skill gain chance per level</td><td>5k / 8k / 12k</td></tr>
            <tr><td>Youth Academy</td><td>+1 skill on regens per level</td><td>8k / 13k / 20k</td></tr>
            <tr><td>Stadium</td><td>+150 per home game + 500 season bonus per level</td><td>3k / 5k / 8k</td></tr>
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
      title: 'Player Lifecycle & Retirement',
      content: `
        <p>Players develop based on age:</p>
        <ul>
          <li><b>1620:</b> 35% chance of +12 skill per season (peak growth)</li>
          <li><b>2125:</b> Moderate growth, tapering off</li>
          <li><b>2629:</b> Plateau small chance of +1 or -1</li>
          <li><b>3032:</b> 20% chance of decline (-1)</li>
          <li><b>3335:</b> 40% chance of decline (-12)</li>
          <li><b>3637:</b> 60% chance of decline (-12)</li>
        </ul>
        <p>At <b>age 38</b>, players retire and are <b>automatically replaced</b> by a new 18-year-old in the same position. The replacement's skill matches your division (higher divisions = stronger regens). Youth Academy upgrades boost regen skill.</p>
        <p>Watch for and icons next to players approaching retirement.</p>
      `,
    },
    {
      title: 'Promotion & Relegation',
      content: `
        <p>At season end, the <b>top 2</b> teams in each division are promoted, and the <b>bottom 2</b> are relegated.</p>
        <p>Division 1 champions win the league trophy! Division 4 bottom 2 are replaced by new teams.</p>
        <p>Prize money increases with each division level. Promotion gives +5 morale; relegation gives -5.</p>
      `,
    },
    {
      title: 'Trophy Room',
      content: `
        <p>The Trophy Room tracks your all-time records and milestones:</p>
        <ul>
          <li><b>Season records:</b> Best points, most wins, fewest defeats, best attack, best defence, best goal difference</li>
          <li><b>Match records:</b> Biggest win, biggest defeat, highest-scoring match</li>
          <li><b>Streaks:</b> Longest unbeaten run, longest win streak, consecutive Div 1 seasons</li>
          <li><b>Milestones:</b> Total promotions, relegations, clean sheets, highest power rating</li>
          <li><b>Hall of Fame:</b> All-time career goal scorers for your team</li>
        </ul>
        <p>League-wide records are also tracked can your team set the all-time best?</p>
      `,
    },
    {
      title: 'Sound Effects',
      content: `
        <p>The game uses synthesized sound effects for goals, whistles, cards, and more.</p>
        <p>Adjust the volume using the slider in Settings, or click the /button in the top bar to mute/unmute.</p>
      `,
    },
    {
      title: 'Keyboard Shortcuts',
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
      `<div class="help-section-title" onclick="this.parentElement.classList.toggle('open')">${s.title}<span class="help-chevron"></span></div>` +
      `<div class="help-section-body">${s.content}</div>` +
      `</div>`;
  }
  body.innerHTML = h;

  /* Open the first section by default */
  const firstSection = body.querySelector('.help-section');
  if (firstSection) firstSection.classList.add('open');
}
