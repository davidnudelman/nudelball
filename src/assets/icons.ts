/**
 * icons.ts -- Inline SVG icon library.
 *
 * Small, purposeful vector icons used across the game UI to replace the
 * original emoji glyphs.  Each icon is a plain `<svg>` string with a
 * `currentColor`-friendly stroke or fill so it inherits the text colour
 * from its parent, giving a consistent tonal look in both dark and light
 * themes.
 *
 * The icons are intentionally monochrome and geometric so they sit well
 * alongside the text without competing with the colourful team plates
 * and procedural portraits.
 */

/** Standard width/height applied to every inline icon. */
const DEFAULT_SIZE = 16;

/**
 * Wrap a set of SVG child elements in a standard <svg> container.
 *
 * @param body - Child SVG markup
 * @param size - Optional pixel size (defaults to DEFAULT_SIZE)
 * @returns A complete inline SVG string
 */
function svg(body: string, size: number = DEFAULT_SIZE): string {
  return `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

// ---------------------------------------------------------------------------
// Icon registry
// ---------------------------------------------------------------------------
// Every icon returns a function so we can pass a `size` parameter at the
// callsite.  All bodies are drawn on a 24x24 grid.
// ---------------------------------------------------------------------------

type IconFn = (size?: number) => string;

const ICONS: Record<string, IconFn> = {
  /* Book / "how to play" guide */
  book: (s) => svg('<path d="M4 4 h12 a3 3 0 0 1 3 3 v13 a2 2 0 0 0 -2 -2 h-13 z"/><path d="M4 4 v15"/>', s),
  /* Gear / settings */
  gear: (s) => svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15 a1.65 1.65 0 0 0 .33 1.82l.06.06 a2 2 0 0 1 -2.83 2.83l-.06 -.06 a1.65 1.65 0 0 0 -1.82 -.33 1.65 1.65 0 0 0 -1 1.51V21 a2 2 0 0 1 -4 0v-.09 a1.65 1.65 0 0 0 -1 -1.51 1.65 1.65 0 0 0 -1.82 .33l-.06 .06 a2 2 0 0 1 -2.83 -2.83l.06 -.06 a1.65 1.65 0 0 0 .33 -1.82 1.65 1.65 0 0 0 -1.51 -1H3 a2 2 0 0 1 0 -4h.09 a1.65 1.65 0 0 0 1.51 -1 1.65 1.65 0 0 0 -.33 -1.82l-.06 -.06 a2 2 0 0 1 2.83 -2.83l.06 .06 a1.65 1.65 0 0 0 1.82 .33H9 a1.65 1.65 0 0 0 1 -1.51V3 a2 2 0 0 1 4 0v.09 a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82 -.33l.06 -.06 a2 2 0 0 1 2.83 2.83l-.06 .06 a1.65 1.65 0 0 0 -.33 1.82V9 a1.65 1.65 0 0 0 1.51 1H21 a2 2 0 0 1 0 4h-.09 a1.65 1.65 0 0 0 -1.51 1z"/>', s),
  /* Speaker (volume) */
  volume: (s) => svg('<path d="M11 5 L6 9 H2 v6 h4 l5 4 z"/><path d="M15.54 8.46 a5 5 0 0 1 0 7.07"/><path d="M18.36 5.64 a9 9 0 0 1 0 12.73"/>', s),
  mute: (s) => svg('<path d="M11 5 L6 9 H2 v6 h4 l5 4 z"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/>', s),
  /* Moon/Sun theme toggles */
  moon: (s) => svg('<path d="M21 12.79 A9 9 0 1 1 11.21 3 a7 7 0 0 0 9.79 9.79 z"/>', s),
  sun: (s) => svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2 M12 20v2 M4.93 4.93l1.41 1.41 M17.66 17.66l1.41 1.41 M2 12h2 M20 12h2 M4.93 19.07l1.41 -1.41 M17.66 6.34l1.41 -1.41"/>', s),
  /* Trophy (general award) */
  trophy: (s) => svg('<path d="M8 21 h8"/><path d="M12 17 v4"/><path d="M7 4 h10 v5 a5 5 0 0 1 -10 0 z"/><path d="M7 6 H4 a2 2 0 0 0 0 4 c1 1 2 2 3 2"/><path d="M17 6 h3 a2 2 0 0 1 0 4 c-1 1 -2 2 -3 2"/>', s),
  /* Medal */
  medal: (s) => svg('<circle cx="12" cy="14" r="6"/><path d="M8.21 13.89 L7 22 l5 -3 l5 3 l-1.21 -8.12"/><path d="M7 3 l5 6 l5 -6"/>', s),
  /* Clipboard / changelog */
  clipboard: (s) => svg('<rect x="8" y="3" width="8" height="4" rx="1"/><path d="M16 5 h2 a2 2 0 0 1 2 2 v12 a2 2 0 0 1 -2 2 H6 a2 2 0 0 1 -2 -2 V7 a2 2 0 0 1 2 -2 h2"/>', s),
  /* Money / budget */
  money: (s) => svg('<line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5 a3.5 3.5 0 0 0 0 7h5 a3.5 3.5 0 0 1 0 7H6"/>', s),
  /* Calendar / schedule */
  calendar: (s) => svg('<rect x="3" y="5" width="18" height="16" rx="2"/><line x1="16" y1="3" x2="16" y2="7"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="3" y1="11" x2="21" y2="11"/>', s),
  /* Fire / hot streak */
  fire: (s) => svg('<path d="M12 2 s4 4 4 8 a4 4 0 0 1 -4 4 a4 4 0 0 1 -4 -4 c0 -2 2 -4 2 -4 z"/><path d="M12 22 a6 6 0 0 0 6 -6 c0 -3 -3 -6 -3 -6 s -1 3 -3 3 s -3 -2 -3 -2 s -3 2 -3 5 a6 6 0 0 0 6 6 z"/>', s),
  /* Chart / trend up */
  chartUp: (s) => svg('<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>', s),
  chartDown: (s) => svg('<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>', s),
  /* Building / stadium */
  stadium: (s) => svg('<path d="M2 20 h20"/><path d="M4 20 V10 a8 8 0 0 1 16 0 V20"/><path d="M8 20 v-6 h8 v6"/><circle cx="12" cy="6" r="1"/>', s),
  /* Dumbbell / training ground */
  dumbbell: (s) => svg('<path d="M6 8 v8"/><path d="M18 8 v8"/><path d="M2 10 v4"/><path d="M22 10 v4"/><path d="M6 12 h12"/>', s),
  /* Graduation cap / youth academy */
  cap: (s) => svg('<path d="M2 10 L12 4 L22 10 L12 16 Z"/><path d="M6 12 V18 a6 6 0 0 0 12 0 v-6"/>', s),
  /* User / single person */
  user: (s) => svg('<path d="M20 21 v-2 a4 4 0 0 0 -4 -4 H8 a4 4 0 0 0 -4 4 v2"/><circle cx="12" cy="7" r="4"/>', s),
  /* Users / group */
  users: (s) => svg('<path d="M17 21 v-2 a4 4 0 0 0 -4 -4 H5 a4 4 0 0 0 -4 4 v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21 v-2 a4 4 0 0 0 -3 -3.87"/><path d="M16 3.13 a4 4 0 0 1 0 7.75"/>', s),
  /* Soccer ball / goal */
  ball: (s) => svg('<circle cx="12" cy="12" r="10"/><polygon points="12 6 17 10 15 16 9 16 7 10"/>', s),
  /* First-aid cross / injury */
  cross: (s) => svg('<rect x="9" y="3" width="6" height="18" rx="1"/><rect x="3" y="9" width="18" height="6" rx="1"/>', s),
  /* Bolt / quick / fresh */
  bolt: (s) => svg('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>', s),
  /* Star */
  star: (s) => svg('<polygon points="12 2 15.1 8.6 22 9.3 16.5 13.9 18.2 21 12 17.3 5.8 21 7.5 13.9 2 9.3 8.9 8.6"/>', s),
  /* Warning triangle */
  warning: (s) => svg('<path d="M10.29 3.86 L1.82 18 a2 2 0 0 0 1.71 3h16.94 a2 2 0 0 0 1.71 -3L13.71 3.86 a2 2 0 0 0 -3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>', s),
  /* Clock */
  clock: (s) => svg('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>', s),
  /* Lock */
  lock: (s) => svg('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11 V7 a5 5 0 0 1 10 0 v4"/>', s),
  /* Ban / forbidden */
  ban: (s) => svg('<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>', s),
  /* Arrow up / promotion */
  arrowUp: (s) => svg('<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>', s),
  arrowDown: (s) => svg('<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>', s),
  arrowLeft: (s) => svg('<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>', s),
  arrowRight: (s) => svg('<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>', s),
  /* Check */
  check: (s) => svg('<polyline points="20 6 9 17 4 12"/>', s),
  /* Cross (close) */
  close: (s) => svg('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>', s),
  /* Chess / tactic */
  tactic: (s) => svg('<path d="M3 21 h18"/><rect x="9" y="3" width="6" height="4"/><path d="M12 7 V14"/><path d="M7 14 h10 l2 7 H5 z"/>', s),
  /* Rotate / refresh / substitution */
  refresh: (s) => svg('<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9 a9 9 0 0 1 14.85 -3.36L23 10"/><path d="M20.49 15 a9 9 0 0 1 -14.85 3.36L1 14"/>', s),
  /* Radar / scout */
  radar: (s) => svg('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>', s),
  /* Handshake (loan / deal) */
  handshake: (s) => svg('<path d="M3 10 h5 l3 3 l3 -3 h7"/><path d="M12 13 l-2 3 a2 2 0 0 0 3 3 l3 -3"/>', s),
  /* Inbox (incoming transfer) */
  inboxIn: (s) => svg('<polyline points="8 12 12 16 16 12"/><line x1="12" y1="4" x2="12" y2="16"/><path d="M4 17 v2 a2 2 0 0 0 2 2 h12 a2 2 0 0 0 2 -2 v-2"/>', s),
  inboxOut: (s) => svg('<polyline points="16 12 12 8 8 12"/><line x1="12" y1="20" x2="12" y2="8"/><path d="M4 17 v2 a2 2 0 0 0 2 2 h12 a2 2 0 0 0 2 -2 v-2"/>', s),
  /* Shield (defence) */
  shield: (s) => svg('<path d="M12 2 L4 5 v6 c0 5 3 9 8 11 c5 -2 8 -6 8 -11 V5 z"/>', s),
  /* Smile (joke) */
  smile: (s) => svg('<circle cx="12" cy="12" r="10"/><path d="M8 14 s1.5 2 4 2 s4 -2 4 -2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>', s),
  /* Seedling / development */
  seedling: (s) => svg('<path d="M12 22 V10"/><path d="M12 10 C12 6 16 4 20 4 C20 8 18 12 12 12"/><path d="M12 10 C12 8 9 6 5 6 C5 10 7 13 12 13"/>', s),
  /* Target */
  target: (s) => svg('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>', s),
  /* Globe */
  globe: (s) => svg('<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2 a15.3 15.3 0 0 1 4 10 a15.3 15.3 0 0 1 -4 10 a15.3 15.3 0 0 1 -4 -10 a15.3 15.3 0 0 1 4 -10z"/>', s),
};

/**
 * Return an inline SVG string for a named icon.
 *
 * @param name - Icon key from the registry
 * @param size - Optional pixel size (default 16)
 * @returns SVG markup ready for `innerHTML`
 */
export function icon(name: keyof typeof ICONS, size?: number): string {
  const fn = ICONS[name];
  if (!fn) return '';
  return fn(size);
}

/**
 * List of every registered icon name -- useful for palette views and tests.
 */
export const ICON_NAMES = Object.keys(ICONS) as Array<keyof typeof ICONS>;
