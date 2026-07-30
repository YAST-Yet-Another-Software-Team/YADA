import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET(event: RequestEvent) {
	const sessionCookie = event.cookies.get('yada_session');

	if (sessionCookie) {
		try {
			const session = JSON.parse(sessionCookie);
			return json({
				data: {
					user: {
						id: session.userId,
						name: session.name,
						email: session.email,
						role: session.role,
						phoneNumber: session.phoneNumber ?? null,
						image: null
					}
				}
			});
		} catch {
			// Invalid cookie
		}
	}

	return json({ data: null }, { status: 200 });
}