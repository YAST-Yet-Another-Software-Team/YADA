/**
 * A motorbike's number plate: `GT 4521-20`.
 *
 * Two letters for the region, the serial, and the two-digit year behind a
 * hyphen — the hyphen is not decoration, it is how the plate is painted on the
 * bike, and it is what a business at the counter reads back.
 *
 * Everything here is **lenient by design**, matching the rule the validator
 * states in `$lib/server/validation/plate`: a rider whose plate does not match
 * the Ghanaian pattern still has to be able to type it. So each function shapes
 * a value while it can still become a plate, and hands it back untouched the
 * moment it cannot.
 */

/** The region code. Ghanaian plates carry two letters; so does `DP`, `CD`. */
const LETTERS = 2;

/** `4521` — up to four digits before the year. */
const SERIAL_DIGITS = 4;

/** `20` — the year of registration, always two. */
const YEAR_DIGITS = 2;

/** Letters and digits, in order, with the separators dropped. */
function significant(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * The reading form, for a plate that has already been saved.
 *
 * A stored value that carries its own hyphen is split on it and trusted: only
 * the owner knows whether `GR12311` is `GR 1231-1` or `GR 123-11`. Without one,
 * the last two digits are read as the year, which is right whatever the serial's
 * length.
 */
export function formatPlate(value: string | null | undefined) {
  const raw = (value ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
  if (raw.length === 0) return '';

  const letters = raw.slice(0, LETTERS);
  const rest = raw.slice(LETTERS);

  // Not two letters and then nothing but digits, spaces and one hyphen: it is a
  // plate we do not know the shape of, and guessing at it would be worse than
  // printing what the rider typed.
  if (!/^[A-Z]{2}$/.test(letters) || !/^[\s\d]*-?[\s\d]*$/.test(rest)) return raw;

  const cut = rest.lastIndexOf('-');
  const serial = cut >= 0 ? rest.slice(0, cut).replace(/\D/g, '') : '';
  const year = cut >= 0 ? rest.slice(cut + 1).replace(/\D/g, '') : '';

  if (cut >= 0) {
    if (serial.length < 1 || serial.length > SERIAL_DIGITS) return raw;
    if (year.length !== YEAR_DIGITS) return raw;

    return `${letters} ${serial}-${year}`;
  }

  const digits = rest.replace(/\D/g, '');
  if (digits.length < 1 || digits.length > SERIAL_DIGITS + YEAR_DIGITS) return raw;

  // Too few to be a serial *and* a year — a part-filled plate, printed as it is.
  if (digits.length <= YEAR_DIGITS) return `${letters} ${digits}`;

  return `${letters} ${digits.slice(0, -YEAR_DIGITS)}-${digits.slice(-YEAR_DIGITS)}`;
}

/**
 * A plate as it should be stored: shaped where it can be, and otherwise trimmed,
 * single-spaced and upper case. Empty means the rider cleared the field, which
 * is a null column rather than a blank string.
 *
 * Lived in `$lib/server/data/courier` before the format existed; the shaping is
 * why it moved, since a client now applies the same rule as it is typed.
 */
export function normalisePlate(value: string | null | undefined) {
  const shaped = formatPlate(value);

  return shaped.length > 0 ? shaped : null;
}

/**
 * The typing form, applied on every keystroke.
 *
 * The serial is assumed to be four digits, because it nearly always is and a
 * hyphen that slid one place left on every keystroke would be its own kind of
 * noise. A rider whose serial is shorter types the hyphen themselves, and this
 * honours it — which is also what makes the mask idempotent over its own output.
 */
export function maskPlate(raw: string) {
  const upper = raw.toUpperCase();
  const clean = significant(upper);
  if (clean.length === 0) return '';

  const letters = clean.match(/^[A-Z]{0,2}/)?.[0] ?? '';
  const rest = clean.slice(letters.length);

  // Still typing the region code.
  if (rest.length === 0) return letters;

  // Anything past here is only a plate if it is two letters and then digits.
  // A rider whose plate is shaped otherwise keeps whatever they typed.
  if (!/^[A-Z]{2}$/.test(letters) || !/^\d+$/.test(rest)) return upper;
  if (rest.length > SERIAL_DIGITS + YEAR_DIGITS) return upper;

  const cut = upper.lastIndexOf('-');
  const typedSerial = cut >= 0 ? upper.slice(0, cut).replace(/\D/g, '') : '';
  const theirs = typedSerial.length > 0;

  const [serial, year] = theirs
    ? [typedSerial.slice(0, SERIAL_DIGITS), upper.slice(cut + 1).replace(/\D/g, '')]
    : [rest.slice(0, SERIAL_DIGITS), rest.slice(SERIAL_DIGITS)];

  if (year.length > 0) return `${letters} ${serial}-${year}`;

  // A hyphen typed with nothing yet behind it stays put. Dropping it until the
  // year arrived meant a rider with a three-digit serial could never place it:
  // the keystroke vanished, and the next digit was read as a fourth serial
  // digit — `GR 123-11` came out as `GR 1231-1`.
  return theirs ? `${letters} ${serial}-` : `${letters} ${serial}`;
}
