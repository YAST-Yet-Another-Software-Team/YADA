import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST(event: RequestEvent) {
	try {
		const body = await event.request.json();
		const { email, password } = body;

		if (!email || !password) {
			return json({ error: 'Email and password are required' }, { status: 400 });
		}

		// Demo mode: accept any valid-looking credentials
		const name = email.split('@')[0] || 'Demo User';
		const role = 'business';

		const session = {
			userId: crypto.randomUUID(),
			name,
			email,
			role,
			phoneNumber: null
		};

		event.cookies.set('yada_session', JSON.stringify(session), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7 // 7 days
		});

		return json({ data: { user: session } });
	} catch (error) {
		return json({ error: 'Unable to sign in.' }, { status: 500 });
	}
}