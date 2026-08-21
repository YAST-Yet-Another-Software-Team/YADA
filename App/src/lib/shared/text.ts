/**
 * An order's value, as every business-facing screen shows it.
 *
 * One helper so the dashboard, tracking and history cannot disagree about the
 * symbol or the decimals. Cedis, always two places — a price that renders as
 * "GH₵55" on one screen and "GH₵55.00" on another reads like two numbers.
 */
export function formatCedis(amount: number | null | undefined) {
  if (amount == null || !Number.isFinite(amount)) return "—";

  return `GH₵${amount.toFixed(2)}`;
}

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
      .map((part) => part[0] ?? "")
      .join("")
      .toUpperCase() || fallback
  );
}
