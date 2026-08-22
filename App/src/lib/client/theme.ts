/**
 * Theme selection.
 *
 * There is no stylesheet here and no list of dark overrides — the entire theme
 * is a `color-scheme` value, which the Design System's `light-dark()` tokens
 * resolve against (see `Design/tokens/colors.css`). All this module does
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
export const THEME_KEY = "yada.courierTheme";

export type Theme = "system" | "light" | "dark";

export function isTheme(value: unknown): value is Theme {
  return value === "system" || value === "light" || value === "dark";
}

/** Reflect a theme onto <html>. Safe to call before the user has ever chosen. */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;

  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.dataset.theme = theme;
  }
}

/** What the user picked last, or `system` if they never have. */
export function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return isTheme(saved) ? saved : "system";
  } catch {
    // Private-mode Safari and locked-down embedded webviews throw on access.
    return "system";
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

/**
 * `Theme` is what the user asked for; `ResolvedTheme` is what the page is
 * actually painting. CSS never needs the difference — `light-dark()` collapses
 * it — but anything drawing outside CSS does, because a canvas cannot resolve
 * `system` on its own.
 */
export type ResolvedTheme = "light" | "dark";

const DARK_QUERY = "(prefers-color-scheme: dark)";

/** Which of the two is on screen right now. Browser only. */
export function resolveTheme(): ResolvedTheme {
  const override = document.documentElement.dataset.theme;

  if (override === "light" || override === "dark") {
    return override;
  }

  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

/**
 * Call back whenever the resolved theme flips, and return an unsubscribe.
 *
 * Two sources, because a flip has two causes: the OS scheme changing under a
 * user on `system`, and the in-app picker writing `data-theme` onto <html>.
 * The second fires no event of its own, hence the observer. Both are funnelled
 * through one comparison so a change that resolves to the same value — picking
 * "Dark" while the OS was already dark — costs the caller nothing.
 */
export function watchResolvedTheme(
  onChange: (theme: ResolvedTheme) => void,
): () => void {
  let current = resolveTheme();

  const emit = () => {
    const next = resolveTheme();

    if (next === current) {
      return;
    }

    current = next;
    onChange(next);
  };

  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", emit);

  const observer = new MutationObserver(emit);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  return () => {
    media.removeEventListener("change", emit);
    observer.disconnect();
  };
}
