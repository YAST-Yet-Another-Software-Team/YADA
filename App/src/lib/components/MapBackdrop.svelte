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
  import { mount, onDestroy, onMount, unmount, type Snippet } from 'svelte';
  import { loadGoogleMaps, loadGoogleMapsMarker } from '$lib/client/maps/google-maps-loader';
  import { getMapsConfig } from '$lib/client/maps/maps-config.svelte';
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
  import { resolveTheme, watchResolvedTheme, type ResolvedTheme } from '$lib/client/theme';
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
     * a route: it costs no Routes call, and drawing it as roads would claim a
     * precision about a journey nobody has started.
     */
    hintPath?: LatLng[];
    center?: LatLng | null;
    zoom?: number | null;
    children?: Snippet;
    onpick?: (detail: { lat: number; lng: number }) => void;
  } = $props();

  let mapElement = $state<HTMLDivElement | null>(null);
  let mapState = $state<'fallback' | 'loading' | 'ready' | 'error'>('fallback');
  let map = $state<google.maps.Map | null>(null);
  let googleMaps = $state<typeof google.maps | null>(null);
  let markerApi = $state<google.maps.MarkerLibrary | null>(null);
  let routePolyline: google.maps.Polyline | null = null;
  let hintPolyline: google.maps.Polyline | null = null;
  let lastCenteredKey = '';
  const maps = getMapsConfig();

  /** Every listener this component owns, dropped together on teardown. */
  let listeners: google.maps.MapsEventListener[] = [];

  /** The one-shot that clamps zoom after a fit; replaced on each fit. */
  let clampListener: google.maps.MapsEventListener | null = null;

  /**
   * One rendered marker, kept so the next update can move it rather than
   * rebuild it. `signature` covers everything that decides the *content* — the
   * position and the heading are excluded on purpose, because changing is the
   * common case for both and the whole point of holding these.
   */
  type RenderedMarker = {
    marker: google.maps.marker.AdvancedMarkerElement;
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

  /**
   * True while a camera move of ours is in flight.
   *
   * The fence around the feedback loop this component would otherwise have:
   * `fitBounds` fires `bounds_changed`, and `bounds_changed` is what decides
   * whether to fit. Without a way to tell our own move from the viewer's, the
   * two chase each other forever.
   */
  let programmatic = false;

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

  /**
   * Backstop for the fence.
   *
   * `programmatic` is cleared on the next `idle` — but a move that changes
   * nothing (fitting a camera that already fits) fires no `idle` at all, and
   * the flag would then stay up forever, swallowing every gesture after it.
   */
  let fenceTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * Held rather than derived because the map is rebuilt from it, and rebuilding
   * has to happen at a moment of our choosing rather than mid-render.
   * Server-side it is never read: nothing draws until onMount.
   */
  let theme: ResolvedTheme = 'light';
  let mapsLibrary: google.maps.MapsLibrary | null = null;
  let stopThemeWatch: (() => void) | null = null;

  /**
   * One lookup, no per-shape special cases: which hue a role gets is decided in
   * `MAP_ROLE_COLORS` and nowhere else, so the dashboard, tracking and the
   * request map cannot drift apart. This used to force every glyph role to
   * primary here as well, which quietly outranked the table and made two of its
   * entries unreachable.
   */
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

  /**
   * Run a camera move with the fence up.
   *
   * The flag is cleared on the next `idle` rather than immediately: a pan or a
   * fit settles over several frames and fires `bounds_changed` throughout, and
   * every one of those is ours.
   */
  function moveCamera(run: () => void) {
    if (!map) return;

    programmatic = true;
    if (fenceTimer) clearTimeout(fenceTimer);
    fenceTimer = setTimeout(() => {
      fenceTimer = undefined;
      programmatic = false;
    }, 1500);

    run();
  }

  function dropFence() {
    if (fenceTimer) clearTimeout(fenceTimer);
    fenceTimer = undefined;
    programmatic = false;
  }

  /** Pan, and only change zoom when a caller actually asked for one. */
  function panToPoint(point: LatLng, nextZoom?: number | null) {
    if (!map) return;

    moveCamera(() => {
      map!.panTo(point);
      if (nextZoom != null) map!.setZoom(nextZoom);
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

    const southWest = bounds.getSouthWest();
    const northEast = bounds.getNorthEast();

    return {
      south: southWest.lat(),
      west: southWest.lng(),
      north: northEast.lat(),
      east: northEast.lng()
    };
  }

  /**
   * Frame everything in `fitIds`.
   *
   * A single point is panned to rather than fitted: `fitBounds` on a
   * zero-width box zooms to the maximum the map will give, which is a
   * street-level close-up of one marker.
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

    moveCamera(() => {
      map!.fitBounds(
        { south: box.south, west: box.west, north: box.north, east: box.east },
        FIT_PADDING_PX
      );

      // `fitBounds` has no maxZoom, so the cap is applied once it has settled.
      // Two parties on the same street would otherwise fill the screen with
      // the gap between them.
      //
      // One listener, replaced rather than accumulated: fits happen for the
      // life of a trip, and a `once` listener that never fires — because the
      // fit changed nothing — would otherwise pile up.
      clampListener?.remove();
      clampListener = google.maps.event.addListenerOnce(map!, 'idle', () => {
        clampListener = null;

        if ((map?.getZoom() ?? 0) > FIT_MAX_ZOOM) {
          moveCamera(() => map?.setZoom(FIT_MAX_ZOOM));
        }
      });
    });
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
   * Build the map at the current theme.
   *
   * Separate from onMount because `colorScheme` is a construction-time option —
   * the Maps SDK offers no setter for it — so following a theme change means
   * building a second map, not restyling the first. Everything the map owns
   * (markers, the route line, the click listener) is therefore re-established
   * here rather than once at mount.
   */
  function buildMap() {
    if (!mapsLibrary || !mapElement) {
      return;
    }

    map = new mapsLibrary.Map(mapElement, {
      center: center ?? KUMASI_CENTER,
      zoom: zoom ?? KUMASI_DEFAULT_ZOOM,
      // AdvancedMarkerElement renders nothing without a Map ID.
      mapId: maps.mapId,
      // Google's own dark cartography. Passed explicitly rather than as
      // FOLLOW_SYSTEM: that reads the OS only, which would ignore a user who
      // picked a theme in settings against their system setting.
      colorScheme: theme === 'dark' ? 'DARK' : 'LIGHT',
      disableDefaultUI: true,
      clickableIcons: false,
      gestureHandling: 'greedy',
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    });

    if (interactive) {
      listeners.push(
        map.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (!event.latLng) {
            return;
          }

          onpick?.({
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
          });
        })
      );
    }

    // The camera's own events, and the fence around them. `idle` is the settle:
    // it ends our move, and it is the only moment `getBounds()` is worth
    // reading. A drag or a zoom that arrives while the fence is down came from
    // the viewer, and their choice outranks any framing of ours.
    listeners.push(
      map.addListener('idle', () => {
        dropFence();
        reviewFraming();
      }),
      map.addListener('dragstart', () => {
        if (!programmatic) suspendFraming();
      }),
      map.addListener('zoom_changed', () => {
        if (!programmatic) suspendFraming();
      })
    );

    mapState = 'ready';
    lastCenteredKey = centerKey(center ?? KUMASI_CENTER);
    syncMarkers();
    syncPolylines();
    reviewFraming();
  }

  /**
   * Release everything attached to the current map.
   *
   * The Maps SDK has no `destroy()`; dropping every reference we hold and
   * letting the next `new Map()` take over the container is the documented
   * shape of this. Markers and the polyline must be detached explicitly or they
   * stay bound to the discarded instance and leak.
   */
  function teardownMap() {
    listeners.forEach((listener) => listener.remove());
    listeners = [];
    clampListener?.remove();
    clampListener = null;
    clearRefit();
    rendered.forEach((entry) => {
      entry.marker.map = null;
      entry.icons.forEach((icon) => void unmount(icon));
    });
    rendered = new Map();
    routePolyline?.setMap(null);
    routePolyline = null;
    hintPolyline?.setMap(null);
    hintPolyline = null;
    // The memo keys go with the lines they describe. Leaving them set meant
    // `syncPolylines` compared the *new* map's empty state against the old
    // map's key, decided nothing had changed, and drew no route at all — so a
    // courier who changed theme mid-delivery (or whose phone rolled into dark
    // mode at sunset) lost the red line and did not get it back until they left
    // the route. `lastCenteredKey` is reset in `buildMap` for the same reason.
    routeKey = '';
    hintKey = '';
    // A rebuilt map has framed nothing yet, and the viewer's suspension went
    // with the camera it applied to.
    framedCount = 0;
    suspended = false;
    dropFence();
    map = null;
  }

  onMount(async () => {
    if (!maps.enabled) {
      mapState = 'fallback';
      return;
    }

    if (!mapElement) {
      return;
    }

    mapState = 'loading';

    try {
      const [mapsLibraryResult, markerLibrary] = await Promise.all([
        loadGoogleMaps(maps.apiKey),
        loadGoogleMapsMarker(maps.apiKey)
      ]);

      if (!mapElement) {
        return;
      }

      googleMaps = window.google.maps;
      markerApi = markerLibrary;
      mapsLibrary = mapsLibraryResult;

      // Watch first, then read, then build — in that order, and all of it
      // *after* the loader has settled. The theme used to be read before the
      // await: a viewer who hit the toggle while the Maps SDK was still coming
      // down got a map built to the old theme, and the watcher then seeded
      // itself with the *new* one, so it saw no change to report and the
      // basemap stayed wrong until they toggled twice or reloaded.
      stopThemeWatch = watchResolvedTheme((next) => {
        theme = next;

        if (mapState !== 'ready') {
          return;
        }

        teardownMap();
        buildMap();
      });

      theme = resolveTheme();
      buildMap();
    } catch (error) {
      console.error('Unable to load Google Maps.', error);
      mapState = 'error';
    }
  });

  /**
   * Everything about a marker that decides what it *looks* like.
   *
   * Position is deliberately absent: a moving rider is the common case, and
   * the whole reason these are held is so movement is an assignment rather
   * than a teardown.
   */
  function markerSignature(marker: MapMarker) {
    return [
      marker.role ?? '',
      marker.label ?? '',
      marker.accent ? 'accent' : '',
      marker.stale ? 'stale' : '',
      marker.pulse ? 'pulse' : '',
      // Heading is absent for the same reason position is: it changes with
      // every fix, and rebuilding the marker to turn it would unmount and
      // remount the glyph a second at a time. It is applied to the element that
      // is already on screen instead — see `applyHeading`.
      theme
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
    wedge.setAttribute('stroke', MAP_SURFACE[theme]);
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

    const delta = (((heading - entry.angle) % 360) + 540) % 360 - 180;

    entry.angle += delta;
    entry.rotor.style.opacity = '1';
    entry.rotor.style.transform = `rotate(${entry.angle}deg)`;
  }

  /**
   * Content for the roles that aren't a dropped pin.
   *
   * Riders and businesses used to be a filled disc with the glyph knocked out
   * of it, which reads as a *place* — the same badge a pin is. They are drawn
   * as the bare glyph instead: red, and outlined a hairline in the surface
   * colour, which is the whole trick behind a racing-game minimap icon. The
   * outline is what separates the shape from whatever it is sitting on, and it
   * follows the theme — white over Google's light cartography, near-black over
   * its dark one — so it reads as separation either way rather than as glare.
   *
   * Markers with no role at all keep the plain dot; there is no shape to
   * outline, so the ring is still doing the separating.
   */
  function markerContent(marker: MapMarker, color: string, icons: Record<string, unknown>[]) {
    const icon = marker.role ? ROLE_ICONS[marker.role] : undefined;
    const element = document.createElement('div');
    let size: number;

    if (icon) {
      size = (marker.role && ROLE_ICON_PX[marker.role]) || 24;

      element.style.display = 'flex';
      element.style.alignItems = 'center';
      element.style.justifyContent = 'center';

      element.style.color = color;
      element.style.stroke = MAP_SURFACE[theme];
      element.style.setProperty('stroke-width', '2');
      element.style.setProperty('paint-order', 'stroke');

      icons.push(mount(icon, { target: element, props: { width: size, height: size } }));
    } else {
      size = 30;

      element.style.width = `${size}px`;
      element.style.height = `${size}px`;
      element.style.borderRadius = '50%';
      element.style.background = color;
      element.style.border = `2px solid ${MAP_SURFACE[theme]}`;
      element.style.boxSizing = 'content-box';
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
      // API instead of a keyframes rule. Two of them, half a cycle apart, so the
      // pulse reads as continuous rather than as a blink.
      for (const delay of [0, 1200]) {
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
            { transform: 'scale(3.4)', opacity: 0 }
          ],
          { duration: 2400, iterations: Infinity, delay, easing: 'ease-out' }
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
  function buildMarker(marker: MapMarker, api: google.maps.MarkerLibrary): RenderedMarker {
    const color = markerColor(marker);
    const isPin = marker.role === 'search' || marker.role === 'dropoff';
    const icons: Record<string, unknown>[] = [];

    // PinElement extends HTMLElement, so it is its own content — and it is a
    // dropped pin, which never faces anywhere.
    const built = isPin
      ? {
          content: new api.PinElement({
            background: color,
            borderColor: MAP_SURFACE[theme],
            glyphColor: MAP_SURFACE[theme],
            scale: 1.2
          }) as unknown as HTMLElement,
          rotor: null
        }
      : markerContent(marker, color, icons);

    // AdvancedMarkerElement has no opacity option — it takes a DOM element,
    // so staleness is expressed on the element itself.
    built.content.style.opacity = marker.stale ? '0.45' : '1';

    const entry: RenderedMarker = {
      marker: new api.AdvancedMarkerElement({
        map,
        position: { lat: marker.lat, lng: marker.lng },
        title: marker.label,
        zIndex: marker.role === 'search' || marker.role === 'dropoff' ? 999 : 10,
        content: built.content
      }),
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
    const currentMarkerApi = markerApi;

    if (!map || !currentMarkerApi) {
      return;
    }

    const seen = new Set<string>();

    for (const marker of markers) {
      seen.add(marker.id);

      const existing = rendered.get(marker.id);

      if (existing && existing.signature === markerSignature(marker)) {
        existing.marker.position = { lat: marker.lat, lng: marker.lng };
        applyHeading(existing, marker.heading);
        continue;
      }

      if (existing) {
        existing.marker.map = null;
        existing.icons.forEach((icon) => void unmount(icon));
      }

      rendered.set(marker.id, buildMarker(marker, currentMarkerApi));
    }

    for (const [id, entry] of rendered) {
      if (seen.has(id)) continue;

      entry.marker.map = null;
      entry.icons.forEach((icon) => void unmount(icon));
      rendered.delete(id);
    }

    // A marker that moved may have taken a framed party off screen with it.
    reviewFraming();
  }

  /** Cheap identity for a path: nothing but its ends and its length move. */
  function pathKey(path: LatLng[]) {
    if (path.length === 0) return '';
    const first = path[0];
    const last = path[path.length - 1];
    return `${path.length}:${centerKey(first)}:${centerKey(last)}`;
  }

  let routeKey = '';
  let hintKey = '';

  function syncPolylines() {
    if (!map || !googleMaps) return;

    const nextRouteKey = pathKey(polylinePath);
    const nextHintKey = pathKey(hintPath);

    if (nextRouteKey !== routeKey) {
      routeKey = nextRouteKey;
      routePolyline?.setMap(null);
      routePolyline = null;

      if (polylinePath.length >= 2) {
        routePolyline = new googleMaps.Polyline({
          map,
          path: polylinePath,
          strokeColor: MAP_COLORS.primary,
          strokeOpacity: 0.9,
          strokeWeight: 4,
          zIndex: 20
        });
      }
    }

    if (nextHintKey !== hintKey) {
      hintKey = nextHintKey;
      hintPolyline?.setMap(null);
      hintPolyline = null;

      if (hintPath.length >= 2) {
        // Dashes are the SDK's way of saying "this is not a route": a
        // transparent stroke with a repeating dash symbol along it. Drawn
        // under the routed leg, because it is context rather than the thing
        // being followed.
        hintPolyline = new googleMaps.Polyline({
          map,
          path: hintPath,
          strokeOpacity: 0,
          zIndex: 10,
          icons: [
            {
              icon: {
                path: 'M 0,-1 0,1',
                strokeColor: MAP_COLORS.secondary,
                strokeOpacity: 0.9,
                strokeWeight: 3,
                scale: 3
              },
              offset: '0',
              repeat: '14px'
            }
          ]
        });
      }
    }
  }

  /**
   * Follow `center`, but only where nothing better owns the camera.
   *
   * With `fitIds` set the framing decides where to look, and a centre that
   * moves with every fix would fight it. The pickers, which have no framing,
   * still get their pan when a search result lands.
   */
  $effect(() => {
    if (mapState === 'ready' && map && center && fitIds.length === 0) {
      const key = centerKey(center);
      if (key && key !== lastCenteredKey) {
        lastCenteredKey = key;
        panToPoint(center, zoom);
      }
    }
  });

  $effect(() => {
    if (mapState === 'ready' && map && zoom != null && fitIds.length === 0) {
      moveCamera(() => map!.setZoom(zoom!));
    }
  });

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
    stopThemeWatch?.();
    stopThemeWatch = null;
    teardownMap();
  });
</script>

<div class="absolute inset-0 overflow-hidden bg-surface-sunken">
  <div
    bind:this={mapElement}
    class="absolute inset-0 transition-opacity duration-300"
    class:opacity-0={mapState !== 'ready'}
    style:cursor={interactive ? 'crosshair' : 'default'}
  ></div>

  {#if mapState !== 'ready'}
    <div
      class="absolute inset-0 overflow-hidden bg-surface-sunken"
      style="background-image: linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px); background-size: 28px 28px;"
    >
      <div class="font-mono-data absolute left-4 top-4 text-xs tracking-wide text-ink-tertiary">
        {#if !maps.enabled}
          MAP PLACEHOLDER — set GOOGLE_MAPS_API_KEY
        {:else if mapState === 'loading'}
          LOADING KUMASI MAP…
        {:else if mapState === 'error'}
          GOOGLE MAPS FAILED — FALLING BACK TO MOCK MAP
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
