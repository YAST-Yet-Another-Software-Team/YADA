/**
 * Two-letter initials for an avatar, e.g. "Kwame Asante" -> "KA".
 *
 * `fallback` covers both a missing name and a name that yields nothing usable
 * (whitespace, punctuation), so callers never have to re-check the result.
 */
export function initials(name: string | null | undefined, fallback: string) {
  return (
    (name || fallback)
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] ?? '')
      .join('')
      .toUpperCase() || fallback
  );
}
