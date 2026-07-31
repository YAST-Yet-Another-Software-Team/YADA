export type DashboardView = 'table' | 'board';

const STORAGE_KEY = 'yada.dashboardView';

/**
 * Persistence for this one preference.
 *
 * Both directions fail quiet: `localStorage` doesn't exist during SSR, and it
 * throws outright when storage is disabled (Safari private browsing, hardened
 * settings) or over quota. A view preference is never worth an exception, and
 * the in-memory value still applies for the session either way.
 */
function readView(): DashboardView {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'board' ? 'board' : 'table';
  } catch {
    return 'table';
  }
}

function writeView(view: DashboardView) {
  try {
    localStorage.setItem(STORAGE_KEY, view);
  } catch {
    // Absent, disabled, or over quota.
  }
}

/**
 * Whether the dashboard lists trips as a table or a kanban board.
 *
 * Starts on `table` rather than the stored value for the same reason the
 * courier's online flag starts `false` — localStorage doesn't exist during SSR,
 * so the page adopts the preference after mount. Only the dashboard page reads
 * this, so it's owned directly rather than passed through context.
 */
export class DashboardViewPreference {
  #view = $state<DashboardView>('table');

  get current() {
    return this.#view;
  }

  /** Adopt the persisted preference. Safe to call more than once. */
  hydrate() {
    this.#view = readView();
  }

  set(view: DashboardView) {
    this.#view = view;
    writeView(view);
  }
}
