/**
 * helpers.ts — Pure utility functions extracted from the original index.html.
 *
 * Every function here is side-effect-free (except the plateColors cache)
 * and operates only on its arguments. No DOM access, no global state.
 *
 * Colour helpers implement WCAG-aware contrast logic so that team
 * name plates always have a dark background with readable light text.
 */

import { flagSvg } from '../assets/flags';
import { playerPortrait, type PortraitOptions } from '../assets/portraits';

/* ===== RGB Tuple Type ===== */

/** An [R, G, B] colour tuple with values in the 0-255 range */
export type RgbTuple = [number, number, number];

/** Result from plateColors(): hex strings for background and text */
export interface PlateColorResult {
  /** Hex colour for the background (always the darker colour) */
  bg: string;
  /** Hex colour for the text (always the lighter colour, contrast-adjusted) */
  txt: string;
}

/* ================================================================
   GENERAL-PURPOSE HELPERS
   ================================================================ */

/**
 * Generate a random integer in the inclusive range [a, b].
 *
 * @param a - Lower bound (inclusive)
 * @param b - Upper bound (inclusive)
 * @returns A random integer where a <= result <= b
 */
export const rand = (a: number, b: number): number =>
  Math.floor(Math.random() * (b - a + 1)) + a;

/**
 * Clamp and round a value to the range [lo, hi].
 *
 * The value is first rounded to the nearest integer, then constrained
 * to lie within the given bounds.
 *
 * @param v  - The value to clamp
 * @param lo - Minimum allowed value
 * @param hi - Maximum allowed value
 * @returns The clamped, rounded value
 */
export const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, Math.round(v)));

/**
 * Pick a random element from an array.
 *
 * @param a - A non-empty array
 * @returns A randomly selected element from the array
 */
export const pick = <T>(a: readonly T[]): T =>
  a[Math.floor(Math.random() * a.length)];

/**
 * Return a new array with elements in random order (Fisher-Yates shuffle).
 *
 * The original array is not modified.
 *
 * @param a - The array to shuffle
 * @returns A new array with the same elements in random order
 */
export const shuffle = <T>(a: readonly T[]): T[] => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

/* ================================================================
   COLOUR HELPERS — WCAG contrast-aware team name plates
   ================================================================ */

/**
 * Convert a hex colour string to an [R, G, B] tuple.
 *
 * Supports both 3-char shorthand ("#abc") and 6-char ("#aabbcc")
 * formats, with or without the leading "#".
 *
 * @param hex - A hex colour string (e.g. "#ff6b35" or "ff6b35")
 * @returns An [R, G, B] tuple with values 0-255
 */
export function hexToRgb(hex: string): RgbTuple {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/**
 * Convert individual R, G, B values to a hex colour string.
 *
 * Values are clamped to the 0-255 range and rounded.
 *
 * @param r - Red channel (0-255)
 * @param g - Green channel (0-255)
 * @param b - Blue channel (0-255)
 * @returns A hex colour string with leading "#" (e.g. "#ff6b35")
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b]
    .map(c => Math.min(255, Math.max(0, Math.round(c))).toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Calculate the relative luminance of an sRGB colour per WCAG 2.0.
 *
 * The formula linearises each channel from the sRGB gamma curve,
 * then applies the standard luminance weights (0.2126 R + 0.7152 G + 0.0722 B).
 *
 * @param r - Red channel (0-255)
 * @param g - Green channel (0-255)
 * @param b - Blue channel (0-255)
 * @returns Relative luminance in the range [0, 1]
 */
export function srgbLum(r: number, g: number, b: number): number {
  const f = (c: number): number => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/**
 * Calculate the WCAG contrast ratio between two luminance values.
 *
 * The result is always >= 1.0, with higher values indicating greater contrast.
 * WCAG AA requires 4.5:1 for normal text and 3:1 for large text.
 *
 * @param l1 - Luminance of the first colour (0-1)
 * @param l2 - Luminance of the second colour (0-1)
 * @returns Contrast ratio (>= 1.0)
 */
export function cRatio(l1: number, l2: number): number {
  const [a, b] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (a + 0.05) / (b + 0.05);
}

/**
 * Lighten an RGB colour by mixing it towards white.
 *
 * @param rgb - The [R, G, B] tuple to lighten
 * @param amt - Amount to lighten (0 = no change, 1 = pure white)
 * @returns A new lightened [R, G, B] tuple
 */
export function lightenRgb(rgb: RgbTuple, amt: number): RgbTuple {
  return rgb.map(c => Math.round(c + (255 - c) * amt)) as RgbTuple;
}

/**
 * Darken an RGB colour by scaling each channel towards zero.
 *
 * @param rgb - The [R, G, B] tuple to darken
 * @param amt - Amount to darken (0 = no change, 1 = pure black)
 * @returns A new darkened [R, G, B] tuple
 */
export function darkenRgb(rgb: RgbTuple, amt: number): RgbTuple {
  return rgb.map(c => Math.round(c * (1 - amt))) as RgbTuple;
}

/* ================================================================
   TEAM NAME PLATE COLOUR RESOLUTION
   ================================================================ */

/** Minimum WCAG contrast ratio required between plate bg and text */
const MIN_CONTRAST_RATIO = 4.2;

/** Maximum iterations for the contrast-adjustment loop */
const MAX_CONTRAST_ITERATIONS = 12;

/**
 * Internal cache for resolved plate colours.
 * Key is the concatenation of c1+c2.
 */
const _plateCache: Record<string, PlateColorResult> = {};

/**
 * Given two team colours (c1/c2), determine a dark background and
 * a light, readable text colour that meets WCAG contrast requirements.
 *
 * The darker of the two input colours becomes the background; the lighter
 * becomes the text. If the initial contrast ratio is below MIN_CONTRAST_RATIO,
 * the text is progressively lightened (or the bg darkened if text is already
 * near-white) until the target contrast is achieved.
 *
 * Results are cached so repeated calls with the same colours are instant.
 *
 * @param c1 - First hex colour (e.g. "#ad1519")
 * @param c2 - Second hex colour (e.g. "#fcdd09")
 * @returns An object with `bg` and `txt` hex colour strings
 */
export function plateColors(c1: string, c2: string): PlateColorResult {
  const key = c1 + c2;
  if (_plateCache[key]) return _plateCache[key];

  const rgb1 = hexToRgb(c1);
  const rgb2 = hexToRgb(c2);
  const l1 = srgbLum(...rgb1);
  const l2 = srgbLum(...rgb2);

  /* Darker colour becomes the background, lighter becomes the text */
  let bg: RgbTuple = l1 <= l2 ? [...rgb1] : [...rgb2];
  let txt: RgbTuple = l1 <= l2 ? [...rgb2] : [...rgb1];

  /* Iteratively adjust until contrast is sufficient */
  for (let i = 0; i < MAX_CONTRAST_ITERATIONS; i++) {
    if (cRatio(srgbLum(...txt), srgbLum(...bg)) >= MIN_CONTRAST_RATIO) break;
    if (srgbLum(...txt) > 0.85) {
      /* Text is already near-white — darken the background instead */
      bg = darkenRgb(bg, 0.2);
    } else {
      txt = lightenRgb(txt, 0.25);
    }
  }

  const res: PlateColorResult = { bg: rgbToHex(...bg), txt: rgbToHex(...txt) };
  _plateCache[key] = res;
  return res;
}

/**
 * Clear the plate colour cache.
 *
 * Useful in tests or if team colours change dynamically.
 */
export function clearPlateCache(): void {
  for (const key of Object.keys(_plateCache)) {
    delete _plateCache[key];
  }
}

/* ================================================================
   HTML GENERATION HELPERS
   ================================================================ */

/**
 * Generate an Elifoot-style team name plate as an HTML string.
 *
 * The plate has a dark background (derived from c1/c2) with readable
 * light text, plus an inline country flag glyph rendered to the left
 * of the team name.  Uses the `team-plate` CSS class (or
 * `team-plate-sm` for the compact variant).
 *
 * @param c1      - First team colour (hex)
 * @param c2      - Second team colour (hex)
 * @param name    - Team name to display
 * @param sm      - If true, use the smaller "team-plate-sm" variant
 * @param country - Optional country code for the leading flag glyph
 * @returns An HTML `<span>` string with inline background/color styles
 */
export function teamPlate(
  c1: string,
  c2: string,
  name: string,
  sm?: boolean,
  country?: string,
): string {
  const { bg, txt } = plateColors(c1, c2);
  const cls = sm ? 'team-plate team-plate-sm' : 'team-plate';
  const flag = country
    ? `<span class="team-plate-flag" aria-hidden="true">${flagSvg(country)}</span>`
    : '';
  return `<span class="${cls}" style="background:${bg};color:${txt}">${flag}<span class="team-plate-name">${name.toUpperCase()}</span></span>`;
}

/**
 * Generate a legacy two-tone flag as an HTML string.
 *
 * Kept for backward compatibility; superseded by `teamFlag()` below
 * which returns a proper country flag SVG.
 *
 * @param c1 - Left half colour (hex)
 * @param c2 - Right half colour (hex)
 * @returns An HTML `<span>` string representing a small bi-colour flag
 */
export function makeFlag(c1: string, c2: string): string {
  return `<span class="flag"><span class="fh" style="background:${c1}"></span><span class="fh" style="background:${c2}"></span></span>`;
}

/**
 * Generate a stand-alone country flag glyph (rounded corners, 3:2 aspect).
 *
 * Used in team profile headers, the team picker, and any other place
 * where the flag should appear separately from the team name.
 *
 * @param country - Two-letter country code (ES, EN, PT, ...)
 * @param extra   - Optional extra CSS classes to apply
 * @returns An HTML `<span>` wrapping the inline flag SVG
 */
export function teamFlag(country: string | undefined | null, extra?: string): string {
  const cls = extra ? `country-flag ${extra}` : 'country-flag';
  return `<span class="${cls}" aria-hidden="true">${flagSvg(country)}</span>`;
}

/**
 * A minimal team-like object with the fields needed for label generation.
 * Avoids importing the full Team type for simple labelling functions.
 */
export interface TeamLike {
  c1: string;
  c2: string;
  name: string;
  /** Optional country code; when provided, a flag is prepended. */
  country?: string;
}

/**
 * Generate a full-size team name plate from a team object.
 *
 * @param t - A team (or any object with c1, c2, name, country)
 * @returns An HTML team plate string with an inline flag glyph
 */
export function teamLabel(t: TeamLike): string {
  return teamPlate(t.c1, t.c2, t.name, false, t.country);
}

/**
 * Generate a compact (small) team name plate from a team object.
 *
 * @param t - A team (or any object with c1, c2, name, country)
 * @returns An HTML team plate string (small variant) with inline flag
 */
export function teamLabelSm(t: TeamLike): string {
  return teamPlate(t.c1, t.c2, t.name, true, t.country);
}

/* ================================================================
   PLAYER PORTRAIT HELPERS
   ================================================================ */

/**
 * Generate a procedural player portrait HTML fragment.
 *
 * Wraps the SVG portrait in a sized `<span>` with the `player-portrait`
 * class so CSS can style the frame, aspect ratio, and border.  The
 * portrait is deterministic -- repeated calls with the same inputs
 * return the same visual.
 *
 * @param seed - Any unique player identifier (usually `player.name`)
 * @param opts - Optional rendering options (team colours, size, variant)
 * @returns An HTML `<span>` containing the inline SVG portrait
 */
export function playerAvatar(seed: string, opts: PortraitOptions = {}): string {
  const svg = playerPortrait(seed, opts);
  const size = opts.size ? ` style="width:${opts.size}px;height:${opts.size}px"` : '';
  return `<span class="player-portrait" aria-hidden="true"${size}>${svg}</span>`;
}
