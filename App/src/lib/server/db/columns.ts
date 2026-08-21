/**
 * Reading and writing the numeric columns.
 *
 * Postgres `numeric` arrives from the driver as a *string* — it is arbitrary
 * precision, and there is no JS number that round-trips it — so every read of a
 * coordinate, a distance or a rating has to convert, and every write has to
 * produce a string at the scale the column declares. That conversion was
 * written out by hand at each call site, which is how `api/trips` and
 * `data/business` ended up with the same six-decimal helper under the same name
 * and `api/location` with a bare `.toFixed(6)` doing it inline.
 *
 * Keeping them here means the scale lives next to the schema that declares it:
 * if `numeric(10, 6)` ever becomes `numeric(11, 7)`, this is the file that has
 * to agree with it, rather than four that might.
 */

/** A `numeric` column as a JS number, or null when the column is null. */
export function asNumber(value: string | number | null | undefined) {
  if (value == null) return null;
  return typeof value === "number" ? value : Number(value);
}

/**
 * A coordinate as `numeric(10, 6)` stores it — about 11 cm, far finer than any
 * phone's GPS, and the scale every latitude/longitude column in the schema uses.
 */
export function toCoordinateColumn(value: number) {
  return value.toFixed(6);
}

/** Round for display, where a full float would be noise. */
export function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
