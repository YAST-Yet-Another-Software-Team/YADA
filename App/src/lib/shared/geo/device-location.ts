import { browser } from '$app/environment';

import type { LatLng } from './service-area';

export async function getCurrentDeviceLocation(): Promise<LatLng | null> {
	if (!browser || !navigator.geolocation) return null;

	return new Promise((resolve) => {
		navigator.geolocation.getCurrentPosition(
			(position) =>
				resolve({
					lat: position.coords.latitude,
					lng: position.coords.longitude
				}),
			() => resolve(null),
			{ enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
		);
	});
}

export function startDeviceLocationWatcher(options: {
	initial?: boolean;
	onUpdate: (location: LatLng) => void;
	onError?: () => void;
}) {
	if (!browser || !navigator.geolocation) {
		options.onError?.();
		return () => {};
	}

	let active = true;
	let watchId: number | null = null;

	const startWatch = () => {
		watchId = navigator.geolocation.watchPosition(
			(position) => {
				if (!active) return;
				options.onUpdate({
					lat: position.coords.latitude,
					lng: position.coords.longitude
				});
			},
			() => {
				if (!active) return;
				options.onError?.();
			},
			{ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
		);
	};

	if (options.initial !== false) {
		void getCurrentDeviceLocation().then((location) => {
			if (location && active) {
				options.onUpdate(location);
			}
		});
	}

	startWatch();

	return () => {
		active = false;
		if (watchId != null) {
			navigator.geolocation.clearWatch(watchId);
			watchId = null;
		}
	};
}