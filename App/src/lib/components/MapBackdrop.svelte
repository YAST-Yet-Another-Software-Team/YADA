<script module lang="ts">
  import type { Component } from 'svelte';
  import RacingHelmetIcon from '~icons/mdi/racing-helmet';
  import ShopIcon from '~icons/solar/shop-bold';

  /**
   * There is no `pickup`. Every map now names the origin of a delivery for what
   * it is — the business — so the counter is one glyph across the dashboard,
   * tracking, the request form and the rider's screens, rather than a red pin
   * here and a shopfront there.
   */
  type MapMarkerRole = 'dropoff' | 'rider' | 'business' | 'search';

  type MapMarker = {
    id: string;
    lat: number;
    lng: number;
    label?: string;
    role?: MapMarkerRole;
    accent?: boolean;
    stale?: boolean;
    /**
     * Rings expanding out of this marker — "something is happening here, and
     * you are waiting on it". The one state that earns it is a business whose
     * request is still ringing riders; a marker that pulses for no reason is
     * just motion in the corner of a rider's eye.
     */
    pulse?: boolean;
    /**
     * How far the pulse throws, as a multiple of the glyph's own size.
     *
     * Not a distance. The rings say "the search has widened" and nothing more
     * precise — see `ringReach` in $lib/shared/dispatch for why the radius in
     * metres is deliberately not what drives this. A caller that only wants a
     * pulse leaves it alone and gets the default.
     */
    pulseScale?: number;
    /**
     * Which way this party is travelling, 0–360° clockwise from north.
     *
     * Only a rider has one — a counter does not face anywhere — and only while
     * they are moving. `null` while it is unknown, which draws no pointer at
     * all: a marker aimed at north because nothing better was known would be a
     * confident lie about the one thing it is there to say.
     */
    heading?: number | null;
  };

  /**
   * The two roles that are a *who* rather than a *where*. Dropoff and search
   * are points on a route and stay as dropped pins; a courier and a business
   * are parties, so they get a glyph that says which one you're looking at
   * without reading the tooltip.
   */
  const ROLE_ICONS: Partial<Record<MapMarkerRole, Component>> = {
    rider: RacingHelmetIcon,
    business: ShopIcon
  };

  /**
   * Glyph size in pixels, per role. A touch larger than the disc these
   * replaced, because a bare shape has no ring around it to catch the eye.
   */
  const ROLE_ICON_PX: Partial<Record<MapMarkerRole, number>> = {
    rider: 26,
    business: 24
  };

  /** The roles that can be facing somewhere. A shopfront cannot. */
  const ROLE_HAS_HEADING: Partial<Record<MapMarkerRole, boolean>> = {
    rider: true
  };

  /** The throw a pulsing marker gets when its caller doesn't ask for one. */
  const DEFAULT_PULSE_SCALE = 3.4;

  /**
   * The pulse throw for a marker, floored at the default.
   *
   * Floored rather than trusted outright: a scale under 1 would animate the
   * ring *inward*, and a caller computing this from a ring index that hasn't
   * arrived yet would otherwise get a marker that looks broken rather than one
   * that looks new.
   */
  function pulseScaleOf(marker: MapMarker) {
    return Math.max(DEFAULT_PULSE_SCALE, marker.pulseScale ?? DEFAULT_PULSE_SCALE);
  }

  /**
   * How far the direction pointer's tip sits from the centre of the glyph it
   * orbits, in pixels.
   *
   * Has to clear half the glyph (13px of a 26px helmet) *plus* the pointer's
   * own height, or the wedge laps over the helmet at east and west — where the
   * icon is widest — while looking fine at north and south. 24 leaves a couple
   * of pixels of air all the way round.
   */
  const POINTER_ORBIT_PX = 24;

  /** Pointer size — small enough to be a hint, big enough to have a direction. */
  const POINTER_W = 11;
  const POINTER_H = 9;
</script>

<script lang="ts">
  /**
   * The map pane, on MapLibre GL JS with OpenStreetMap tiles.
   *
   * The props contract is deliberately identical to the Google implementation
   * this replaces — a dozen call sites depend on it, and preserving it is what
   * made the swap a single-file change. `polylinePath` stays `$bindable` for the
   * same reason, even though nothing here writes back to it.
   *
   * MapLibre differs from the Google SDK in two ways that shape the code below.
   * It is a module import rather than a script the page loads at runtime, so
   * there is no loader and no API key — but it must be imported dynamically,
   * because it touches `window` at module scope and would break SSR. And it has
   * no marker/polyline objects with a `map` property: markers are DOM elements
   * attached to the map, and a line is a GeoJSON source with a layer over it,
   * which is why the route is updated by calling `setData` rather than by
   * tearing down and rebuilding.
   */
  import { mount, onDestroy, onMount, unmount, type Snippet } from 'svelte';
  import type { GeoJSONSource, LngLatLike, Map as MapLibreMap, Marker } from 'maplibre-gl';
  // Imported rather than reached for as the global `GeoJSON` namespace: the
  // types come in transitively via maplibre-gl, so whether that global is in
  // scope depends on which tsconfig is asking — svelte-check resolves it, an
  // editor's own TS server need not.
  import type { Feature, LineString } from 'geojson';
  import { getMapsConfig } from '$lib/client/maps/maps-config.svelte';
  import { zoomToContain } from '$lib/shared/geo/fit';
  import { KUMASI_CENTER, KUMASI_DEFAULT_ZOOM } from '$lib/shared/geo/service-area';
  import {
    AUTO_FIT_DELAY_MS,
    boundsOf,
    containsAll,
    FIT_MAX_ZOOM,
    FIT_PADDING_PX,
    type Bounds
  } from '$lib/shared/geo/framing';
  import type { LatLng } from '$lib/utils/types';
  import { MAP_COLORS, MAP_ROLE_COLORS, MAP_SURFACE } from '$lib/styles/map-colors';
  import IconRecentre from '~icons/mdi/crosshairs-gps';

  let {
    routeLabel = false,
    interactive = false,
    locationUnavailable = false,
    fitIds = [],
    markers = [],
    polylinePath = $bindable([]),
    hintPath = [],
    center = null,
    zoom = null,
    contain = [],
    children,
    onpick
  }: {
    routeLabel?: boolean;
    interactive?: boolean;
    locationUnavailable?: boolean;
    /**
     * Marker ids that must stay on screen together.
     *
     * This replaced a `followId` that centred the camera on one marker and
     * forced the zoom in to 16 on every update. A delivery has two parties, so
     * following one of them guaranteed the other was off screen — and the
     * forced zoom undid the viewer's own zoom about once a second, which read
     * as the map reloading. Framing is the honest version of what that prop
     * was reaching for.
     */
    fitIds?: string[];
    markers?: MapMarker[];
    /** The routed leg, drawn solid. */
    polylinePath?: LatLng[];
    /**
     * A straight dashed line — "and then it goes over there". Deliberately not
     * a route: it costs no routing call, and drawing it as roads would claim a
     * precision about a journey nobody has started.
     */
    hintPath?: LatLng[];
    center?: LatLng | null;
    zoom?: number | null;
    /**
     * Points that must stay on screen *without* moving the camera off `center`.
     *
     * Unlike `fitIds`, which frames a set and puts the middle of that set in
     * the middle of the screen, this only ever loosens `zoom`: the centre is
     * left exactly where the caller put it and the camera opens out until the
     * furthest point is inside. `zoom` remains the tightest the camera will go,
     * so a caller whose points are already in view gets the zoom it asked for.
     *
     * Ignored while `fitIds` is set — framing already owns the camera then.
     */
    contain?: LatLng[];
    children?: Snippet;
    onpick?: (detail: { lat: number; lng: number }) => void;
  } = $props();

  const ROUTE_SOURCE = 'yada-route';
  const ROUTE_LAYER = 'yada-route-line';
  const HINT_SOURCE = 'yada-hint';
  const HINT_LAYER = 'yada-hint-line';

  let mapElement = $state<HTMLDivElement | null>(null);
  let mapState = $state<'fallback' | 'loading' | 'ready' | 'error'>('fallback');
  let map: MapLibreMap | null = null;
  let lastCenteredKey = '';

  /**
   * The zoom the camera was last *sent* to, which is not the zoom it is at: a
   * viewer who pinches afterwards owns the camera until something actually asks
   * for a different number. Comparing against the target rather than
   * `getZoom()` is what stops a rider poll that changes nothing from hauling
   * the view back every ten seconds.
   */
  let lastZoomTarget: number | null = null;

  const maps = getMapsConfig();

  /**
   * The knockout colour for marker outlines.
   *
   * Under the Google build this followed the app theme, because the basemap did
   * too — `colorScheme` handed a dark app dark cartography, and a white outline
   * against it was glare. The OSM style is a single URL with a single palette
   * and stays light whichever theme the app is in, so the outline that separates
   * a marker from the streets under it stays light with it. That is also why
   * nothing here rebuilds the map on a theme change: there is no second
   * cartography to rebuild it into.
   */
  const MARKER_KNOCKOUT = MAP_SURFACE.light;

  /**
   * One rendered marker, kept so the next update can move it rather than
   * rebuild it. `signature` covers everything that decides the *content* — the
   * position and the heading are excluded on purpose, because changing is the
   * common case for both and the whole point of holding these.
   */
  type RenderedMarker = {
    marker: Marker;
    icons: Record<string, unknown>[];
    signature: string;
    /** The layer the direction pointer hangs off, or null for a marker with none. */
    rotor: HTMLElement | null;
    /**
     * The angle currently on the element, *unwrapped* — it accumulates past 360
     * and below 0 rather than resetting. A rider crossing north goes 350° → 10°,
     * and a transition between those two numbers spins the pointer 340° the
     * wrong way round; carrying the total means every turn takes the short way.
     */
    angle: number;
  };

  let rendered = new Map<string, RenderedMarker>();

  /** The viewer took the wheel; nothing moves the camera until they ask. */
  let suspended = $state(false);

  /** Armed when a framed party leaves the view, cleared when they return. */
  let refitTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * How many parties the camera was last framed around.
   *
   * A count rather than a flag, because they arrive one at a time: a trip is
   * framed on the counter alone until the rider's first fix lands. Growing
   * past this is a first frame, not drift, and gets the camera immediately.
   */
  let framedCount = 0;

  function markerColor(marker: MapMarker) {
    if (marker.role) return MAP_ROLE_COLORS[marker.role];
    return marker.accent ? MAP_COLORS.primary : MAP_COLORS.secondary;
  }

  /**
   * Four decimals — about 11 m.
   *
   * This was six, which is 0.11 m: finer than any GPS fix is accurate, so the
   * guard it exists to be never once held and the camera was re-aimed on every
   * jitter. A cell this size is smaller than the marker drawn in it.
   */
  function centerKey(point: LatLng | null) {
    if (!point) return '';
    return `${point.lat.toFixed(4)},${point.lng.toFixed(4)}`;
  }

  /** MapLibre speaks [lng, lat]; the rest of the app speaks {lat, lng}. */
  function toLngLat(point: LatLng): LngLatLike {
    return [point.lng, point.lat];
  }

  /** Pan, and only change zoom when a caller actually asked for one. */
  function panToPoint(point: LatLng, nextZoom?: number | null) {
    if (!map) return;

    map.easeTo({
      center: toLngLat(point),
      ...(nextZoom != null ? { zoom: nextZoom } : {}),
      duration: 400
    });
  }

  /** The points that have to stay on screen together, in marker order. */
  function fitPoints(): LatLng[] {
    if (fitIds.length === 0) return [];

    return fitIds
      .map((id) => markers.find((marker) => marker.id === id))
      .filter((marker): marker is MapMarker => marker != null)
      .map((marker) => ({ lat: marker.lat, lng: marker.lng }));
  }

  function currentBounds(): Bounds | null {
    const bounds = map?.getBounds();
    if (!bounds) return null;

    return {
      south: bounds.getSouth(),
      west: bounds.getWest(),
      north: bounds.getNorth(),
      east: bounds.getEast()
    };
  }

  /**
   * Frame everything in `fitIds`.
   *
   * A single point is panned to rather than fitted: fitting a zero-width box
   * zooms to the maximum the map will give, which is a street-level close-up of
   * one marker. Unlike the Google SDK, MapLibre takes `maxZoom` on the fit
   * itself, so the cap needs no follow-up listener — two parties on the same
   * street cannot fill the screen with the gap between them.
   */
  function frameNow() {
    const points = fitPoints();
    if (!map || points.length === 0) return;

    clearRefit();
    framedCount = points.length;

    if (points.length === 1) {
      panToPoint(points[0]);
      return;
    }

    const box = boundsOf(points);
    if (!box) return;

    map.fitBounds(
      [
        [box.west, box.south],
        [box.east, box.north]
      ],
      { padding: FIT_PADDING_PX, maxZoom: FIT_MAX_ZOOM, duration: 400 }
    );
  }

  function clearRefit() {
    if (refitTimer) clearTimeout(refitTimer);
    refitTimer = undefined;
  }

  /**
   * Decide whether the camera owes anyone a move.
   *
   * Called after every settle and every marker update. Going off screen arms
   * the grace period rather than moving straight away — a rider clipping the
   * edge at a junction is not worth chasing, and one that has genuinely left
   * is still there five seconds later.
   */
  function reviewFraming() {
    const points = fitPoints();

    if (!map || points.length === 0) {
      clearRefit();
      return;
    }

    // The viewer's choice outranks everything below, including a party
    // arriving: they moved the camera deliberately and asked for nothing else.
    if (suspended) {
      clearRefit();
      return;
    }

    // A party the camera has never framed is not drift — the screen has never
    // shown this set together, so there is nothing to be patient about.
    if (points.length > framedCount) {
      frameNow();
      return;
    }

    if (containsAll(currentBounds(), points)) {
      clearRefit();
      return;
    }

    if (refitTimer) return;
    refitTimer = setTimeout(() => {
      refitTimer = undefined;
      if (!suspended) frameNow();
    }, AUTO_FIT_DELAY_MS);
  }

  /** The viewer moved the map themselves. */
  function suspendFraming() {
    if (fitIds.length === 0) return;

    suspended = true;
    clearRefit();
  }

  function recentre() {
    suspended = false;
    frameNow();
  }

  /**
   * Everything about a marker that decides what it *looks* like.
   *
   * Position is deliberately absent: a moving rider is the common case, and
   * the whole reason these are held is so movement is an assignment rather
   * than a teardown. Heading is absent for the same reason — it is applied to
   * the element already on screen, see `applyHeading`. There is no theme here
   * either: the cartography does not follow the app's.
   */
  function markerSignature(marker: MapMarker) {
    return [
      marker.role ?? '',
      marker.label ?? '',
      marker.accent ? 'accent' : '',
      marker.stale ? 'stale' : '',
      marker.pulse ? `pulse:${pulseScaleOf(marker)}` : ''
    ].join('|');
  }

  /**
   * The pointer that says which way a rider is going.
   *
   * A wedge orbiting the helmet rather than a rotation of it: the helmet is
   * drawn side-on, so turning it to face north would leave a rider lying on
   * their back. Keeping the glyph upright and moving a pointer around it is the
   * arrangement every navigation app settles on, and it separates the two
   * questions the marker answers — *who* is that, and *where are they headed*.
   *
   * Built as a zero-size box pinned to the centre of the glyph: rotating a box
   * with no dimensions turns its contents about that centre, so the pointer
   * swings around the helmet without any trigonometry here.
   */
  function directionPointer(color: string) {
    const rotor = document.createElement('div');
    rotor.style.position = 'absolute';
    rotor.style.left = '50%';
    rotor.style.top = '50%';
    rotor.style.width = '0';
    rotor.style.height = '0';
    rotor.style.pointerEvents = 'none';
    // Hidden until the first heading lands, so a rider whose direction is not
    // known yet is a plain helmet rather than one pointed arbitrarily north.
    rotor.style.opacity = '0';
    rotor.style.transition = 'transform 500ms ease-out, opacity 250ms linear';

    const namespace = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(namespace, 'svg');
    svg.setAttribute('viewBox', `0 0 ${POINTER_W} ${POINTER_H}`);
    svg.setAttribute('width', `${POINTER_W}`);
    svg.setAttribute('height', `${POINTER_H}`);
    svg.style.position = 'absolute';
    svg.style.left = `${-POINTER_W / 2}px`;
    svg.style.top = `${-POINTER_ORBIT_PX}px`;
    svg.style.display = 'block';

    // Same outline treatment as the glyph it orbits — filled in the marker's
    // colour, hairlined in the surface behind it, stroke painted first so the
    // outline sits outside the shape rather than eating into it.
    const wedge = document.createElementNS(namespace, 'path');
    wedge.setAttribute('d', `M${POINTER_W / 2} 0 L${POINTER_W} ${POINTER_H} L0 ${POINTER_H} Z`);
    wedge.setAttribute('fill', color);
    wedge.setAttribute('stroke', MARKER_KNOCKOUT);
    wedge.setAttribute('stroke-width', '2');
    wedge.setAttribute('stroke-linejoin', 'round');
    wedge.setAttribute('paint-order', 'stroke');

    svg.appendChild(wedge);
    rotor.appendChild(svg);

    return rotor;
  }

  /**
   * Turn a marker that is already on screen.
   *
   * The angle accumulates rather than being written straight through: see
   * `RenderedMarker.angle` for why 350° → 10° must not be a 340° turn.
   */
  function applyHeading(entry: RenderedMarker, heading: number | null | undefined) {
    if (!entry.rotor) return;

    if (heading == null || !Number.isFinite(heading)) {
      entry.rotor.style.opacity = '0';
      return;
    }

    const delta = ((((heading - entry.angle) % 360) + 540) % 360) - 180;

    entry.angle += delta;
    entry.rotor.style.opacity = '1';
    entry.rotor.style.transform = `rotate(${entry.angle}deg)`;
  }

  /**
   * The element MapLibre will own: a teardrop for a dropped pin, a bare glyph
   * for a party.
   *
   * Riders and businesses used to be a filled disc with the glyph knocked out
   * of it, which reads as a *place* — the same badge a pin is. They are drawn
   * as the bare glyph instead: brand red, and outlined a hairline in the
   * surface colour, which is the whole trick behind a racing-game minimap icon.
   * The outline is what separates the shape from whatever it is sitting on.
   *
   * Markers with no role at all keep the plain dot; there is no shape to
   * outline, so the ring is still doing the separating.
   */
  function markerContent(marker: MapMarker, color: string, icons: Record<string, unknown>[]) {
    const isPin = marker.role === 'search' || marker.role === 'dropoff';
    const element = document.createElement('div');
    let size: number;

    if (isPin) {
      // MapLibre has no PinElement, so the teardrop is drawn here. Nudged up by
      // its own tip so the point of the drop sits on the coordinate.
      size = 34;
      element.innerHTML = `
        <svg width="26" height="34" viewBox="0 0 26 34" aria-hidden="true">
          <path d="M13 33C13 33 25 20.5 25 13A12 12 0 1 0 1 13c0 7.5 12 20 12 20Z"
                fill="${color}" stroke="${MARKER_KNOCKOUT}" stroke-width="2"/>
          <circle cx="13" cy="13" r="4.5" fill="${MARKER_KNOCKOUT}"/>
        </svg>`;
      element.style.transform = 'translateY(-6px)';
    } else {
      const icon = marker.role ? ROLE_ICONS[marker.role] : undefined;

      if (icon) {
        size = (marker.role && ROLE_ICON_PX[marker.role]) || 24;

        element.style.display = 'flex';
        element.style.alignItems = 'center';
        element.style.justifyContent = 'center';

        element.style.color = color;
        element.style.stroke = MARKER_KNOCKOUT;
        element.style.setProperty('stroke-width', '2');
        element.style.setProperty('paint-order', 'stroke');

        icons.push(mount(icon, { target: element, props: { width: size, height: size } }));
      } else {
        size = 30;

        element.style.width = `${size}px`;
        element.style.height = `${size}px`;
        element.style.borderRadius = '50%';
        element.style.background = color;
        element.style.border = `2px solid ${MARKER_KNOCKOUT}`;
        element.style.boxSizing = 'content-box';
      }
    }

    const steerable = Boolean(marker.role && ROLE_HAS_HEADING[marker.role]);

    if (!marker.pulse && !steerable) return { content: element, rotor: null };

    // Anything layered around the glyph needs something to be positioned
    // against, and both the rings and the pointer are measured from its centre.
    const host = document.createElement('div');
    host.style.position = 'relative';
    host.style.display = 'flex';
    host.style.alignItems = 'center';
    host.style.justifyContent = 'center';

    if (marker.pulse) {
      // Marker content is built imperatively, outside the template, so component
      // CSS can't reach it — the rings are animated through the Web Animations
      // API instead of a keyframes rule.
      const reach = pulseScaleOf(marker);

      // A wider throw is given longer to travel, so a ring keeps roughly the
      // same speed instead of snapping outward as the search grows — the change
      // should read as reaching further, not as hurrying.
      const duration = Math.round(2400 * (reach / DEFAULT_PULSE_SCALE));

      // …which is why the count is derived rather than fixed. This was two
      // rings 1200 ms apart, which is one launched every half-cycle only while
      // a cycle is 2400 ms. Once the tracking screen widened the throw, the
      // cycle stretched past 6 s and that same pair travelled almost together
      // and then left five seconds of nothing — a double blink, not a pulse.
      // Holding the *cadence* at roughly 1200 ms and spacing whatever number of
      // rings that needs across the cycle keeps it continuous at any reach, and
      // collapses back to exactly the original two at the default.
      const RING_CADENCE_MS = 1200;
      const ringCount = Math.max(2, Math.min(6, Math.round(duration / RING_CADENCE_MS)));

      for (let index = 0; index < ringCount; index++) {
        const ring = document.createElement('div');
        ring.style.position = 'absolute';
        ring.style.width = `${size}px`;
        ring.style.height = `${size}px`;
        ring.style.borderRadius = '50%';
        ring.style.border = `2px solid ${color}`;
        ring.style.pointerEvents = 'none';
        ring.animate(
          [
            { transform: 'scale(1)', opacity: 0.75 },
            { transform: `scale(${reach})`, opacity: 0 }
          ],
          {
            duration,
            iterations: Infinity,
            delay: Math.round((duration / ringCount) * index),
            easing: 'ease-out'
          }
        );
        host.appendChild(ring);
      }
    }

    host.appendChild(element);

    const rotor = steerable ? directionPointer(color) : null;
    if (rotor) host.appendChild(rotor);

    return { content: host, rotor };
  }

  /** Build one marker's DOM and the Svelte roots that live inside it. */
  function buildMarker(marker: MapMarker, instance: MapLibreMap): RenderedMarker {
    const color = markerColor(marker);
    const icons: Record<string, unknown>[] = [];
    const built = markerContent(marker, color, icons);

    // MapLibre's Marker has no opacity option — it takes a DOM element, so
    // staleness is expressed on the element itself.
    built.content.style.opacity = marker.stale ? '0.45' : '1';
    if (marker.label) built.content.title = marker.label;

    const entry: RenderedMarker = {
      marker: new MarkerCtor({ element: built.content, anchor: 'center' })
        .setLngLat(toLngLat(marker))
        .addTo(instance),
      icons,
      signature: markerSignature(marker),
      rotor: built.rotor,
      angle: marker.heading ?? 0
    };

    // Straight onto the element, with no transition to play: a marker being
    // built for the first time should arrive already pointing the right way
    // rather than swinging round from north as it appears.
    if (entry.rotor && marker.heading != null) {
      entry.rotor.style.opacity = '1';
      entry.rotor.style.transform = `rotate(${entry.angle}deg)`;
    }

    return entry;
  }

  function dropMarker(entry: RenderedMarker) {
    entry.marker.remove();
    entry.icons.forEach((icon) => void unmount(icon));
  }

  /**
   * Bring the rendered markers in line with the incoming set, keyed by `id`.
   *
   * This used to detach every marker and rebuild all of them on every update —
   * including unmounting and remounting a Svelte root per glyph — which, with a
   * rider fix arriving about once a second, meant the markers were blinking
   * continuously. Moving one is now an assignment; only a marker whose
   * *appearance* changed is rebuilt.
   */
  function syncMarkers() {
    const instance = map;
    if (!instance) return;

    const seen = new Set<string>();

    for (const marker of markers) {
      seen.add(marker.id);

      const existing = rendered.get(marker.id);

      if (existing && existing.signature === markerSignature(marker)) {
        existing.marker.setLngLat(toLngLat(marker));
        applyHeading(existing, marker.heading);
        continue;
      }

      if (existing) dropMarker(existing);

      rendered.set(marker.id, buildMarker(marker, instance));
    }

    for (const [id, entry] of rendered) {
      if (seen.has(id)) continue;

      dropMarker(entry);
      rendered.delete(id);
    }

    // A marker that moved may have taken a framed party off screen with it.
    reviewFraming();
  }

  function lineData(path: LatLng[]): Feature<LineString> {
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: path.length > 1 ? path.map((point) => [point.lng, point.lat]) : []
      }
    };
  }

  /**
   * Update both lines in place.
   *
   * The sources and layers are created once, when the style loads, and only
   * their data changes afterwards — removing and re-adding a layer on every fix
   * makes the line flicker, and mid-trip this runs whenever the rider leaves it.
   * That is also why there is no memo key here as there was under the Google
   * build: `setData` on an unchanged path is cheap and, unlike a rebuild, has
   * nothing to get out of step with.
   */
  function syncPolylines() {
    const instance = map;
    if (!instance || !instance.isStyleLoaded()) return;

    const route = instance.getSource(ROUTE_SOURCE) as GeoJSONSource | undefined;
    route?.setData(lineData(polylinePath));

    const hint = instance.getSource(HINT_SOURCE) as GeoJSONSource | undefined;
    hint?.setData(lineData(hintPath));
  }

  // Held at module-instance scope because `syncMarkers` needs the constructor and
  // the dynamic import that supplies it resolves inside onMount.
  let MarkerCtor: typeof Marker;

  onMount(async () => {
    if (!maps.enabled || !mapElement) {
      mapState = 'fallback';
      return;
    }

    mapState = 'loading';

    try {
      // Dynamic: maplibre-gl reads `window` at module scope, so a static import
      // would break SSR for every page that shows a map.
      //
      // The worker URL is handed over explicitly. Left alone, MapLibre finds its
      // tile-parsing worker with `new URL('./maplibre-gl-worker.mjs',
      // import.meta.url)` — a template literal no bundler can trace, so the file
      // is never emitted and the built chunk asks for a worker that sits nowhere
      // near it. `?worker&url` makes Vite bundle it properly (it imports the
      // 480kB shared chunk, so copying the file alone is not enough) and hand
      // back the URL of what it emitted.
      const [maplibre, workerUrl] = await Promise.all([
        import('maplibre-gl'),
        import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url')
      ]);
      await import('maplibre-gl/dist/maplibre-gl.css');

      if (!mapElement) return;

      maplibre.setWorkerUrl(workerUrl.default);
      MarkerCtor = maplibre.Marker;

      // Captured, not re-read. `center` is a prop and the style below is a
      // network fetch, so by the time this function finishes `center` may be a
      // different point than the map was actually built at — see the comment on
      // `lastCenteredKey` where the build completes.
      const builtAt = center ?? KUMASI_CENTER;
      const builtZoom = zoom;

      map = new maplibre.Map({
        container: mapElement,
        style: maps.styleUrl,
        center: toLngLat(builtAt),
        zoom: zoom ?? KUMASI_DEFAULT_ZOOM,
        attributionControl: { compact: true },
        // The Google build set `disableDefaultUI`; these are the equivalents.
        dragRotate: false,
        pitchWithRotate: false,
        touchZoomRotate: true
      });

      map.touchZoomRotate.disableRotation();

      if (interactive) {
        map.on('click', (event) => {
          onpick?.({ lat: event.lngLat.lat, lng: event.lngLat.lng });
        });
        map.getCanvas().style.cursor = 'crosshair';
      }

      // Telling our own camera moves from the viewer's needs no fence here, as
      // it did under the Google SDK: MapLibre puts the browser event that
      // started a move on the event itself, and a move we started has none. A
      // drag or a zoom with an `originalEvent` is the viewer's, and their choice
      // outranks any framing of ours.
      map.on('dragstart', (event) => {
        if (event.originalEvent) suspendFraming();
      });
      map.on('zoomstart', (event) => {
        if (event.originalEvent) suspendFraming();
      });
      map.on('moveend', () => reviewFraming());

      await new Promise<void>((resolve, reject) => {
        map?.once('load', () => resolve());
        map?.once('error', (event) => reject(event.error ?? new Error('Map failed to load.')));
      });

      // Created once; syncPolylines only sets data. The hint goes in first so
      // the routed leg draws over it: it is context rather than the thing being
      // followed.
      map.addSource(HINT_SOURCE, { type: 'geojson', data: lineData([]) });
      map.addLayer({
        id: HINT_LAYER,
        type: 'line',
        source: HINT_SOURCE,
        layout: { 'line-cap': 'butt', 'line-join': 'round' },
        paint: {
          'line-color': MAP_COLORS.secondary,
          'line-width': 3,
          'line-opacity': 0.9,
          // Dashes are how a line says "this is not a route" — the same job the
          // repeating dash symbol did on the Google build.
          'line-dasharray': [2, 2]
        }
      });

      map.addSource(ROUTE_SOURCE, { type: 'geojson', data: lineData([]) });
      map.addLayer({
        id: ROUTE_LAYER,
        type: 'line',
        source: ROUTE_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': MAP_COLORS.primary,
          'line-width': 4,
          'line-opacity': 0.9
        }
      });

      mapState = 'ready';
      // `builtAt`, not `center`. This used to re-read the prop, and on any page
      // whose centre arrives *while the style is loading* that silently armed
      // the "already there" guard with a point the camera had never been moved
      // to: the map stayed where it was built and the follow effect below
      // declined to correct it, because the key it compared against was the new
      // centre. On /tracking that meant a search framed on the zone centre with
      // the counter it was searching around somewhere off screen — visible only
      // when the two happened to differ, which is why it survived a test where
      // the shop sat exactly on the zone centre.
      lastCenteredKey = centerKey(builtAt);
      lastZoomTarget = builtZoom;
      syncMarkers();
      syncPolylines();
      reviewFraming();
    } catch (error) {
      console.error('Unable to load the map.', error);
      mapState = 'error';
    }
  });

  /**
   * Follow `center` and `zoom`, but only where nothing better owns the camera.
   *
   * With `fitIds` set the framing decides where to look, and a centre that
   * moves with every fix would fight it. The pickers, which have no framing,
   * still get their pan when a search result lands.
   *
   * ---------------------------------------------------------------------------
   * One effect, and it has to be one
   * ---------------------------------------------------------------------------
   * This was two — a centre-follower and a zoom-follower — and they raced. Both
   * issue `easeTo`, and `easeTo` replaces whatever move is in flight rather than
   * merging with it: the centre pan started, the zoom effect fired in the same
   * tick, and the camera finished at the *old* centre with the new zoom. On
   * /tracking that is exactly the reported symptom — a search zoomed to 17.5 on
   * the zone centre with the counter it was searching around off screen. It only
   * showed when the two points differed, which is why a test with the shop
   * sitting on the zone centre missed it twice.
   *
   * Both moves now leave through the same call, so there is nothing to race.
   */
  $effect(() => {
    if (mapState !== 'ready' || !map || fitIds.length > 0) return;

    // Read unconditionally: the required zoom depends on these, and below they
    // are only reached through a call that a null `zoom` skips.
    contain;

    const key = center ? centerKey(center) : '';
    const centreChanged = Boolean(key) && key !== lastCenteredKey;

    const target = zoom == null ? null : zoomWithContain(zoom);
    const zoomChanged =
      target != null &&
      (lastZoomTarget == null || Math.abs(lastZoomTarget - target) > 0.01);

    if (!centreChanged && !zoomChanged) return;

    if (centreChanged) lastCenteredKey = key;
    if (zoomChanged) lastZoomTarget = target;

    // Eased rather than set: the tracking screen steps this outward as a search
    // widens, and a snap between zoom levels reads as the map reloading rather
    // than as the camera pulling back. Programmatic, so it carries no
    // `originalEvent` and does not trip the fence that hands the camera to the
    // viewer — see the `zoomstart` handler above.
    map.easeTo({
      ...(centreChanged && center ? { center: toLngLat(center) } : {}),
      ...(zoomChanged && target != null ? { zoom: target } : {}),
      duration: 600
    });
  });

  /**
   * The zoom actually flown to: the caller's, opened out as far as `contain`
   * needs and no further.
   *
   * `Math.min` because smaller is wider. A caller asking for 17.5 with a rider
   * 600 m off gets whatever holds that rider; with every rider already inside
   * the frame it gets 17.5 untouched.
   */
  function zoomWithContain(requested: number) {
    if (!map || contain.length === 0 || !center) return requested;

    const canvas = map.getCanvas();
    const fits = zoomToContain({
      centre: center,
      points: contain,
      widthPx: canvas.clientWidth,
      heightPx: canvas.clientHeight,
      paddingPx: FIT_PADDING_PX
    });

    return fits == null ? requested : Math.min(requested, fits);
  }

  $effect(() => {
    if (mapState === 'ready') {
      markers;
      syncMarkers();
    }
  });

  $effect(() => {
    if (mapState === 'ready') {
      polylinePath;
      hintPath;
      syncPolylines();
    }
  });

  onDestroy(() => {
    clearRefit();
    rendered.forEach((entry) => dropMarker(entry));
    rendered = new Map();
    map?.remove();
    map = null;
  });
</script>

<!-- `h-full w-full` alongside `absolute inset-0`, and it is load-bearing.
     MapLibre injects its own stylesheet at runtime — after Tailwind's — and it
     carries `.maplibregl-map { position: relative }`. Same specificity as
     `.absolute`, later in the cascade, so it wins: the container it is given
     stops being absolutely positioned, `inset-0` no longer sizes it, and it
     collapses to zero height inside a full-height parent. Every map on this
     stack then draws into a box nobody can see. Sizing it explicitly holds
     whichever way that tie lands. -->
<div class="absolute inset-0 overflow-hidden bg-surface-sunken">
  <div
    bind:this={mapElement}
    class="absolute inset-0 h-full w-full transition-opacity duration-300"
    class:opacity-0={mapState !== 'ready'}
  ></div>

  {#if mapState !== 'ready'}
    <div
      class="absolute inset-0 overflow-hidden bg-surface-sunken"
      style="background-image: linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px); background-size: 28px 28px;"
    >
      <div class="font-mono-data absolute left-4 top-4 text-xs tracking-wide text-ink-tertiary">
        {#if !maps.enabled}
          MAP PLACEHOLDER — set MAP_STYLE_URL
        {:else if mapState === 'loading'}
          LOADING KUMASI MAP…
        {:else if mapState === 'error'}
          MAP TILES FAILED — FALLING BACK TO MOCK MAP
        {:else}
          MAPS TEMPORARILY DISABLED
        {/if}
      </div>
      {#if routeLabel}
        <div
          class="absolute left-[12%] right-[12%] top-[38%] border-t-[3px] border-dashed border-secondary"
        ></div>
      {/if}
      {#if interactive}
        <div
          class="absolute bottom-4 left-4 rounded-md bg-surface/95 px-3 py-2 text-xs font-semibold text-ink shadow-sm"
        >
          Click on the map to choose a location
        </div>
      {/if}
    </div>
  {/if}

  {#if locationUnavailable && mapState === 'ready'}
    <div
      class="absolute left-4 top-4 z-10 rounded-md bg-surface/95 px-3 py-2 text-xs font-semibold text-ink-secondary shadow-sm"
    >
      Location unavailable — showing last known position
    </div>
  {/if}

  <!-- Only after the viewer has moved the map themselves. Until then the
       camera frames both parties on its own and a button offering to do what
       is already happening would be noise. -->
  {#if suspended && mapState === 'ready' && fitIds.length > 0}
    <button
      type="button"
      class="absolute bottom-4 right-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-surface/95 px-3.5 py-2 text-sm font-semibold text-ink shadow-md backdrop-blur-sm transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-3 focus-visible:outline-focus"
      onclick={recentre}
    >
      <IconRecentre class="h-4 w-4 shrink-0" aria-hidden="true" />
      Recentre
    </button>
  {/if}

  {@render children?.()}
</div>
