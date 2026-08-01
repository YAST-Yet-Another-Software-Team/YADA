import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';

import { saveBusinessAddress } from '$lib/server/data/business';
import { containsPoint } from '$lib/shared/geo/service-area';
import { geoErrorMessage } from '$lib/shared/geo/errors';

import { authErrorMessage } from './errors';
import { auth, toAuthRole } from './auth.server';

/**
 * Better Auth's default `minPasswordLength`. Checked here as well as by Better
 * Auth so the form can point at the password field instead of showing a generic
 * banner, and so the rule survives with JavaScript disabled.
 */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Where a role belongs once signed in — couriers to their home, everyone else
 * to the dashboard. The workspace layout gates and the landing page carry the
 * same two URLs inline; this helper exists because this file redirects on
 * three separate paths.
 */
function homeFor(role: string | null | undefined) {
	return role === 'courier' ? '/courier/home' : '/dashboard';
}

type Fields = {
	email?: string;
	name?: string;
	phone?: string;
	role?: string;
};

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

	return {};
}

export const actions = {
	signin: async ({ request }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim();
		const password = String(data.get('password') ?? '');
		const rememberMe = data.get('rememberMe') === 'on';
		const fields: Fields = { email };

		if (!email.includes('@')) {
			return fail(400, { ...fields, message: 'Enter a valid email address.' });
		}

		if (!password) {
			return fail(400, { ...fields, message: 'Enter your password.' });
		}

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
		const email = String(data.get('email') ?? '').trim();
		const password = String(data.get('password') ?? '');
		const name = String(data.get('name') ?? '').trim();
		const phone = String(data.get('phone') ?? '').trim();
		// `toAuthRole` clamps anything unexpected to `business`; the create hook in
		// ./auth.server clamps it again, so a forged value can't mint an admin.
		const role = toAuthRole(data.get('role'));
		const address = String(data.get('address') ?? '').trim();
		const lat = Number(data.get('lat'));
		const lng = Number(data.get('lng'));
		const fields: Fields = { email, name, phone, role };

		if (!email.includes('@')) {
			return fail(400, { ...fields, message: 'Enter a valid email address.' });
		}

		if (name.length < 2) {
			return fail(400, {
				...fields,
				message: role === 'business' ? 'Enter your business name.' : 'Enter your full name.'
			});
		}

		if (role === 'courier' && phone.length < 7) {
			return fail(400, { ...fields, message: 'Enter a phone number we can reach you on.' });
		}

		// A business without a dispatch address can't request anything, so the
		// address is part of creating the account rather than a later prompt. The
		// pin is re-checked here because the form only carries what the map wrote.
		if (role === 'business') {
			if (!address || !Number.isFinite(lat) || !Number.isFinite(lng)) {
				return fail(400, {
					...fields,
					message: 'Pin your business location on the map so riders know where to collect.'
				});
			}

			if (!containsPoint({ lat, lng })) {
				return fail(400, { ...fields, message: geoErrorMessage('out_of_zone') });
			}
		}

		if (password.length < MIN_PASSWORD_LENGTH) {
			return fail(400, {
				...fields,
				message: `Your password is too short — use at least ${MIN_PASSWORD_LENGTH} characters.`
			});
		}

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
					...(role === 'courier' ? { phoneNumber: phone } : {})
				} as unknown as NonNullable<Parameters<typeof auth.api.signUpEmail>[0]>['body'],
				headers: request.headers
			});

			createdUserId = created.user.id;
		} catch (error) {
			const message = messageFor(error, 'Unable to create your account.');
			if (message === null) throw error;

			return fail(400, { ...fields, message });
		}

		// Outside the block above so a failure here isn't reported as a rejected
		// credential: the account exists by this point, and a profile that didn't
		// write is a server fault, not something the visitor can fix by retyping.
		if (role === 'business') {
			await saveBusinessAddress(createdUserId, { businessName: name, address, lat, lng });
		}

		redirect(303, homeFor(role));
	},

	reset: async ({ request, url }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim();

		if (!email.includes('@')) {
			return fail(400, { email, message: 'Enter a valid email address.' });
		}

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
