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
  /** Paths owned by this tab; a nested path (`…/edit`) counts as a match. */
  match: string[];
  icon: 'home' | 'orders' | 'trips' | 'settings';
};

export const COURIER_TABS: CourierTab[] = [
  { href: '/courier/home', label: 'Home', match: ['/courier/home'], icon: 'home' },
  {
    href: '/courier/orders',
    label: 'Orders',
    match: ['/courier/orders', '/courier/pickup', '/courier/deliver'],
    icon: 'orders'
  },
  {
    href: '/courier/trips',
    label: 'Trips',
    match: ['/courier/trips', '/courier/complete'],
    icon: 'trips'
  },
  { href: '/courier/settings', label: 'Settings', match: ['/courier/settings'], icon: 'settings' }
];

function matches(path: string, prefixes: string[]) {
  return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function isTabActive(path: string, tab: CourierTab) {
  return matches(path, tab.match);
}

/** Index of the lit tab, used to position the pill. Falls back to the first. */
export function activeTabIndex(path: string) {
  return Math.max(
    0,
    COURIER_TABS.findIndex((tab) => isTabActive(path, tab))
  );
}

/** A trip in progress takes over the screen — no tab bar to navigate away with. */
export function isFocusedTrip(path: string) {
  return matches(path, ['/courier/pickup', '/courier/deliver']);
}

/** Home owns its own scrolling: the map fills the viewport behind the sheet. */
export function isHome(path: string) {
  return path === '/courier/home';
}
