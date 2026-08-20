import { eq } from 'drizzle-orm';

import type { AuthRole, SessionUser } from '$lib/utils/types';

import { db } from '../db';
import { users } from '../db/schema';
import { getCourierProfile } from './courier-profile';

/**
 * Set — or clear — the account's profile photo.
 *
 * Written here rather than through Better Auth's `update-user` because that
 * endpoint takes `image` as an unbounded string: nothing in it enforces the
 * data-URL scheme or the length cap the column is sized around. The photo route
 * validates first (see `$lib/server/validation/photo`) and then writes the row
 * directly, so the only way into this column is through those rules.
 *
 * `null` removes the photo and falls the UI back to initials.
 */
export async function setUserImage(userId: string, image: string | null) {
	await db.update(users).set({ image, updatedAt: new Date() }).where(eq(users.id, userId));
}

/**
 * Fill in the parts of an account that its sign-up never captured.
 *
 * One writer, for the /welcome screen a Google account lands on. Google hands
 * over a name, an email and sometimes a picture — never a phone number, and it
 * has no idea which workspace the person came for.
 *
 * Direct drizzle rather than Better Auth: `role` is declared `input: false` in
 * the auth config precisely so that no request body can set it, which means
 * `update-user` refuses it too. Writing it here is the deliberate exception,
 * and it is reachable only from a screen that has already established who the
 * session belongs to.
 */
export async function completeAccount(
	userId: string,
	fields: { role?: AuthRole; phoneNumber?: string; image?: string | null }
) {
	await db
		.update(users)
		.set({
			...(fields.role === undefined ? {} : { role: fields.role }),
			...(fields.phoneNumber === undefined ? {} : { phoneNumber: fields.phoneNumber }),
			...(fields.image === undefined ? {} : { image: fields.image }),
			updatedAt: new Date()
		})
		.where(eq(users.id, userId));
}

/**
 * Whether the phone number a write was rejected for is already on file.
 *
 * `users.phone_number` is unique — that uniqueness is what makes one number
 * mean one account — so a collision is an ordinary outcome of typing, not a
 * server fault, and the screen has to say which field is at fault. Postgres
 * reports it as SQLSTATE 23505.
 *
 * The chain has to be walked because drizzle wraps driver errors: what reaches
 * a caller is a `DrizzleQueryError` carrying the query text, with the Postgres
 * error — the one holding `code` and `constraint` — hanging off `cause`.
 */
export function isDuplicatePhone(error: unknown) {
	for (let current = error, depth = 0; current && depth < 4; depth++) {
		const { code, constraint } = current as { code?: unknown; constraint?: unknown };

		if (code === '23505') {
			const target = String(constraint ?? '');
			// An unnamed constraint is treated as this one: the only unique column
			// this write can collide on is the phone number.
			return target === '' || target.includes('phone');
		}

		current = (current as { cause?: unknown }).cause;
	}

	return false;
}

/**
 * What an account is still missing before its workspace will work.
 *
 * Email sign-up cannot produce an incomplete account — the form asks for
 * everything in one go — so in practice this describes accounts that arrived
 * through Google, and anyone who closed the tab on /welcome before finishing.
 *
 * A courier is the strict case, and not for tidiness: without a
 * `courier_profiles` row `setCourierAvailability` and `POST /api/location`
 * update zero rows while still answering `ok`, so the rider is told they are
 * online while dispatch cannot see them at all. A plate implies that row
 * exists, which is why it stands in for the row check.
 */
export async function accountCompletion(user: SessionUser) {
	const missing: string[] = [];

	// A business needs only a number: its address is captured on /request, on
	// the map it gets pinned on.
	if (!user.phone) missing.push('phone');

	if (user.role === 'courier') {
		if (!user.image) missing.push('image');

		// Skipped when something already known is missing — the answer is the
		// same and this is the only part that costs a query.
		if (missing.length === 0) {
			const { plateNumber } = await getCourierProfile(user.id);
			if (!plateNumber) missing.push('plate');
		}
	}

	return { complete: missing.length === 0, missing };
}
