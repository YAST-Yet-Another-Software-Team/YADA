import { env } from '$env/dynamic/private';

import { brevoTransport } from './brevo';
import { consoleTransport } from './console';
import type { EmailMessage } from './types';

export type { EmailMessage, EmailTransport } from './types';
export { resetPasswordTemplate, verifyEmailTemplate } from './templates';

const from = {
  email: env.EMAIL_FROM ?? 'no-reply@yada.local',
  name: env.EMAIL_FROM_NAME ?? 'YADA'
};

/**
 * The one place that knows which provider exists.
 *
 * No key means the console transport, which is the default locally and makes a
 * missing secret degrade to "the mail is in the log" instead of to a crash.
 * `EMAIL_TRANSPORT=console` forces it even where a key is set.
 *
 * Swapping providers is this expression plus one new file — see ./types.
 */
const transport =
  env.EMAIL_TRANSPORT === 'console' || !env.BREVO_API_KEY
    ? consoleTransport()
    : brevoTransport(env.BREVO_API_KEY, from);

/**
 * Send, and never throw.
 *
 * Both callers are paths where failing loudly would be worse than not sending.
 * A password reset answers "check your inbox" for *any* address on purpose —
 * so that a stranger cannot use it to discover who has an account — and a
 * bounced send that turned into a 500 would give that away immediately. On the
 * sign-up path the account already exists by the time this runs; failing the
 * request would leave the user with an account they were told they don't have.
 *
 * The failure surfaces in the logs, and the user has a Resend button.
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  try {
    await transport.send(message);
  } catch (error) {
    console.error(`[email] ${transport.name} failed to send "${message.subject}"`, error);
  }
}
