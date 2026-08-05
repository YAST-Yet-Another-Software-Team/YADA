/**
 * Theme selection.
 *
 * There is no stylesheet here and no list of dark overrides — the entire theme
 * is a `color-scheme` value, which the Design System's `light-dark()` tokens
 * resolve against (see `Design System/tokens/colors.css`). All this module does
 * is decide which of the three states <html> is in and remember the choice.
 *
 * `system` is the absence of an override rather than a third value, so the OS
 * setting keeps being tracked live: a user on `system` who flips their laptop
 * to dark at sunset sees the app follow without a reload.
 *
 * The same read is duplicated as an inline script in `src/app.html`, which is
 * deliberate — it has to run before first paint to avoid a flash of the wrong
 * theme, and that is earlier than any module can load. If the storage key
 * changes here it must change there too.
 */
export const THEME_KEY = 'yada.courierTheme';

export type Theme = 'system' | 'light' | 'dark';

export function isTheme(value: unknown): value is Theme {
  return value === 'system' || value === 'light' || value === 'dark';
}

/** Reflect a theme onto <html>. Safe to call before the user has ever chosen. */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;

  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.dataset.theme = theme;
  }
}

/** What the user picked last, or `system` if they never have. */
export function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return isTheme(saved) ? saved : 'system';
  } catch {
    // Private-mode Safari and locked-down embedded webviews throw on access.
    return 'system';
  }
}

/** Persist and apply in one step; storage failure must not block the change. */
export function setTheme(theme: Theme) {
  applyTheme(theme);

  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Nothing to do — the theme still applies for this session.
  }
}
