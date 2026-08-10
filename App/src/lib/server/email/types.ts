/**
 * The seam between "what we want to say" and "who carries it".
 *
 * Everything provider-specific lives behind `EmailTransport`, so the app can
 * move off Brevo — to Resend, once this deployment has a domain of its own —
 * by writing one new transport and changing one line in ./index. No template,
 * route or auth config knows which provider is in use.
 */

export type EmailAddress = {
  email: string;
  name?: string;
};

export type EmailMessage = {
  to: EmailAddress;
  subject: string;
  html: string;
  /**
   * Never optional. A multipart message with no plain-text alternative scores
   * badly with spam filters, and this deployment sends from an address it
   * cannot DKIM-sign for — it needs every point it can get.
   */
  text: string;
};

export type EmailTransport = {
  /** For log lines, so it is obvious which one ran. */
  readonly name: string;
  send(message: EmailMessage): Promise<void>;
};
