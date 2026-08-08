/**
 * Keeping more than one thing in view.
 *
 * A delivery has two parties and the map has one camera, so the question the
 * tracking screens actually ask is "are they both still on screen?" — not
 * "where is the rider?". Locking the camera onto one of them guarantees the
 * other is off it: at zoom 16 the viewport is roughly 500 m, and a rider on
 * their way to a counter is routinely a couple of kilometres out.
 *
 * The maths lives here, apart from the Maps SDK, because it is the part worth
 * testing and the SDK cannot be loaded in a test. `MapBackdrop` owns the
 * camera; this module only answers questions about points and boxes.
 */

import type { LatLng } from '$lib/utils/types';

/** The same shape `getZoneBounds` returns, so the two are interchangeable. */
export type Bounds = { south: number; west: number; north: number; east: number };

/**
 * How long a party may sit off-screen before the camera goes back for them.
 *
 * Long enough that a rider clipping the edge of the viewport at a junction is
 * not chased, short enough that someone who has genuinely left the frame is
 * not lost. It is a grace period for drift — the first fit, when the screen
 * has never framed anything, is immediate.
 */
export const AUTO_FIT_DELAY_MS = 5000;

/**
 * The tightest the camera may frame two parties.
 *
 * Without a cap, two markers on the same street fit to a viewport a few metres
 * wide, which is a street-level close-up nobody asked for. Google's
 * `fitBounds` has no `maxZoom` option, so this is clamped after the fact.
 */
export const FIT_MAX_ZOOM = 17;

/** Breathing room, so a marker never sits under the edge of the map. */
export const FIT_PADDING_PX = 48;

/** The smallest box containing every point, or null if there are none. */
export function boundsOf(points: LatLng[]): Bounds | null {
	if (points.length === 0) return null;

	let { lat: south, lng: west } = points[0];
	let { lat: north, lng: east } = points[0];

	for (const point of points) {
		south = Math.min(south, point.lat);
		north = Math.max(north, point.lat);
		west = Math.min(west, point.lng);
		east = Math.max(east, point.lng);
	}

	return { south, west, north, east };
}

/**
 * Whether every point is inside the box.
 *
 * Inclusive on the edges: a marker exactly on the boundary is on screen, and
 * treating it as off would re-fit a camera that had just finished fitting.
 *
 * No antimeridian handling, deliberately — YADA operates around Kumasi, and
 * pretending to a generality the service does not have would only be a wrong
 * answer nobody could reach.
 */
export function containsAll(bounds: Bounds | null, points: LatLng[]): boolean {
	if (!bounds) return false;

	return points.every(
		(point) =>
			point.lat >= bounds.south &&
			point.lat <= bounds.north &&
			point.lng >= bounds.west &&
			point.lng <= bounds.east
	);
}
