import { eq } from 'drizzle-orm';

import { db } from '../db';
import { users } from '../db/schema';

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
