import { redirect } from '@sveltejs/kit';

/**
 * Gate for the whole business workspace — dashboard, request, tracking,
 * history. Signed-out visitors go to the sign-in page; signed-in couriers are
 * sent to their own home rather than shown an error.
 */
export async function load({ locals }) {
	const user = locals.user;

	if (!user) {
		redirect(303, '/auth');
	}

	if (user.role !== 'business') {
		redirect(303, '/courier/home');
	}

	return { user };
}
