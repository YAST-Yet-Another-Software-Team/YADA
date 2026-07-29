import { browser } from '$app/environment';
import { writable } from 'svelte/store';

export type DashboardView = 'table' | 'board';

const STORAGE_KEY = 'yada.dashboardView';

function createDashboardViewStore() {
	// Always start with table to avoid SSR/client hydration mismatch.
	const { subscribe, set } = writable<DashboardView>('table');

	return {
		subscribe,
		hydrate() {
			if (!browser) return;
			const stored = localStorage.getItem(STORAGE_KEY);
			set(stored === 'board' ? 'board' : 'table');
		},
		set(view: DashboardView) {
			if (browser) localStorage.setItem(STORAGE_KEY, view);
			set(view);
		}
	};
}

export const dashboardView = createDashboardViewStore();
