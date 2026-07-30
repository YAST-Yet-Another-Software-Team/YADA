const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Trip ids are `uuid` columns. Postgres rejects a malformed uuid with a type
 * error rather than an empty result, so API routes screen ids before querying
 * and answer with a 400 instead of a 500.
 */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}
