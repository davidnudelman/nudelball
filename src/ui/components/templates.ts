/**
 * templates.ts — HTML template helpers for building UI fragments.
 *
 * Provides tagged template literal helpers, a card wrapper,
 * stat badges, and HTML escaping for safe string interpolation.
 */

/* ================================================================
   HTML ESCAPING
   ================================================================ */

/** Map of characters that must be escaped in HTML content */
const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escape a string for safe insertion into HTML.
 *
 * Replaces &, <, >, ", and ' with their HTML entity equivalents.
 *
 * @param str - The raw string to escape
 * @returns The HTML-safe escaped string
 */
export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, ch => ESCAPE_MAP[ch] || ch);
}

/* ================================================================
   TAGGED TEMPLATE LITERAL — html``
   ================================================================ */

/**
 * Tagged template literal for HTML strings.
 *
 * Automatically escapes interpolated string values to prevent XSS,
 * while passing numbers and booleans through unchanged. Values that
 * are already marked as "safe" (via `rawHtml()`) are not re-escaped.
 *
 * Usage:
 * ```ts
 * const name = '<script>alert("xss")</script>';
 * const result = html`<span>${name}</span>`;
 * // => '<span>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</span>'
 * ```
 *
 * @param strings - The static template string parts
 * @param values  - The interpolated values
 * @returns A concatenated HTML string with escaped interpolations
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  let result = '';
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i < values.length) {
      const val = values[i];
      if (val === null || val === undefined) {
        result += '';
      } else if (val instanceof SafeHtml) {
        /* Already marked safe — insert without escaping */
        result += val.toString();
      } else if (typeof val === 'number' || typeof val === 'boolean') {
        result += String(val);
      } else {
        result += escapeHtml(String(val));
      }
    }
  }
  return result;
}

/**
 * Wrapper class indicating a string has already been sanitised
 * and should not be re-escaped by the `html` tag function.
 */
class SafeHtml {
  constructor(private readonly value: string) {}
  toString(): string { return this.value; }
}

/**
 * Mark an HTML string as safe so it won't be double-escaped
 * when used inside the `html` tagged template.
 *
 * @param str - A pre-sanitised HTML string
 * @returns A SafeHtml instance that passes through `html`` unchanged
 */
export function rawHtml(str: string): SafeHtml {
  return new SafeHtml(str);
}

/* ================================================================
   CARD WRAPPER
   ================================================================ */

/**
 * Wrap content in a standard card container.
 *
 * Generates a `<div class="card">` wrapper with an optional title bar.
 *
 * @param title   - Card title text (displayed in a `.card-title` div)
 * @param content - HTML content to place inside the card body
 * @param extra   - Optional extra CSS classes to add to the card div
 * @returns An HTML string for the card
 */
export function card(title: string, content: string, extra?: string): string {
  const cls = extra ? `card ${extra}` : 'card';
  const titleHtml = title
    ? `<div class="card-title">${title}</div>`
    : '';
  return `<div class="${cls}">${titleHtml}${content}</div>`;
}

/* ================================================================
   STAT BADGE
   ================================================================ */

/**
 * Generate a compact stat badge for dashboards and profile pages.
 *
 * Renders a small labelled value box using the `.stat-badge` CSS class.
 *
 * @param label - The label text (e.g. "Goals", "Age")
 * @param value - The value to display (number or string)
 * @param color - Optional CSS colour for the value text
 * @returns An HTML string for the stat badge
 */
export function statBadge(label: string, value: string | number, color?: string): string {
  const style = color ? ` style="color:${color}"` : '';
  return `<div class="stat-badge"><span class="sb-value"${style}>${value}</span><span class="sb-label">${label}</span></div>`;
}
