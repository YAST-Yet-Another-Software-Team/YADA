import { z } from 'zod';

import { normalisePhone, PHONE_PATTERN } from '$lib/shared/phone';

/**
 * A Ghanaian mobile number, normalised to E.164.
 *
 * `users.phone_number` is unique, so "0244123456" and "+233244123456" would
 * otherwise be two accounts for one phone. Accepting the spellings people
 * actually type and storing one of them is the point of parsing rather than
 * merely checking.
 *
 * The rules themselves live in `$lib/shared/phone`, because the fields that
 * write this column now group the digits as they are typed and a component
 * cannot import `$lib/server`. This is the same check, said once.
 *
 * Shared by the two screens that can write the column: sign-up, and the
 * finish-setup screen a Google account lands on — where the number is the one
 * thing Google cannot supply.
 */
export const phoneNumber = z
	.string()
	.transform((value) => value.replace(/[^\d+]/g, ''))
	.refine((value) => PHONE_PATTERN.test(value), {
		message: 'Enter a 10-digit phone number, like 024 123 4567.'
	})
	.transform(normalisePhone);
