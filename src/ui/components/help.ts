/**
 * help.ts -- "How to Play" overlay renderer.
 *
 * Builds an accordion-style help overlay with collapsible sections
 * covering all game mechanics: getting started, squad management,
 * formations, match day, training, transfers, player lifecycle, etc.
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
        <p>Welcome to <b>Pitch Boss</b>! Pick a team, name your manager, and enter the dugout.</p>
        <p>Your goal is to climb through 4 divisions to become the ultimate champion. Manage your squad, set tactics, buy and sell players, and lead your team to glory!</p>
      `,
    },
    {
      title: '\uD83D\uDCCA Dashboard',
      content: `
        <p>The dashboard shows your upcoming match, last result, league standing, and any team news (injuries, suspensions, transfers).</p>
        <p>At the end of each season, review the recap showing awards, standings, and promotion/relegation before starting the next season.</p>
      `,
    },
    {
      title: '\uD83D\uDC65 Squad Management',
      content: `
        <p>Select 11 players from your squad. Assign each a <b>formation role</b> using the dropdown. Every squad must have exactly 1 GK.</p>
        <p><b>Stamina</b> drains each match (8\u201315%). Players below 50% risk losing skill. Bench players recover 20% per week, so rotate your squad!</p>
        <p><b>Fresh players</b> (\u26A1) have been benched 3+ matches and get a +10% OVR boost when selected.</p>
        <p><b>Injured</b> (\u2720) and <b>suspended</b> (\uD83D\uDEAB) players cannot be selected until they recover.</p>
      `,
    },
    {
      title: '\u26BD Formations & Tactics',
      content: `
        <p><b>Formations</b> determine how many players play in each position. Assigning a player out of position (OOP) gives a <b>-15% penalty per step</b>:</p>
        <ul>
          <li>DEF \u2192 MID: -15% | DEF \u2192 STR: -30%</li>
          <li>STR \u2192 MID: -15% | STR \u2192 DEF: -30%</li>
          <li>GK is locked and cannot play outfield</li>
        </ul>
        <p><b>Tactics</b> affect how many goals you score and concede:</p>
        <ul>
          <li><b>\u2694\uFE0F All-Out Attack</b> \u2014 More goals scored AND conceded. High-risk, high-reward.</li>
          <li><b>\u2696\uFE0F Balanced</b> \u2014 Neutral modifiers. The default starting tactic.</li>
          <li><b>\uD83D\uDEE1\uFE0F Defensive</b> \u2014 Fewer goals all around. Good for protecting a lead.</li>
          <li><b>\uD83C\uDFF9 Counter-Attack</b> \u2014 Moderate balance. Good against stronger teams \u2014 concede less while still creating chances.</li>
        </ul>
        <p>You can change tactics <b>during a match</b> at any time!</p>
      `,
    },
    {
      title: '\uD83C\uDFDF\uFE0F Match Day',
      content: `
        <p>Matches can be played in <b>instant</b> mode (immediate result) or <b>animated</b> mode (minute-by-minute with events).</p>
        <p>During animated matches you can:</p>
        <ul>
          <li><b>Make substitutions</b> \u2014 Up to 3 per match. Click SUB next to a bench player, then pick which starter to replace.</li>
          <li><b>Change tactics</b> \u2014 Switch between Attack/Balanced/Defensive/Counter at any time.</li>
          <li><b>Watch rival results</b> \u2014 See how other teams in your division are doing in real-time.</li>
        </ul>
        <p><b>Yellow cards</b> (\uD83D\uDFE8) accumulate \u2014 5 yellows = 1-match suspension. <b>Red cards</b> (\uD83D\uDFE5) mean an immediate -10% team strength for the rest of the match, plus a 2-match ban.</p>
      `,
    },
    {
      title: '\uD83C\uDFAF Training System',
      content: `
        <p><b>Training</b> runs automatically each week. Set your focus on the Squad page:</p>
        <ul>
          <li><b>Attack</b> \u2014 Strikers have higher chance of +1 skill</li>
          <li><b>Defence</b> \u2014 Defenders and GK benefit most</li>
          <li><b>Fitness</b> \u2014 Extra stamina recovery, but less skill growth</li>
          <li><b>Youth Dev</b> \u2014 Players under 22 get extra skill chance</li>
          <li><b>Balanced</b> \u2014 Even chance for all positions</li>
        </ul>
      `,
    },
    {
      title: '\uD83D\uDCB0 Transfer Market',
      content: `
        <p>Buy free agents to strengthen your squad. Your first signing each season is <b>free</b>!</p>
        <p>Players cost based on their skill level and age. Your can also sell unwanted players to free up budget.</p>
        <p>Budget comes from league prize money, sponsorship, stadium income, and solidarity payments.</p>
      `,
    },
    {
      title: '\uD83D\uDC74 Player Lifecycle & Retirement',
      content: `
        <p>When a player reaches <b>age 38</b>, they retire at the end of the season and are <b>automatically replaced</b> by a new 18-year-old player in the same position.</p>
        <p>The replacement's skill level matches your division \u2014 higher divisions get stronger regens.</p>
        <p>Plan ahead by signing young free agents to replace aging stars! Watch for the \u23F3 and \u26A0\uFE0F icons next to players approaching retirement.</p>
      `,
    },
    {
      title: '\uD83D\uDCC8 Player Form',
      content: `
        <p>Players build <b>form</b> based on results: wins boost form, losses decrease it, and scoring goals gives extra momentum.</p>
        <p>Form ranges from -3 to +3, each point adjusting a player's effective OVR by \u00B15%.</p>
        <ul>
          <li>\uD83D\uDD25\uD83D\uDD25 = Hot streak (+2 or +3)</li>
          <li>\uD83E\uDD76 = Cold streak (-2 or -3)</li>
        </ul>
        <p>Form resets at the start of each season.</p>
      `,
    },
    {
      title: '\uD83D\uDCCA Promotion & Relegation',
      content: `
        <p>At season end, the <b>top 2</b> teams in each division are promoted, and the <b>bottom 2</b> are relegated.</p>
        <p>Division 1 champions win the league trophy! Division 4 bottom 2 are replaced by new teams.</p>
        <p>Prize money increases with each division level.</p>
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
