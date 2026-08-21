import { env } from "$env/dynamic/private";

import { brevoTransport } from "./brevo";
import { consoleTransport } from "./console";
import type { EmailMessage } from "./types";

export type { EmailMessage, EmailTransport } from "./types";
export { resetPasswordTemplate, verifyEmailTemplate } from "./templates";

/**
 * The one place that knows which provider exists.
 *
 * No key means the console transport, which is the default locally and makes a
 * missing secret degrade to "the mail is in the log" instead of to a crash.
 * `EMAIL_TRANSPORT=console` forces it even where a key is set.
 *
 * An unset `EMAIL_FROM` falls back the same way, and that is the interesting
 * case. There used to be a default of `no-reply@yada.local`, which looks like a
 * harmless placeholder and is the exact opposite: Brevo will only send from an
 * address someone has verified by clicking a link, so a made-up one is refused
 * on *every* send. Together with `sendEmail` swallowing transport errors — which
 * it does for a good reason, see below — a single missing variable became total
 * silent failure. It went unnoticed for a month; Brevo's own log showed six
 * requests and six rejections, all reading "the sender you used
 * no-reply@yada.local is not valid".
 *
 * A misconfigured sender is therefore treated exactly like a missing key: use
 * the console, where the mail is at least readable, and say so loudly at
 * start-up rather than failing once per send where nobody is looking.
 *
 * Swapping providers is this function plus one new file — see ./types.
 */
function selectTransport() {
  const apiKey = env.BREVO_API_KEY;
  const fromEmail = env.EMAIL_FROM?.trim();

  if (env.EMAIL_TRANSPORT === "console" || !apiKey) return consoleTransport();

  if (!fromEmail) {
    console.warn(
      "[email] BREVO_API_KEY is set but EMAIL_FROM is not — using the console " +
        "transport instead. Brevo rejects any sender address it has not " +
        "verified, so nothing would have been delivered. Set EMAIL_FROM to an " +
        "address verified under Brevo → Senders.",
    );
    return consoleTransport();
  }

  return brevoTransport(apiKey, {
    email: fromEmail,
    name: env.EMAIL_FROM_NAME ?? "YADA",
  });
}

const transport = selectTransport();

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
    console.error(
      `[email] ${transport.name} failed to send "${message.subject}"`,
      error,
    );
  }
}
