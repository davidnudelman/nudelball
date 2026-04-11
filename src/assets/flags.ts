/**
 * flags.ts -- Procedural SVG flag library for every country in the game.
 *
 * Each flag is a hand-crafted, simplified SVG using a 30x20 viewBox
 * (3:2 aspect ratio, the most common flag proportion).  The shapes are
 * intentionally schematic so they remain recognisable at very small sizes
 * (20px-60px) in team plates, team cards, and profile headers.
 *
 * Design goals:
 *   - No external dependencies / no network assets
 *   - Data-URI friendly (flags can be used as CSS background-image)
 *   - Colour palette is close to the real flags without claiming to be
 *     pixel-perfect -- this is a stylised football manager, not an atlas.
 *
 * Every exported helper returns a plain SVG string; callers can either
 * inline the markup directly or wrap it in `flagDataUri()` to use it as
 * a CSS background.
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Wrap an inner SVG body with the outer <svg> element, viewBox and attrs.
 *
 * @param body - Inner SVG markup (rects, paths, circles, etc.)
 * @returns A complete SVG document string
 */
function wrap(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice">${body}</svg>`;
}

/**
 * Horizontal tricolour (three equal horizontal bands top-to-bottom).
 */
function horizontal(c1: string, c2: string, c3: string): string {
  return wrap(
    `<rect width="30" height="20" fill="${c2}"/>` +
    `<rect width="30" height="6.67" y="0" fill="${c1}"/>` +
    `<rect width="30" height="6.67" y="13.33" fill="${c3}"/>`,
  );
}

/**
 * Vertical tricolour (three equal vertical bands left-to-right).
 */
function vertical(c1: string, c2: string, c3: string): string {
  return wrap(
    `<rect width="30" height="20" fill="${c2}"/>` +
    `<rect width="10" height="20" x="0" fill="${c1}"/>` +
    `<rect width="10" height="20" x="20" fill="${c3}"/>`,
  );
}

/**
 * Two horizontal bands of equal height.
 */
function bicolorH(top: string, bottom: string): string {
  return wrap(
    `<rect width="30" height="10" fill="${top}"/>` +
    `<rect width="30" height="10" y="10" fill="${bottom}"/>`,
  );
}

// ---------------------------------------------------------------------------
// Per-country flag generators
// ---------------------------------------------------------------------------

/** Spain -- red/yellow/red horizontal tricolour with a simple crest block. */
function flagES(): string {
  return wrap(
    `<rect width="30" height="20" fill="#c60b1e"/>` +
    `<rect width="30" height="10" y="5" fill="#ffc400"/>` +
    `<rect x="7" y="8" width="3.2" height="4" fill="#c60b1e" stroke="#9a0915" stroke-width=".3"/>`,
  );
}

/** England -- white with red St George's cross. */
function flagEN(): string {
  return wrap(
    `<rect width="30" height="20" fill="#ffffff"/>` +
    `<rect x="12" width="6" height="20" fill="#ce1124"/>` +
    `<rect y="7" width="30" height="6" fill="#ce1124"/>`,
  );
}

/** Portugal -- green/red vertical with a stylised shield circle. */
function flagPT(): string {
  return wrap(
    `<rect width="30" height="20" fill="#da291c"/>` +
    `<rect width="12" height="20" fill="#046a38"/>` +
    `<circle cx="12" cy="10" r="3.4" fill="#ffdf00" stroke="#8b5a00" stroke-width=".3"/>` +
    `<rect x="10.4" y="8.6" width="3.2" height="2.8" fill="#da291c"/>`,
  );
}

/** Germany -- black/red/gold horizontal tricolour. */
function flagDE(): string {
  return horizontal('#000000', '#dd0000', '#ffce00');
}

/** France -- blue/white/red vertical tricolour. */
function flagFR(): string {
  return vertical('#002654', '#ffffff', '#ce1126');
}

/** Brazil -- green field with yellow rhombus and blue circle. */
function flagBR(): string {
  return wrap(
    `<rect width="30" height="20" fill="#009b3a"/>` +
    `<polygon points="15,3 27,10 15,17 3,10" fill="#fedf00"/>` +
    `<circle cx="15" cy="10" r="3.6" fill="#002776"/>` +
    `<path d="M11.5 9.3 q3.5 -1.6 7 0" stroke="#ffffff" stroke-width=".5" fill="none"/>`,
  );
}

/** USA -- red/white stripes with blue canton. */
function flagUS(): string {
  let stripes = '<rect width="30" height="20" fill="#ffffff"/>';
  /* 7 red stripes at rows 0,2,4,6,8,10,12 (each 1.54 tall) */
  for (let i = 0; i < 7; i++) {
    stripes += `<rect y="${(i * 20) / 13}" width="30" height="${20 / 13}" fill="#b22234"/>`;
  }
  return wrap(
    stripes +
    `<rect x="0" y="0" width="12" height="${(20 / 13) * 7}" fill="#3c3b6e"/>` +
    /* simplified "stars" row */
    `<g fill="#ffffff">` +
      `<circle cx="2" cy="2" r=".5"/><circle cx="4" cy="2" r=".5"/><circle cx="6" cy="2" r=".5"/><circle cx="8" cy="2" r=".5"/><circle cx="10" cy="2" r=".5"/>` +
      `<circle cx="3" cy="4" r=".5"/><circle cx="5" cy="4" r=".5"/><circle cx="7" cy="4" r=".5"/><circle cx="9" cy="4" r=".5"/>` +
      `<circle cx="2" cy="6" r=".5"/><circle cx="4" cy="6" r=".5"/><circle cx="6" cy="6" r=".5"/><circle cx="8" cy="6" r=".5"/><circle cx="10" cy="6" r=".5"/>` +
      `<circle cx="3" cy="8" r=".5"/><circle cx="5" cy="8" r=".5"/><circle cx="7" cy="8" r=".5"/><circle cx="9" cy="8" r=".5"/>` +
    `</g>`,
  );
}

/** Canada -- red/white/red vertical bands with a maple leaf. */
function flagCA(): string {
  return wrap(
    `<rect width="30" height="20" fill="#d52b1e"/>` +
    `<rect x="7.5" width="15" height="20" fill="#ffffff"/>` +
    /* Highly simplified maple leaf (five-pointed star stand-in) */
    `<path d="M15 5 L16.1 8.2 L19.4 8.2 L16.7 10.2 L17.8 13.4 L15 11.4 L12.2 13.4 L13.3 10.2 L10.6 8.2 L13.9 8.2 Z" fill="#d52b1e"/>`,
  );
}

/** Ukraine -- blue/yellow horizontal bicolour. */
function flagUA(): string {
  return bicolorH('#005bbb', '#ffd500');
}

/** Poland -- white/red horizontal bicolour. */
function flagPL(): string {
  return bicolorH('#ffffff', '#dc143c');
}

/** Japan -- white field with red sun. */
function flagJP(): string {
  return wrap(
    `<rect width="30" height="20" fill="#ffffff"/>` +
    `<circle cx="15" cy="10" r="5" fill="#bc002d"/>`,
  );
}

/** China -- red field with yellow star. */
function flagCN(): string {
  return wrap(
    `<rect width="30" height="20" fill="#de2910"/>` +
    `<polygon points="6,3 7.3,6.6 11,6.6 8,8.8 9.1,12.5 6,10.3 2.9,12.5 4,8.8 1,6.6 4.7,6.6" fill="#ffde00" transform="scale(.6) translate(3 2)"/>`,
  );
}

/** Andorra -- blue/yellow/red vertical tricolour. */
function flagAD(): string {
  return vertical('#10069f', '#fedf00', '#d50032');
}

/** Falklands -- simplified Union-Jack-style blue/red/white corner. */
function flagFK(): string {
  return wrap(
    `<rect width="30" height="20" fill="#00247d"/>` +
    `<rect x="0" y="0" width="15" height="10" fill="#00247d"/>` +
    /* Simplified Union Jack: white diagonals + red cross */
    `<path d="M0 0 L15 10 M15 0 L0 10" stroke="#ffffff" stroke-width="2"/>` +
    `<path d="M0 0 L15 10 M15 0 L0 10" stroke="#cf142b" stroke-width=".8"/>` +
    `<rect x="6.5" y="0" width="2" height="10" fill="#ffffff"/>` +
    `<rect x="0" y="4" width="15" height="2" fill="#ffffff"/>` +
    `<rect x="7" y="0" width="1" height="10" fill="#cf142b"/>` +
    `<rect x="0" y="4.5" width="15" height="1" fill="#cf142b"/>`,
  );
}

/** Argentina -- light blue / white / light blue horizontal with sun. */
function flagAR(): string {
  return wrap(
    `<rect width="30" height="20" fill="#74acdf"/>` +
    `<rect y="6.67" width="30" height="6.67" fill="#ffffff"/>` +
    `<circle cx="15" cy="10" r="1.6" fill="#f6b40e"/>`,
  );
}

/** Colombia -- yellow (top half) / blue / red horizontal. */
function flagCO(): string {
  return wrap(
    `<rect width="30" height="20" fill="#fcd116"/>` +
    `<rect y="10" width="30" height="5" fill="#003893"/>` +
    `<rect y="15" width="30" height="5" fill="#ce1126"/>`,
  );
}

/** Chile -- white/red horizontal with blue square containing star. */
function flagCL(): string {
  return wrap(
    `<rect width="30" height="20" fill="#ffffff"/>` +
    `<rect y="10" width="30" height="10" fill="#d52b1e"/>` +
    `<rect x="0" y="0" width="10" height="10" fill="#0039a6"/>` +
    `<polygon points="5,2.5 5.9,5.2 8.6,5.2 6.4,6.9 7.3,9.6 5,7.9 2.7,9.6 3.6,6.9 1.4,5.2 4.1,5.2" fill="#ffffff"/>`,
  );
}

/** Netherlands -- red/white/blue horizontal tricolour. */
function flagNL(): string {
  return horizontal('#ae1c28', '#ffffff', '#21468b');
}

/** Croatia -- red/white/blue horizontal with simple red+white chequer band. */
function flagHR(): string {
  return wrap(
    `<rect width="30" height="20" fill="#171796"/>` +
    `<rect width="30" height="13.33" fill="#ffffff"/>` +
    `<rect width="30" height="6.67" fill="#ff0000"/>` +
    /* Mini checkerboard crest at centre */
    `<g transform="translate(12.5 6)"><rect width="5" height="4" fill="#ffffff"/>` +
      `<rect x="0" y="0" width="1" height="1" fill="#ff0000"/><rect x="2" y="0" width="1" height="1" fill="#ff0000"/><rect x="4" y="0" width="1" height="1" fill="#ff0000"/>` +
      `<rect x="1" y="1" width="1" height="1" fill="#ff0000"/><rect x="3" y="1" width="1" height="1" fill="#ff0000"/>` +
      `<rect x="0" y="2" width="1" height="1" fill="#ff0000"/><rect x="2" y="2" width="1" height="1" fill="#ff0000"/><rect x="4" y="2" width="1" height="1" fill="#ff0000"/>` +
      `<rect x="1" y="3" width="1" height="1" fill="#ff0000"/><rect x="3" y="3" width="1" height="1" fill="#ff0000"/>` +
    `</g>`,
  );
}

/** Turkey -- red with crescent and star. */
function flagTR(): string {
  return wrap(
    `<rect width="30" height="20" fill="#e30a17"/>` +
    `<circle cx="12" cy="10" r="4" fill="#ffffff"/>` +
    `<circle cx="13" cy="10" r="3.2" fill="#e30a17"/>` +
    `<polygon points="17,10 18.2,11 19.4,10.6 18.6,11.7 19,13 17.9,12.3 16.9,13 17.3,11.7 16.5,10.6 17.8,11" fill="#ffffff"/>`,
  );
}

/** Sweden -- blue with yellow Scandinavian cross. */
function flagSE(): string {
  return wrap(
    `<rect width="30" height="20" fill="#006aa7"/>` +
    `<rect x="9" width="3" height="20" fill="#fecc02"/>` +
    `<rect y="8.5" width="30" height="3" fill="#fecc02"/>`,
  );
}

/** Korea (South) -- white field, taegeuk circle, simplified trigrams. */
function flagKR(): string {
  return wrap(
    `<rect width="30" height="20" fill="#ffffff"/>` +
    `<circle cx="15" cy="10" r="4" fill="#cd2e3a"/>` +
    `<path d="M15 6 a4 4 0 0 0 0 8 a2 2 0 0 1 0 -4 a2 2 0 0 0 0 -4 z" fill="#0047a0"/>` +
    /* 4 corners -- simplified as small bars */
    `<g fill="#000000">` +
      `<rect x="3" y="4" width="3" height=".6"/><rect x="3" y="5" width="3" height=".6"/><rect x="3" y="6" width="3" height=".6"/>` +
      `<rect x="24" y="4" width="3" height=".6"/><rect x="24" y="5" width="1.2" height=".6"/><rect x="25.8" y="5" width="1.2" height=".6"/><rect x="24" y="6" width="3" height=".6"/>` +
      `<rect x="3" y="13.4" width="1.2" height=".6"/><rect x="4.8" y="13.4" width="1.2" height=".6"/><rect x="3" y="14.4" width="1.2" height=".6"/><rect x="4.8" y="14.4" width="1.2" height=".6"/><rect x="3" y="15.4" width="3" height=".6"/>` +
      `<rect x="24" y="13.4" width="1.2" height=".6"/><rect x="25.8" y="13.4" width="1.2" height=".6"/><rect x="24" y="14.4" width="3" height=".6"/><rect x="24" y="15.4" width="1.2" height=".6"/><rect x="25.8" y="15.4" width="1.2" height=".6"/>` +
    `</g>`,
  );
}

/** Egypt -- red/white/black horizontal tricolour. */
function flagEG(): string {
  return horizontal('#ce1126', '#ffffff', '#000000');
}

/** Uruguay -- blue/white stripes with sun canton. */
function flagUY(): string {
  let stripes = '<rect width="30" height="20" fill="#ffffff"/>';
  for (let i = 0; i < 5; i++) {
    if (i % 2 === 0) {
      stripes += `<rect y="${i * (20 / 9)}" width="30" height="${20 / 9}" fill="#0038a8"/>`;
    }
  }
  return wrap(
    stripes +
    `<rect width="12" height="${(20 / 9) * 5}" fill="#ffffff"/>` +
    `<circle cx="6" cy="5" r="2.8" fill="#fcd116" stroke="#8b6914" stroke-width=".2"/>`,
  );
}

/** Australia -- blue field with simplified Union Jack canton + large star. */
function flagAU(): string {
  return wrap(
    `<rect width="30" height="20" fill="#00008b"/>` +
    /* simplified Union Jack canton */
    `<rect x="0" y="0" width="12" height="10" fill="#00008b"/>` +
    `<path d="M0 0 L12 10 M12 0 L0 10" stroke="#ffffff" stroke-width="1.2"/>` +
    `<rect x="5.5" y="0" width="1.5" height="10" fill="#ffffff"/>` +
    `<rect x="0" y="4.3" width="12" height="1.5" fill="#ffffff"/>` +
    `<rect x="6" y="0" width=".5" height="10" fill="#cf142b"/>` +
    `<rect x="0" y="4.75" width="12" height=".5" fill="#cf142b"/>` +
    /* Large Commonwealth star */
    `<polygon points="6,13 6.9,15.2 9.1,15.2 7.3,16.6 8,18.8 6,17.4 4,18.8 4.7,16.6 2.9,15.2 5.1,15.2" fill="#ffffff"/>` +
    /* Southern Cross -- few stars */
    `<circle cx="20" cy="7" r=".7" fill="#ffffff"/>` +
    `<circle cx="23" cy="11" r=".7" fill="#ffffff"/>` +
    `<circle cx="20.5" cy="14" r=".7" fill="#ffffff"/>` +
    `<circle cx="25" cy="6" r=".6" fill="#ffffff"/>` +
    `<circle cx="26" cy="13" r=".5" fill="#ffffff"/>`,
  );
}

/** Israel -- white with blue stripes and hexagram. */
function flagIL(): string {
  return wrap(
    `<rect width="30" height="20" fill="#ffffff"/>` +
    `<rect y="2" width="30" height="2" fill="#0038b8"/>` +
    `<rect y="16" width="30" height="2" fill="#0038b8"/>` +
    `<polygon points="15,6.5 17.2,10.5 13,10.5" fill="none" stroke="#0038b8" stroke-width=".7"/>` +
    `<polygon points="15,13.5 17.2,9.5 13,9.5" fill="none" stroke="#0038b8" stroke-width=".7"/>`,
  );
}

/** Italy -- green/white/red vertical tricolour. */
function flagIT(): string {
  return vertical('#008c45', '#ffffff', '#cd212a');
}

// ---------------------------------------------------------------------------
// Lookup & public helpers
// ---------------------------------------------------------------------------

/**
 * Map of ISO-ish country code to SVG-builder function.  Every code used
 * in `src/data/teams.ts` must have a corresponding entry here.
 */
const FLAGS: Record<string, () => string> = {
  ES: flagES, EN: flagEN, PT: flagPT, DE: flagDE, FR: flagFR,
  BR: flagBR, US: flagUS, CA: flagCA, UA: flagUA, PL: flagPL,
  JP: flagJP, CN: flagCN, AD: flagAD, FK: flagFK, AR: flagAR,
  CO: flagCO, CL: flagCL, NL: flagNL, HR: flagHR, TR: flagTR,
  SE: flagSE, KR: flagKR, EG: flagEG, UY: flagUY, AU: flagAU,
  IL: flagIL, IT: flagIT,
};

/**
 * Fallback flag used when a country code has no registered generator.
 * A neutral gradient so it still renders something recognisably "flag-like".
 */
function flagFallback(): string {
  return wrap(
    `<rect width="30" height="20" fill="#546e7a"/>` +
    `<rect width="30" height="6.67" fill="#78909c"/>` +
    `<rect width="30" height="6.67" y="13.33" fill="#37474f"/>`,
  );
}

// In-memory cache so repeated calls for the same code are free.
const _svgCache: Record<string, string> = {};
const _uriCache: Record<string, string> = {};

/**
 * Get the raw SVG markup for a country flag.
 *
 * @param code - Two-letter country code (case-insensitive)
 * @returns A complete SVG string; a neutral fallback if the code is unknown
 */
export function flagSvg(code: string | undefined | null): string {
  const key = (code || '').toUpperCase();
  if (_svgCache[key]) return _svgCache[key];
  const builder = FLAGS[key] || flagFallback;
  const svg = builder();
  _svgCache[key] = svg;
  return svg;
}

/**
 * Get a flag as an inline CSS `url(data:image/svg+xml,...)` value.
 *
 * Useful for `background-image` on team plates, team cards, and hero
 * headers where the flag must fill the container without an extra DOM node.
 *
 * @param code - Two-letter country code
 * @returns A ready-to-use CSS url() string
 */
export function flagDataUri(code: string | undefined | null): string {
  const key = (code || '').toUpperCase();
  if (_uriCache[key]) return _uriCache[key];
  const svg = flagSvg(key);
  /* encodeURIComponent gives the safest URL without base64 overhead */
  const uri = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  _uriCache[key] = uri;
  return uri;
}

/**
 * Return `true` if the code has a hand-crafted flag (vs. the fallback).
 * Mostly useful for tests and tooling.
 */
export function hasFlag(code: string | undefined | null): boolean {
  return !!FLAGS[(code || '').toUpperCase()];
}
