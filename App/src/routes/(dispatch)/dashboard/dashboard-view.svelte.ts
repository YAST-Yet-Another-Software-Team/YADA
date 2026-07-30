import { readStored, writeStored } from '$lib/shared/local-storage';

export type DashboardView = 'table' | 'board';

const STORAGE_KEY = 'yada.dashboardView';

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
    this.#view = readStored(STORAGE_KEY) === 'board' ? 'board' : 'table';
  }

  set(view: DashboardView) {
    this.#view = view;
    writeStored(STORAGE_KEY, view);
  }
}
