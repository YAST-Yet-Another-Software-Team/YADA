/**
 * Where each courier screen sits in the workspace.
 *
 * The layout and the tab bar both need to reason about the current pathname —
 * the layout to decide which chrome to render, the tab bar to decide which tab
 * is lit. Keeping both sets of predicates here stops the two files from
 * disagreeing about what counts as, say, a focused trip screen.
 */

export type CourierTab = {
  href: string;
  label: string;
  /**
   * What the title bar calls this screen. Separate from `label`, which has to
   * fit under a 20px glyph in the tab bar — "Settings" there, the fuller
   * "Profile & Settings" at the top of the screen itself.
   */
  title: string;
  /** Paths owned by this tab; a nested path (`…/profile`) counts as a match. */
  match: string[];
  icon: "home" | "orders" | "trips" | "settings";
};

/**
 * Four destinations, all reachable at the bottom of the screen: the courier app
 * is held one-handed while riding, so navigation belongs under the thumb. The
 * bar at the top of these screens names them; it never navigates.
 *
 * The account lives inside Settings rather than in a tab of its own — it was a
 * name, a phone number and a link to the edit form, which is the same material
 * the settings rows are made of, and a fifth tab for it made every other tab
 * narrower.
 */
export const COURIER_TABS: CourierTab[] = [
  {
    href: "/home",
    label: "Home",
    title: "Home",
    match: ["/home"],
    icon: "home",
  },
  {
    href: "/orders",
    label: "Orders",
    title: "Orders",
    match: ["/orders", "/pickup", "/deliver"],
    icon: "orders",
  },
  {
    href: "/trips",
    label: "Trips",
    title: "Trips",
    match: ["/trips", "/complete"],
    icon: "trips",
  },
  {
    href: "/settings",
    label: "Settings",
    title: "Profile & Settings",
    match: ["/settings"],
    icon: "settings",
  },
];

function matches(path: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function isTabActive(path: string, tab: CourierTab) {
  return matches(path, tab.match);
}

/** Index of the lit tab, used to position the pill. Falls back to the first. */
export function activeTabIndex(path: string) {
  return Math.max(
    0,
    COURIER_TABS.findIndex((tab) => isTabActive(path, tab)),
  );
}

/** A trip in progress takes over the screen — no tab bar to navigate away with. */
export function isFocusedTrip(path: string) {
  return matches(path, ["/pickup", "/deliver"]);
}

/** Home owns its own scrolling: the map fills the viewport behind the sheet. */
export function isHome(path: string) {
  return path === "/home";
}

/**
 * The title bar for a screen, or null where the screen owns its own chrome.
 *
 * Home is a map from the top edge down, so a bar there would cost a strip of it
 * to say a word the lit tab already says. The focused trip screens are the same
 * kind of surface. Settings subpages draw their own back-arrow header, and the
 * exact-match here is what keeps them from getting two.
 */
export function headerTitleFor(path: string): string | null {
  if (path === "/home") return null;

  return COURIER_TABS.find((tab) => tab.href === path)?.title ?? null;
}
