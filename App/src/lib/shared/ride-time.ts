/**
 * How long a ride actually took.
 *
 * Distinct from `estimated_duration_minutes`, which is what the Routes API
 * guessed when the request was raised. That estimate is a forecast about a ride
 * nobody had started, and showing it against a finished delivery states a
 * prediction as a fact — a trip logged as "8 min" that really took twenty reads
 * as a record of the ride and is nothing of the sort. It is also frequently
 * absent: with Maps billing off, no estimate is stored at all.
 *
 * The real figure needs no new column. `accepted_at` and `completed_at` are
 * already written, so the elapsed time is derivable from rows we have, and is
 * correct retroactively for every trip already in the table.
 *
 * The clock starts at *accept*, not at request: the minutes a request spends
 * ringing riders belong to dispatch, and folding them in would score a courier
 * for a delay they were not present for. `requested_at → accepted_at` is the
 * dispatch wait and is a separate measurement.
 */

/** Minutes between accepting a ride and completing it; null unless both happened. */
export function rideMinutes(
  acceptedAt: string | Date | null | undefined,
  completedAt: string | Date | null | undefined,
) {
  if (!acceptedAt || !completedAt) return null;

  const started = new Date(acceptedAt).getTime();
  const finished = new Date(completedAt).getTime();
  if (Number.isNaN(started) || Number.isNaN(finished)) return null;

  // Clamp rather than show a negative: a completion timestamped before its
  // accept means clock skew or a backfilled row, and "-3 min" in a table is
  // worse than "0 min".
  return Math.max(0, (finished - started) / 60_000);
}

/**
 * "0 min", "14 min", "1 h 05" — the recorded ride time, for a cell or a label.
 *
 * Rounds to the minute because that is the resolution anyone reasons about a
 * delivery in, and switches to hours past 60 so a long trip doesn't render as
 * an unreadable "137 min".
 */
export function formatRideTime(minutes: number | null | undefined) {
  if (minutes == null) return null;

  const total = Math.round(minutes);
  if (total < 60) return `${total} min`;

  const hours = Math.floor(total / 60);
  return `${hours} h ${String(total % 60).padStart(2, "0")}`;
}

/** The two steps together, for the common case of formatting straight from a row. */
export function formatRideTimeBetween(
  acceptedAt: string | Date | null | undefined,
  completedAt: string | Date | null | undefined,
) {
  return formatRideTime(rideMinutes(acceptedAt, completedAt));
}
