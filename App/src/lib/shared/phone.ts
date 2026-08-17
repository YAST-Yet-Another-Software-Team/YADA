/**
 * A Ghanaian mobile number in its three forms.
 *
 * One stored spelling, one readable spelling, and one that keeps up with a
 * person mid-keystroke. They live here rather than beside the zod schema
 * because `$lib/server` cannot be imported by a component, and the field that
 * needs the grouping most is the one being typed into.
 *
 * The *significant* part of the number is nine digits — the national part,
 * without the `0` or the `233` in front of it. Everything below is that idea
 * spelled three ways.
 */

/** The spellings a person may type, and the schema will accept. */
export const PHONE_PATTERN = /^(0\d{9}|\+?233\d{9})$/;

const COUNTRY_CODE = '233';

/** Nine digits. Ghana's mobile numbers are `0XX XXX XXXX` behind the code. */
const NATIONAL_DIGITS = 9;

/**
 * The national digits, whatever spelling they arrived in.
 *
 * `+233 24 123 4567`, `233241234567`, `024 123 4567` and `0241234567` all
 * reduce to `241234567` — which is the whole point: `users.phone_number` is
 * unique, so two spellings of one phone must not be two accounts.
 */
export function phoneDigits(value: string | null | undefined) {
  const digits = (value ?? '').replace(/\D/g, '');

  const national = digits.startsWith(COUNTRY_CODE)
    ? digits.slice(COUNTRY_CODE.length)
    : digits.startsWith('0')
      ? digits.slice(1)
      : digits;

  return national.slice(0, NATIONAL_DIGITS);
}

/**
 * The stored form: E.164, no spaces. What the database column holds and what a
 * `tel:` href dials.
 *
 * Empty in, empty out — clearing the field on a profile screen has to stay a
 * way of saying "no number", not a way of saving a bare country code.
 */
export function normalisePhone(value: string | null | undefined) {
  const digits = phoneDigits(value);

  return digits.length > 0 ? `+${COUNTRY_CODE}${digits}` : '';
}

/**
 * The reading form: `+233 24 123 4567`.
 *
 * Anything that is not a complete Ghanaian number comes back untouched. A
 * half-formatted foreign number, or a row of junk from before this existed,
 * should look like what it is rather than be dressed up as a valid one.
 */
export function formatPhone(value: string | null | undefined) {
  const digits = phoneDigits(value);

  if (digits.length !== NATIONAL_DIGITS) return value ?? '';

  return `+${COUNTRY_CODE} ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
}

/**
 * The typing form: the same grouping, applied to whatever is in the field so
 * far. `0` → `+233 `, `024` → `+233 24`, `0241` → `+233 24 1`.
 *
 * The country code is treated as *ours* once it is on screen: a value that
 * still starts with `+` is one this function wrote, so its first three digits
 * are the code whatever they now say. That is what makes backspacing into the
 * prefix repair it rather than promote a stray `23` to a national number — and
 * deleting past the code entirely is how the field is emptied.
 */
export function maskPhone(raw: string) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return '';

  const ours = raw.trimStart().startsWith('+');
  const national = (
    ours || digits.startsWith(COUNTRY_CODE)
      ? digits.slice(COUNTRY_CODE.length)
      : digits.startsWith('0')
        ? digits.slice(1)
        : digits
  ).slice(0, NATIONAL_DIGITS);

  if (national.length === 0) {
    return ours && digits.length < COUNTRY_CODE.length ? '' : `+${COUNTRY_CODE} `;
  }

  const groups = [national.slice(0, 2), national.slice(2, 5), national.slice(5)];

  return `+${COUNTRY_CODE} ${groups.filter((group) => group.length > 0).join(' ')}`;
}
