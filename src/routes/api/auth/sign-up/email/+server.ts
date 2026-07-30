import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST(event: RequestEvent) {
	try {
		const body = await event.request.json();
		const { email, password, name, phoneNumber } = body;

		if (!email || !password || !name) {
			return json({ error: 'Email, password, and name are required' }, { status: 400 });
		}

		// Demo mode: accept any sign-up
		// In production, this would create a user via Better Auth
		const role = event.url.searchParams.get('role') || 'business';
		const displayName = name || email.split('@')[0] || 'Demo User';

		const session = {
			userId: crypto.randomUUID(),
			name: displayName,
			email,
			role,
			phoneNumber: phoneNumber ?? null
		};

		event.cookies.set('yada_session', JSON.stringify(session), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7 // 7 days
		});

		return json({ data: { user: session } });
	} catch (error) {
		return json({ error: 'Unable to sign up.' }, { status: 500 });
	}
}