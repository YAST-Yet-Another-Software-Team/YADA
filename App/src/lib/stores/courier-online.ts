import { browser } from '$app/environment';
import { writable } from 'svelte/store';

const STORAGE_KEY = 'yada.courierOnline';

function createCourierOnlineStore() {
	const { subscribe, set } = writable(false);

	return {
		subscribe,
		hydrate() {
			if (!browser) return;
			set(localStorage.getItem(STORAGE_KEY) === 'true');
		},
		setOnline(value: boolean) {
			if (browser) localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
			set(value);
		},
		goOnline() {
			this.setOnline(true);
		},
		goOffline() {
			this.setOnline(false);
		}
	};
}

export const courierOnline = createCourierOnlineStore();
