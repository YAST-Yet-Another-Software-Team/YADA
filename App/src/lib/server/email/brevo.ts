import type { EmailAddress, EmailMessage, EmailTransport } from './types';

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

/**
 * Give up rather than hold a Worker open. The send is dispatched through
 * `waitUntil` so nobody is watching a spinner, but a request that never
 * settles would keep the isolate alive until the platform kills it.
 */
const TIMEOUT_MS = 8000;

/**
 * Brevo's transactional endpoint, over plain `fetch`.
 *
 * Chosen over Resend/SendGrid/MailerSend for one reason: this app is served
 * from a `*.workers.dev` subdomain, so there is no DNS to publish SPF and DKIM
 * records into and domain authentication is impossible. Brevo will verify a
 * single sender *address* — it emails you a link, you click it — and gives 300
 * sends a day on the free tier indefinitely.
 *
 * Deliberately not the `@getbrevo/brevo` SDK: it is built on axios, which
 * needs Node's http stack and does not run on workerd.
 */
export function brevoTransport(apiKey: string, from: EmailAddress): EmailTransport {
  return {
    name: 'brevo',

    async send(message: EmailMessage) {
      const response = await fetch(BREVO_ENDPOINT, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          accept: 'application/json',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { email: from.email, name: from.name },
          to: [{ email: message.to.email, name: message.to.name }],
          subject: message.subject,
          htmlContent: message.html,
          textContent: message.text
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });

      if (!response.ok) {
        // Brevo puts the useful part in the body — an unverified sender and a
        // bad key both come back as 401 with different messages.
        const detail = await response.text().catch(() => '');
        throw new Error(`Brevo responded ${response.status}: ${detail.slice(0, 400)}`);
      }
    }
  };
}
