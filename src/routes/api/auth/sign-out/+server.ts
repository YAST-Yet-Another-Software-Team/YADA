import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST(event: RequestEvent) {
	event.cookies.delete('yada_session', { path: '/' });
	return json({ ok: true });
}