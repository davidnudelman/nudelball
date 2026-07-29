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

/* ================================================================
   MODALS & TOASTS
   ================================================================ */

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  severity?: 'info' | 'warning' | 'danger';
}

export interface PromptDialogOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  placeholder?: string;
  initialValue?: string;
}

/**
 * Show a floating toast notification.
 */
export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info', durationMs = 2200): void {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));

  const cleanup = (): void => {
    toast.classList.remove('show');
    window.setTimeout(() => {
      if (toast.parentElement) toast.parentElement.removeChild(toast);
    }, 200);
  };

  window.setTimeout(cleanup, durationMs);
}

/**
 * Show a modal confirm dialog.
 */
export function showConfirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'overlay app-dialog-overlay';
    overlay.style.display = 'flex';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const severityClass = options.severity ? ` is-${options.severity}` : '';
    overlay.innerHTML =
      `<div class="overlay-content app-dialog${severityClass}">` +
      `<div class="app-dialog-title">${escapeHtml(options.title)}</div>` +
      `<div class="app-dialog-message">${escapeHtml(options.message)}</div>` +
      `<div class="app-dialog-actions">` +
      `<button class="btn btn-secondary app-dialog-cancel">${escapeHtml(options.cancelLabel)}</button>` +
      `<button class="btn btn-accent app-dialog-confirm">${escapeHtml(options.confirmLabel)}</button>` +
      `</div>` +
      `</div>`;

    const confirmBtn = overlay.querySelector('.app-dialog-confirm') as HTMLButtonElement | null;
    const cancelBtn = overlay.querySelector('.app-dialog-cancel') as HTMLButtonElement | null;
    const close = (value: boolean): void => {
      if (overlay.parentElement) overlay.parentElement.removeChild(overlay);
      resolve(value);
    };

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close(false);
    });
    overlay.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close(false);
    });
    confirmBtn?.addEventListener('click', () => close(true));
    cancelBtn?.addEventListener('click', () => close(false));

    document.body.appendChild(overlay);
    confirmBtn?.focus();
  });
}

/**
 * Show a modal prompt dialog with text input.
 */
export function showPromptDialog(options: PromptDialogOptions): Promise<string | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'overlay app-dialog-overlay';
    overlay.style.display = 'flex';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    overlay.innerHTML =
      `<div class="overlay-content app-dialog">` +
      `<div class="app-dialog-title">${escapeHtml(options.title)}</div>` +
      `<div class="app-dialog-message">${escapeHtml(options.message)}</div>` +
      `<input class="app-dialog-input" type="text" maxlength="40" placeholder="${escapeHtml(options.placeholder || '')}" value="${escapeHtml(options.initialValue || '')}" />` +
      `<div class="app-dialog-actions">` +
      `<button class="btn btn-secondary app-dialog-cancel">${escapeHtml(options.cancelLabel)}</button>` +
      `<button class="btn btn-accent app-dialog-confirm">${escapeHtml(options.confirmLabel)}</button>` +
      `</div>` +
      `</div>`;

    const confirmBtn = overlay.querySelector('.app-dialog-confirm') as HTMLButtonElement | null;
    const cancelBtn = overlay.querySelector('.app-dialog-cancel') as HTMLButtonElement | null;
    const input = overlay.querySelector('.app-dialog-input') as HTMLInputElement | null;
    const close = (value: string | null): void => {
      if (overlay.parentElement) overlay.parentElement.removeChild(overlay);
      resolve(value);
    };

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close(null);
    });
    overlay.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close(null);
      if (event.key === 'Enter') close((input?.value || '').trim());
    });
    confirmBtn?.addEventListener('click', () => close((input?.value || '').trim()));
    cancelBtn?.addEventListener('click', () => close(null));

    document.body.appendChild(overlay);
    input?.focus();
    input?.select();
  });
}
