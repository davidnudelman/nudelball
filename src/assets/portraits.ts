/**
 * portraits.ts -- Procedural player portrait generator.
 *
 * Builds a lightweight, deterministic SVG "identicon" portrait of a
 * football player based on a hash of their name (and optionally their
 * country/position).  No external assets are needed -- each portrait is
 * a small SVG composed of:
 *
 *   1. A coloured background plate (team-tinted when supplied)
 *   2. A rounded shoulder/jersey shape
 *   3. A head circle with a skin tone drawn from a small palette
 *   4. Hair (one of several hairstyles) in a hair colour drawn from a palette
 *   5. Simple facial features (eyes, eyebrows, mouth) for a friendly look
 *
 * Because every field is seeded from the same hash, the same player name
 * always produces the exact same portrait -- so a player's face stays
 * consistent across the squad list, profile page, market cards, and
 * historical match reports.
 */

// ---------------------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------------------

/** Skin tone palette -- ordered light to dark. */
const SKIN_TONES: readonly string[] = [
  '#f5d6b5', '#f0c199', '#e6a87a', '#c8865f', '#9b6340', '#6e3f21',
];

/** Hair colour palette. */
const HAIR_COLORS: readonly string[] = [
  '#1e1e1e', '#3d2a18', '#5b3a1a', '#7a4e1c', '#9a6a1a', '#c28a1c',
  '#8b4513', '#2e1a0a', '#d4a017', '#4a4a4a',
];

/** Jersey accent tints used when no team colours are provided. */
const JERSEY_DEFAULTS: readonly string[] = [
  '#1f6feb', '#dc2626', '#16a34a', '#f59e0b', '#7c3aed', '#0ea5e9',
];

// ---------------------------------------------------------------------------
// Deterministic hash
// ---------------------------------------------------------------------------

/**
 * A tiny string hash (FNV-1a variant).  Good enough for seeding
 * a portrait -- never used for security.
 *
 * @param s - Input string to hash
 * @returns An unsigned 32-bit integer
 */
function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

/**
 * Pull a "random" byte (0-255) out of a 32-bit hash at position `slot`.
 * Different slots yield independent-looking values from the same seed.
 */
function slot(h: number, idx: number): number {
  /* Mix the slot index into the hash so successive slots aren't correlated */
  let x = (h ^ (idx * 0x9e3779b1)) >>> 0;
  x = ((x ^ (x >>> 16)) * 0x85ebca6b) >>> 0;
  x = ((x ^ (x >>> 13)) * 0xc2b2ae35) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  return x & 0xff;
}

// ---------------------------------------------------------------------------
// Hairstyles
// ---------------------------------------------------------------------------

/**
 * Build a single hairstyle SVG fragment.
 *
 * @param style - Hairstyle index (0..5)
 * @param color - Hair colour hex
 * @returns SVG markup for the hair layer
 */
function hairSvg(style: number, color: string): string {
  switch (style % 6) {
    case 0:
      /* Short crop -- a rounded cap above the head. */
      return `<path d="M12 18 Q18 8 32 10 Q46 8 52 18 L52 24 L12 24 Z" fill="${color}"/>`;
    case 1:
      /* Buzz cut -- thin outline on top of the head. */
      return `<path d="M14 20 Q32 10 50 20 L50 23 L14 23 Z" fill="${color}"/>`;
    case 2:
      /* Side parting -- curved sweep across the forehead. */
      return `<path d="M13 22 Q20 8 34 10 Q50 12 52 22 L46 22 Q42 18 30 18 Q22 19 20 22 Z" fill="${color}"/>`;
    case 3:
      /* Afro -- fluffy rounded halo. */
      return `<ellipse cx="32" cy="18" rx="22" ry="12" fill="${color}"/>`;
    case 4:
      /* Long hair -- drops slightly past the jaw on both sides. */
      return `<path d="M12 18 Q18 6 32 8 Q46 6 52 18 L52 38 Q48 32 48 22 L48 20 L16 20 L16 22 Q16 32 12 38 Z" fill="${color}"/>`;
    case 5:
    default:
      /* Bald stripe / receding -- just small tufts on the sides. */
      return `<path d="M12 22 Q16 16 20 18 L20 22 Z M52 22 Q48 16 44 18 L44 22 Z" fill="${color}"/>`;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface PortraitOptions {
  /** Optional primary team colour for the jersey/background plate. */
  c1?: string;
  /** Optional secondary team colour for jersey trim. */
  c2?: string;
  /** Optional size in px (defaults to raw SVG for CSS-controlled sizing). */
  size?: number;
  /** If true, render a transparent background (useful for lists). */
  transparent?: boolean;
}

/**
 * Generate a procedural player portrait as an SVG string.
 *
 * The portrait is deterministic -- same seed always yields the same face.
 * The SVG is 64x64 and is best displayed at 32-64 CSS px.  Callers that
 * need a bigger image should scale via CSS/width attribute; vectors stay
 * crisp at any size.
 *
 * @param seed - Arbitrary seed string (typically the player's name)
 * @param opts - Optional rendering options (team colours, size)
 * @returns A complete SVG document string
 */
export function playerPortrait(seed: string, opts: PortraitOptions = {}): string {
  const h = hash32(seed || 'anon');

  /* Deterministic picks from each palette */
  const skin = SKIN_TONES[slot(h, 1) % SKIN_TONES.length];
  const hair = HAIR_COLORS[slot(h, 2) % HAIR_COLORS.length];
  const hairstyle = slot(h, 3) % 6;

  /* Jersey colour falls back to a consistent palette when no team info */
  const jerseyMain = opts.c1 || JERSEY_DEFAULTS[slot(h, 4) % JERSEY_DEFAULTS.length];
  const jerseyTrim = opts.c2 || '#ffffff';

  /* Subtle background plate (team-tinted or a slate default) */
  const bg = opts.transparent
    ? 'none'
    : (opts.c1
        ? shade(opts.c1, -0.35)
        : '#1b2430');

  const size = opts.size ? ` width="${opts.size}" height="${opts.size}"` : '';

  /* Facial feature offsets (slightly jittered so every face is unique) */
  const eyeOffset = (slot(h, 5) % 3) - 1;      /* -1..+1 horizontal nudge */
  const browTilt  = (slot(h, 6) % 3) - 1;      /* -1..+1 brow angle */
  const mouthCurv = (slot(h, 7) % 3);          /* 0=neutral, 1=smile, 2=slight frown */

  const mouthPath = mouthCurv === 1
    ? 'M26 46 Q32 50 38 46'
    : mouthCurv === 2
      ? 'M26 47 Q32 44 38 47'
      : 'M26 46 L38 46';

  /* Background + jersey shoulders */
  const bgRect = bg === 'none'
    ? ''
    : `<rect width="64" height="64" fill="${bg}"/>`;

  const jersey =
    `<path d="M6 64 Q6 50 22 46 L42 46 Q58 50 58 64 Z" fill="${jerseyMain}"/>` +
    `<path d="M24 46 Q32 52 40 46 L40 50 Q32 55 24 50 Z" fill="${jerseyTrim}" opacity=".9"/>`;

  /* Head and neck */
  const neck = `<rect x="28" y="40" width="8" height="8" fill="${shade(skin, -0.1)}"/>`;
  const head = `<circle cx="32" cy="28" r="14" fill="${skin}"/>`;

  /* Hair */
  const hairLayer = hairSvg(hairstyle, hair);

  /* Facial features */
  const eyes =
    `<circle cx="${27 + eyeOffset}" cy="30" r="1.4" fill="#1b1b1b"/>` +
    `<circle cx="${37 + eyeOffset}" cy="30" r="1.4" fill="#1b1b1b"/>`;
  const brows =
    `<rect x="24" y="${26 + browTilt}" width="6" height="1.2" fill="${hair}"/>` +
    `<rect x="34" y="${26 - browTilt}" width="6" height="1.2" fill="${hair}"/>`;
  const mouth = `<path d="${mouthPath}" stroke="#1b1b1b" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"${size}>` +
      bgRect +
      jersey +
      neck +
      head +
      hairLayer +
      brows +
      eyes +
      mouth +
    `</svg>`
  );
}

/**
 * Get a player portrait as a CSS `url(...)` string for backgrounds.
 *
 * @param seed - Player name or other identifier
 * @param opts - Rendering options (team colours, size, transparent)
 * @returns A ready-to-use CSS url() string
 */
export function playerPortraitUri(seed: string, opts: PortraitOptions = {}): string {
  const svg = playerPortrait(seed, opts);
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

// ---------------------------------------------------------------------------
// Colour helper (kept local to avoid an extra import)
// ---------------------------------------------------------------------------

/**
 * Lighten (positive amt) or darken (negative amt) a hex colour by mixing
 * towards white or black.  Used for the head shadow and background plate.
 *
 * @param hex - Hex colour like "#3fb950"
 * @param amt - Amount in the range -1..+1
 * @returns A new hex colour string
 */
function shade(hex: string, amt: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3
    ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
    : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const mix = (c: number): number => {
    if (amt >= 0) return Math.round(c + (255 - c) * amt);
    return Math.round(c * (1 + amt));
  };
  const toHex = (c: number): string => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0');
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}
