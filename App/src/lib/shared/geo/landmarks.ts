/**
 * Known places in the KNUST / Ayeduase service area.
 *
 * A pin has to be shown to somebody as a name — "Unity Hall, KNUST", not
 * "6.67980, -1.57320". Coordinates on screen are a leak of the implementation:
 * nobody dispatches to six decimal places, and a courier reading one learns
 * nothing they can act on.
 *
 * Reverse geocoding answers that, at a price per call. This table answers it
 * first, for free, for the handful of places most deliveries around campus
 * actually go to — and it answers *better*, because these are the names people
 * here use. Google will happily return a Plus Code ("GJ8H+3M Kumasi") for a spot
 * it has no street address for, which is coordinates wearing a hat.
 *
 * It is meant to grow. Every entry added is a class of lookup that stops
 * costing anything, so adding the halls, gates and hostels a business actually
 * delivers to is the cheapest optimisation available here. Coordinates should be
 * read off the map rather than guessed: a landmark in the wrong place misnames
 * every pin near it.
 */

import type { LatLng } from "$lib/utils/types";

import { haversineKm } from "./service-area";

export type Landmark = {
  id: string;
  /** What people call it: "Ayeduase Gate". */
  name: string;
  /** Where it is, for the second line: "near KNUST, Kumasi". */
  area: string;
  lat: number;
  lng: number;
};

/**
 * Coordinates are from OpenStreetMap (queried 2026-08-01), which maps this
 * campus in detail — halls, gates, junctions and markets are all named features
 * there. Two entries predate that and carry their original numbers; they are
 * grouped at the bottom and marked.
 *
 * Two rules when editing:
 *
 *   - Read the coordinate off a map, don't estimate it. The original
 *     `Ayeduase Gate` sat about 330 m from the actual gate, which is far enough
 *     that pins at the gate were named after something else entirely.
 *   - Keep entries more than ~150 m apart. Inside `LANDMARK_HIT_KM` two
 *     landmarks compete for the same pin and the winner is whichever happens to
 *     be a few metres nearer, so "Africa Hall" and "Africa Hall Market" is a
 *     coin toss rather than a choice.
 */
export const KNUST_LANDMARKS: Landmark[] = [
  // Halls of residence
  {
    id: "unity-hall",
    name: "Unity Hall",
    area: "KNUST, Kumasi",
    lat: 6.679531,
    lng: -1.571859,
  },
  {
    id: "university-hall",
    name: "University Hall (Katanga)",
    area: "KNUST, Kumasi",
    lat: 6.672655,
    lng: -1.572465,
  },
  {
    id: "republic-hall",
    name: "Republic Hall",
    area: "KNUST, Kumasi",
    lat: 6.678166,
    lng: -1.573595,
  },
  {
    id: "independence-hall",
    name: "Independence Hall",
    area: "KNUST, Kumasi",
    lat: 6.677153,
    lng: -1.57175,
  },
  {
    id: "queen-elizabeth-hall",
    name: "Queen Elizabeth II Hall",
    area: "KNUST, Kumasi",
    lat: 6.676609,
    lng: -1.574462,
  },
  {
    id: "africa-hall",
    name: "Africa Hall",
    area: "KNUST, Kumasi",
    lat: 6.680634,
    lng: -1.575322,
  },

  // Campus gates and stops — how riders are actually directed onto campus
  {
    id: "ayeduase-gate",
    name: "Ayeduase Gate",
    area: "KNUST, Kumasi",
    lat: 6.675669,
    lng: -1.563605,
  },
  {
    id: "engineering-gate",
    name: "Engineering Gate",
    area: "KNUST, Kumasi",
    lat: 6.673725,
    lng: -1.563656,
  },
  {
    id: "brunei-bus-stop",
    name: "Brunei Bus Stop",
    area: "KNUST, Kumasi",
    lat: 6.670416,
    lng: -1.574197,
  },

  // Faculties and campus facilities
  {
    id: "prempeh-library",
    name: "Prempeh II Library",
    area: "KNUST, Kumasi",
    lat: 6.675211,
    lng: -1.572998,
  },
  {
    id: "paa-joe-stadium",
    name: "Paa Joe Stadium",
    area: "KNUST, Kumasi",
    lat: 6.676925,
    lng: -1.56962,
  },
  {
    id: "students-clinic",
    name: "KNUST Students' Clinic",
    area: "KNUST, Kumasi",
    lat: 6.680229,
    lng: -1.573312,
  },
  {
    id: "college-engineering",
    name: "College of Engineering",
    area: "KNUST, Kumasi",
    lat: 6.673504,
    lng: -1.565587,
  },
  {
    id: "college-science",
    name: "College of Science",
    area: "KNUST, Kumasi",
    lat: 6.673205,
    lng: -1.567129,
  },
  {
    id: "school-medical-sciences",
    name: "School of Medical Sciences",
    area: "KNUST, Kumasi",
    lat: 6.672313,
    lng: -1.568414,
  },
  {
    id: "knust-business-school",
    name: "KNUST School of Business",
    area: "KNUST, Kumasi",
    lat: 6.669085,
    lng: -1.568097,
  },
  {
    id: "faculty-law",
    name: "Faculty of Law",
    area: "KNUST, Kumasi",
    lat: 6.682134,
    lng: -1.572213,
  },

  // Ayeduase — where most off-campus hostels and eateries are
  {
    id: "ayeduase-junction",
    name: "Ayeduase Junction",
    area: "Ayeduase, Kumasi",
    lat: 6.675924,
    lng: -1.558901,
  },
  {
    id: "ayeduase-market",
    name: "Ayeduase Market",
    area: "Ayeduase, Kumasi",
    lat: 6.675578,
    lng: -1.557602,
  },
  {
    id: "ayeduase-health-centre",
    name: "Ayeduase Health Centre",
    area: "Ayeduase, Kumasi",
    lat: 6.675782,
    lng: -1.561014,
  },
  {
    id: "evandy-hostel",
    name: "Evandy Hostel",
    area: "Ayeduase, Kumasi",
    lat: 6.673409,
    lng: -1.55465,
  },
  {
    id: "frontline-hostel",
    name: "Frontline Inn Hostel",
    area: "Ayeduase, Kumasi",
    lat: 6.672154,
    lng: -1.562357,
  },

  // Surrounding neighbourhoods
  { id: "kotei", name: "Kotei", area: "Kumasi", lat: 6.66732, lng: -1.560085 },
  {
    id: "mass-hostel",
    name: "Mass Hostel",
    area: "Kotei, Kumasi",
    lat: 6.668965,
    lng: -1.562941,
  },
  { id: "bomso", name: "Bomso", area: "Kumasi", lat: 6.684532, lng: -1.580019 },
  {
    id: "tech-hospital",
    name: "Tech Hospital (KNUST Hospital)",
    area: "Bomso, Kumasi",
    lat: 6.686061,
    lng: -1.573745,
  },
  {
    id: "ayigya-market",
    name: "Ayigya Market",
    area: "Ayigya, Kumasi",
    lat: 6.689764,
    lng: -1.572667,
  },
  {
    id: "knust-police",
    name: "KNUST Police Station",
    area: "Ayigya, Kumasi",
    lat: 6.688635,
    lng: -1.564695,
  },
  {
    id: "anloga-market",
    name: "Anloga Market",
    area: "Kumasi",
    lat: 6.681728,
    lng: -1.591926,
  },
  {
    id: "kentinkrono",
    name: "Kentinkrono",
    area: "Kumasi",
    lat: 6.693976,
    lng: -1.555393,
  },
  { id: "boadi", name: "Boadi", area: "Kumasi", lat: 6.692376, lng: -1.548971 },
  {
    id: "deduako",
    name: "Deduako",
    area: "Kumasi",
    lat: 6.658715,
    lng: -1.545618,
  },
  {
    id: "atonsu-market",
    name: "Atonsu Market",
    area: "Atonsu, Kumasi",
    lat: 6.655128,
    lng: -1.590499,
  },

  // Carried over from the original table. No OpenStreetMap feature matched these
  // names, so the coordinates are the ones they shipped with and nobody has
  // checked them — worth confirming on a map before trusting the labels.
  {
    id: "knust-commercial",
    name: "KNUST Commercial Area",
    area: "Kumasi",
    lat: 6.6745,
    lng: -1.5716,
  },
  {
    id: "ayeduase-new-site",
    name: "Ayeduase New Site",
    area: "Kumasi",
    lat: 6.682,
    lng: -1.56,
  },
];

/**
 * Close enough to *be* the landmark. Roughly the footprint of a hall and its
 * forecourt — inside this, calling the pin anything else would be pedantic.
 */
export const LANDMARK_HIT_KM = 0.12;

/**
 * Close enough to be described by it: "Near Unity Hall" is a useful thing to
 * tell a rider; "Near Unity Hall" from two kilometres away is not.
 */
export const LANDMARK_NEAR_KM = 0.6;

/** The full label for a landmark, in the form the rest of the app displays. */
export function landmarkAddress(landmark: Landmark) {
  return `${landmark.name}, ${landmark.area}`;
}

export function nearestLandmark(point: LatLng) {
  let best: { landmark: Landmark; distanceKm: number } | null = null;

  for (const landmark of KNUST_LANDMARKS) {
    const distanceKm = haversineKm(point, landmark);
    if (!best || distanceKm < best.distanceKm) best = { landmark, distanceKm };
  }

  return best;
}

/**
 * Name a point from the table alone, or `null` if nothing is close enough to
 * say anything honest about it.
 */
export function describePoint(point: LatLng): string | null {
  const nearest = nearestLandmark(point);
  if (!nearest) return null;

  if (nearest.distanceKm <= LANDMARK_HIT_KM)
    return landmarkAddress(nearest.landmark);
  if (nearest.distanceKm <= LANDMARK_NEAR_KM)
    return `Near ${landmarkAddress(nearest.landmark)}`;

  return null;
}

/** Substring search, for suggesting places when Places predictions aren't available. */
export function searchLandmarks(query: string, limit = 5): Landmark[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  return KNUST_LANDMARKS.filter(
    (landmark) =>
      landmark.name.toLowerCase().includes(needle) ||
      landmark.area.toLowerCase().includes(needle),
  ).slice(0, limit);
}

/**
 * Whether a geocoder gave us a Plus Code instead of an address — common in
 * Ghana, where plenty of real destinations have no street address on file.
 * Google's own format: 4–6 base-20 characters, a `+`, then 2–3 more.
 */
export function isPlusCode(address: string) {
  return /^[23456789CFGHJMPQRVWX]{4,6}\+[23456789CFGHJMPQRVWX]{2,3}\b/i.test(
    address.trim(),
  );
}
