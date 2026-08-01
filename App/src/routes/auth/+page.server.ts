import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';

import { env } from '$env/dynamic/private';

import { saveCourierProfile } from '$lib/server/data/courier';

import { authErrorMessage } from './errors';
import { auth, toAuthRole } from './auth.server';
import { firstProblem, resetSchema, signInSchema, signUpSchema } from './schemas';

/**
 * Where a role belongs once signed in — couriers to their home, everyone else
 * to the dashboard. The workspace layout gates and the landing page carry the
 * same two URLs inline; this helper exists because this file redirects on
 * three separate paths.
 */
function homeFor(role: string | null | undefined) {
	return role === 'courier' ? '/home' : '/dashboard';
}

/**
 * What the form gets back after a rejected submit: the values worth restoring,
 * plus which step to reopen on. The step matters now that sign-up is more than
 * one screen — a rejected email is on the first step, and dropping the visitor
 * on the last one leaves them staring at a field that is perfectly fine.
 */
type Fields = {
	email?: string;
	name?: string;
	phone?: string;
	role?: string;
	step?: number;
};

/** Whether Google sign-in can actually be started. */
function googleConfigured() {
	return Boolean(env.OAUTH_GOOGLE_CLIENT_ID && env.OAUTH_GOOGLE_CLIENT_SECRET);
}

/**
 * Turn a thrown Better Auth error into copy for the form.
 *
 * `auth.api.*` throws `APIError` rather than returning a response, and its
 * `body.code` is the same vocabulary the client used to read off the wire — so
 * the existing code→copy map applies unchanged. Anything that isn't an
 * `APIError` is a bug, not a rejected credential, and is re-thrown.
 */
function messageFor(error: unknown, fallback: string) {
	if (!(error instanceof APIError)) return null;

	const body = error.body as { code?: string } | undefined;
	return authErrorMessage(body?.code ?? null, error.statusCode ?? null, fallback);
}

export async function load({ locals }) {
	if (locals.user) {
		redirect(303, homeFor(locals.user.role));
	}

	// The button renders either way — it is part of the page's shape, and hiding
	// it until credentials exist would mean nobody sees the layout it belongs to.
	// Disabled is the honest state for a provider that can't be reached yet.
	return { googleEnabled: googleConfigured() };
}

export const actions = {
	signin: async ({ request }) => {
		const data = await request.formData();
		const fields: Fields = { email: String(data.get('email') ?? '').trim() };

		const parsed = signInSchema.safeParse({
			email: data.get('email'),
			password: data.get('password'),
			rememberMe: data.get('rememberMe') === 'on'
		});

		if (!parsed.success) {
			return fail(400, { ...fields, message: firstProblem(parsed.error).message });
		}

		const { email, password, rememberMe } = parsed.data;

		try {
			// The `sveltekitCookies` plugin turns the Set-Cookie this produces into
			// `event.cookies.set`, so the session rides out on the redirect below.
			await auth.api.signInEmail({
				body: { email, password, rememberMe },
				headers: request.headers
			});
		} catch (error) {
			const message = messageFor(error, 'Unable to sign in.');
			if (message === null) throw error;

			return fail(400, { ...fields, message });
		}

		// Read the role from the session that was just created rather than trusting
		// anything the form said — the form never says.
		const session = await auth.api.getSession({ headers: request.headers });

		redirect(303, homeFor(session?.user ? toAuthRole(session.user.role) : null));
	},

	signup: async ({ request }) => {
		const data = await request.formData();
		// `toAuthRole` clamps anything unexpected to `business`; the create hook in
		// ./auth.server clamps it again, so a forged value can't mint an admin.
		const role = toAuthRole(data.get('role'));

		// Echoed back on a rejection so the form can refill itself, straight off
		// the request rather than from the parse — a value the schema rejected is
		// exactly the one the visitor needs to see and correct.
		const fields: Fields = {
			email: String(data.get('email') ?? '').trim(),
			name: String(data.get('name') ?? '').trim(),
			phone: String(data.get('phone') ?? '').trim(),
			role
		};

		const parsed = signUpSchema.safeParse({
			role,
			name: data.get('name') ?? '',
			email: data.get('email') ?? '',
			phone: data.get('phone') ?? '',
			password: data.get('password') ?? '',
			image: String(data.get('image') ?? '').trim() || undefined
		});

		if (!parsed.success) {
			// The step comes from which field failed, so a courier is returned to the
			// half of the form the problem is actually on.
			const problem = firstProblem(parsed.error);
			return fail(400, { ...fields, step: problem.step, message: problem.message });
		}

		// `phone` comes back normalised to +233…, which is what makes the unique
		// constraint on that column mean one number per account.
		const { name, email, phone, password, image } = parsed.data;

		let createdUserId: string;

		try {
			const created = await auth.api.signUpEmail({
				body: {
					email,
					password,
					name,
					// `role` is declared `input: false`, so Better Auth drops it from the
					// *typed* body — but the `user.create.before` hook in ./auth.server
					// reads it off the raw body and clamps it through `toAuthRole`. Passing
					// it here is how sign-up picks a workspace; the cast only silences the
					// narrowed type, it doesn't widen what the server will accept.
					role,
					phoneNumber: phone,
					// `image` is a Better Auth user field, so it needs no hook of its own.
					...(role === 'courier' && image ? { image } : {})
				} as unknown as NonNullable<Parameters<typeof auth.api.signUpEmail>[0]>['body'],
				headers: request.headers
			});

			createdUserId = created.user.id;
		} catch (error) {
			const message = messageFor(error, 'Unable to create your account.');
			if (message === null) throw error;

			// Better Auth rejects on the credentials — a taken email, a password it
			// dislikes — which live on the first step either way.
			return fail(400, { ...fields, step: 0, message });
		}

		// Outside the block above so a failure here isn't reported as a rejected
		// credential: the account exists by this point, and a profile that didn't
		// write is a server fault, not something the visitor can fix by retyping.
		//
		// A business has no row to write yet — its dispatch address is set on
		// /request, on the map it gets pinned on.
		if (role === 'courier') {
			await saveCourierProfile(createdUserId);
		}

		redirect(303, homeFor(role));
	},

	/**
	 * Start the Google flow.
	 *
	 * A form action rather than a client call, so the button is an ordinary
	 * submit: `signInSocial` hands back the provider's authorize URL and this
	 * redirects to it, which works the same with JavaScript off.
	 *
	 * Known gap for when the credentials land: a social sign-up has no role on it,
	 * and `user.create.before` in ./auth.server clamps a missing role to
	 * `business`. So this creates business accounts. A courier arriving through
	 * Google needs the intended role carried across the redirect — or a "which are
	 * you?" prompt on first landing — before the button is offered on their side.
	 */
	google: async ({ request, url }) => {
		if (!googleConfigured()) {
			return fail(400, {
				message: 'Google sign-in is not configured yet — use your email and password for now.'
			});
		}

		let authorizeUrl: string | undefined;

		try {
			({ url: authorizeUrl } = await auth.api.signInSocial({
				body: {
					provider: 'google',
					callbackURL: `${url.origin}/dashboard`,
					errorCallbackURL: `${url.origin}/auth`
				},
				headers: request.headers
			}));
		} catch (error) {
			const message = messageFor(error, 'Unable to start Google sign-in.');
			if (message === null) throw error;

			return fail(400, { message });
		}

		if (!authorizeUrl) {
			return fail(502, { message: 'Google did not return a sign-in link. Try again.' });
		}

		// Outside the block above: `redirect` works by throwing, and inside a catch
		// that inspects errors it would be mistaken for a failure.
		redirect(303, authorizeUrl);
	},

	reset: async ({ request, url }) => {
		const data = await request.formData();
		const typed = String(data.get('email') ?? '').trim();

		const parsed = resetSchema.safeParse({ email: data.get('email') });
		if (!parsed.success) {
			return fail(400, { email: typed, message: firstProblem(parsed.error).message });
		}

		const { email } = parsed.data;

		try {
			await auth.api.requestPasswordReset({
				body: { email, redirectTo: `${url.origin}/reset-password` },
				headers: request.headers
			});
		} catch (error) {
			const message = messageFor(error, 'Unable to send a reset link.');
			if (message === null) throw error;

			return fail(400, { email, message });
		}

		// Deliberately not "we sent it": saying so for any address would tell an
		// attacker which emails have accounts.
		return { email, sent: true };
	}
};
