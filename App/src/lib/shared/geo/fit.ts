/**
 * The zoom at which a set of points is still on screen around a fixed centre.
 *
 * `fitBounds` already answers the general version of this question, and every
 * map SDK ships one — but it answers it by moving the camera to the middle of
 * the bounds. That is the wrong answer when the centre is the point of the
 * screen: on /tracking the counter is what the search is about and what the
 * pulse radiates from, so it has to stay in the middle whatever else is being
 * kept in view. Framing pickup-and-riders together would slide the counter off
 * to whichever side the riders happened to be.
 *
 * So this computes the zoom for bounds *symmetric about the centre* — the
 * centre stays the centre by construction, and the camera only ever opens out
 * far enough to catch the furthest point.
 *
 * Kept SDK-free and in `shared` because both map builds need the same number:
 * MapLibre would otherwise use `cameraForBounds` and the Maps SDK has no
 * equivalent, and two implementations of one piece of Mercator arithmetic is
 * how the two stacks start framing differently.
 */

import type { LatLng } from "$lib/utils/types";

/** Web Mercator y, normalised to 0 (north pole) … 1 (south pole). */
function mercatorY(lat: number) {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const radians = (clamped * Math.PI) / 180;

  return (1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2;
}

export type ContainOptions = {
  /** The point that must stay dead centre. */
  centre: LatLng;
  /** Everything that should be on screen with it. */
  points: readonly LatLng[];
  /** The map's pixel size. */
  widthPx: number;
  heightPx: number;
  /** Breathing room at every edge, so a point never lands on the border. */
  paddingPx: number;
  /** MapLibre and the Maps SDK both work in 512px tiles at these zooms. */
  tileSize?: number;
};

/**
 * The widest-in (largest) zoom that still holds every point, or `null` when
 * there is nothing to hold.
 *
 * `null` rather than a fallback number: "no riders to keep in view" is not the
 * same question as "keep them in view at zoom 15", and a caller that clamps
 * against this should be able to tell the difference and leave its own zoom
 * alone. A point sitting exactly on the centre also returns `null` — it is on
 * screen at every zoom, so it constrains nothing.
 */
export function zoomToContain({
  centre,
  points,
  widthPx,
  heightPx,
  paddingPx,
  tileSize = 512,
}: ContainOptions): number | null {
  const halfWidth = widthPx / 2 - paddingPx;
  const halfHeight = heightPx / 2 - paddingPx;

  // A map too small to hold anything once padded. Answering with a zoom here
  // would be answering a question the viewport cannot ask.
  if (!(halfWidth > 0) || !(halfHeight > 0)) return null;

  const centreY = mercatorY(centre.lat);
  let worldPx = Infinity;

  for (const point of points) {
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) continue;

    // Longitude is linear in Mercator; latitude is not, which is why the two
    // axes are measured in different units and reconciled through `worldPx`.
    const spanX = Math.abs(point.lng - centre.lng) / 360;
    const spanY = Math.abs(mercatorY(point.lat) - centreY);

    // Symmetric bounds: the far side of the centre has to fit too, so the
    // half-viewport is what each span is allowed to fill.
    if (spanX > 0) worldPx = Math.min(worldPx, halfWidth / spanX);
    if (spanY > 0) worldPx = Math.min(worldPx, halfHeight / spanY);
  }

  if (!Number.isFinite(worldPx)) return null;

  return Math.log2(worldPx / tileSize);
}
