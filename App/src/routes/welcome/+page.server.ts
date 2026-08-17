import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';

import {
	accountCompletion,
	completeAccount,
	isDuplicatePhone
} from '$lib/server/data/account';
import { getCourierProfile, saveCourierProfile } from '$lib/server/data/courier';
import { photoDataUrl } from '$lib/server/validation/photo';
import { phoneNumber } from '$lib/server/validation/phone';
import { plateNumber } from '$lib/server/validation/plate';

import type { Actions } from './$types';

/** Same two destinations the auth page and the workspace guards use. */
function homeFor(role: string) {
	return role === 'courier' ? '/home' : '/dashboard';
}

/**
 * Finish an account that signed up with Google.
 *
 * Google supplies a name, an email and often a picture. It cannot supply a
 * phone number, it does not know which workspace someone came for unless the
 * sign-up toggle told us, and it certainly does not know a number plate — so
 * everything the email form asks for and OAuth cannot answer is asked here,
 * once, before the workspace opens.
 *
 * Lives at the top level rather than in `(business)` or `(courier)`: those
 * layouts redirect on role, and a screen whose job is partly to *set* the role
 * cannot sit behind a guard that acts on it.
 */
export async function load({ locals }) {
	const user = locals.user;
	if (!user) redirect(303, '/auth');

	const { complete, missing } = await accountCompletion(user);

	// Nothing left to ask. Reached by a bookmark, a back button, or a second tab
	// that finished first.
	if (complete) redirect(303, homeFor(user.role));

	const profile = user.role === 'courier' ? await getCourierProfile(user.id) : null;

	return {
		account: {
			name: user.name,
			email: user.email,
			role: user.role,
			phone: user.phone ?? '',
			/** Whatever Google gave us, offered back as a photo they can keep. */
			image: user.image,
			plate: profile?.plateNumber ?? ''
		},
		missing
	};
}

const completionSchema = z
	.object({
		role: z.enum(['business', 'courier']),
		phone: phoneNumber,
		plate: z.string().optional(),
		image: z.string().optional()
	})
	.superRefine((value, ctx) => {
		if (value.role !== 'courier') return;

		// Same two requirements as a courier's email sign-up, in the same order
		// they are rendered — the screen shows the first complaint.
		const plate = value.plate?.trim() ?? '';
		if (!plate) {
			ctx.addIssue({
				code: 'custom',
				path: ['plate'],
				message: 'Add your number plate so businesses can spot your bike.'
			});
		} else {
			const parsed = plateNumber.safeParse(plate);
			if (!parsed.success) {
				ctx.addIssue({ code: 'custom', path: ['plate'], message: parsed.error.issues[0].message });
			}
		}

		if (!value.image) {
			ctx.addIssue({
				code: 'custom',
				path: ['image'],
				message: 'Add a profile photo so businesses can recognise you.'
			});
			return;
		}

		const parsed = photoDataUrl.safeParse(value.image);
		if (!parsed.success) {
			ctx.addIssue({ code: 'custom', path: ['image'], message: parsed.error.issues[0].message });
		}
	});

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) redirect(303, '/auth');

		// The same gate the load applies, restated here because a form post does
		// not go through it. Without this, any signed-in account could post to
		// this action and move itself between workspaces — the role is settable
		// here only for as long as it has never been settled.
		const { complete } = await accountCompletion(user);
		if (complete) redirect(303, homeFor(user.role));

		const data = await request.formData();
		const typed = {
			phone: String(data.get('phone') ?? '').trim(),
			plate: String(data.get('plate') ?? '').trim()
		};

		const parsed = completionSchema.safeParse({
			role: data.get('role') ?? user.role,
			phone: data.get('phone') ?? '',
			plate: typed.plate || undefined,
			image: String(data.get('image') ?? '').trim() || undefined
		});

		if (!parsed.success) {
			return fail(400, { ...typed, message: parsed.error.issues[0].message });
		}

		const { role, phone, plate, image } = parsed.data;

		try {
			await completeAccount(user.id, {
				role,
				phoneNumber: phone,
				// A business keeps whatever Google gave it; only a courier's photo is
				// re-saved through our own downscale, so `image` is absent for one and
				// a data URL for the other.
				...(image ? { image } : {})
			});
		} catch (error) {
			if (isDuplicatePhone(error)) {
				return fail(400, {
					...typed,
					message: 'That phone number is already on another account.'
				});
			}

			throw error;
		}

		// The row this whole screen exists for. Without it a courier is invisible
		// to dispatch while being told they are online.
		if (role === 'courier') {
			await saveCourierProfile(user.id, { plateNumber: plate ?? null });
		}

		redirect(303, homeFor(role));
	}
};
