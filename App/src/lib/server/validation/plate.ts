import { z } from 'zod';

/**
 * A motorbike's number plate, as three writers now accept it: sign-up, the
 * finish-setup screen, and `PUT /api/courier/profile`.
 *
 * Deliberately loose about *format* — Ghanaian plates are "GT 4521-20" but a
 * rider whose plate doesn't match the pattern still has to be able to type it,
 * and a business identifying a bike at the counter reads whatever is on it.
 * The rules only keep out what could not be a plate at all.
 *
 * An empty string is allowed here because it is how the settings form says "I
 * cleared this"; the callers that *require* a plate say so themselves.
 * Normalisation (trim, collapse, uppercase, empty → null) belongs to
 * `normalisePlate` in `$lib/server/data/courier-profile`, not here.
 */
export const plateNumber = z
	.string()
	.max(16, 'That plate is too long.')
	.regex(/^[A-Za-z0-9 -]*$/, 'A plate is letters, numbers, spaces and dashes.');
