/**
 * The two transactional emails this app sends.
 *
 * Both are built for a deployment that cannot DKIM-sign its own From domain
 * (see ./brevo), so every choice here is also a deliverability choice: table
 * layout and inline styles because mail clients strip stylesheets, no images
 * and no tracking pixel because both cost spam points and buy nothing, and a
 * full plain-text alternative on every message.
 */

/** Brand primary — `--color-primary`, kept in sync with $lib/styles/map-colors. */
const BRAND = '#e4312f';
const INK = '#1c1917';
const INK_SOFT = '#57534e';
const PAGE = '#f5f5f4';
const BORDER = '#e7e5e4';

export type MailTemplate = {
  subject: string;
  html: string;
  text: string;
};

type Body = {
  /** Shown above the button. One or two short sentences. */
  lead: string;
  buttonLabel: string;
  url: string;
  /** "This link works for the next hour." */
  expiry: string;
  /** What to do if they didn't ask for this. */
  footer: string;
};

/**
 * `user.name` is whatever the person typed at sign-up, and it is being
 * interpolated into markup. Escaped rather than trusted.
 */
function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function greeting(name?: string) {
  const trimmed = name?.trim();
  // Only the first word: "Hi Kwame" reads like a person wrote it, "Hi Kwame
  // Mensah Enterprises Ltd" does not.
  return trimmed ? `Hi ${trimmed.split(/\s+/)[0]},` : 'Hi,';
}

function layout(heading: string, name: string | undefined, body: Body) {
  const safeUrl = escapeHtml(body.url);

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px 12px;background:${PAGE};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
      <tr>
        <td style="background:${BRAND};padding:20px 28px;">
          <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.02em;">YADA</span>
        </td>
      </tr>
      <tr>
        <td style="padding:28px;">
          <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:${INK};">${escapeHtml(heading)}</h1>
          <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:${INK};">${escapeHtml(greeting(name))}</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${INK};">${escapeHtml(body.lead)}</p>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="border-radius:8px;background:${BRAND};">
                <a href="${safeUrl}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(body.buttonLabel)}</a>
              </td>
            </tr>
          </table>

          <p style="margin:24px 0 6px;font-size:13px;line-height:1.6;color:${INK_SOFT};">Or paste this into your browser:</p>
          <p style="margin:0 0 24px;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${safeUrl}" style="color:${BRAND};">${safeUrl}</a></p>

          <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:${INK_SOFT};">${escapeHtml(body.expiry)}</p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:${INK_SOFT};">${escapeHtml(body.footer)}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 28px;border-top:1px solid ${BORDER};">
          <p style="margin:0;font-size:12px;color:${INK_SOFT};">YADA — deliveries across Kumasi.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * The plain-text alternative. The URL sits alone on its own line — that is
 * what makes it clickable in a terminal under the console transport, and it
 * is the most reliable shape for text-mode mail clients too.
 */
function plain(name: string | undefined, body: Body) {
  return [
    greeting(name),
    '',
    body.lead,
    '',
    body.url,
    '',
    body.expiry,
    body.footer,
    '',
    '— YADA'
  ].join('\n');
}

export function verifyEmailTemplate(options: { name?: string; url: string }): MailTemplate {
  const body: Body = {
    lead: 'Confirm this email address to finish setting up your YADA account.',
    buttonLabel: 'Confirm my email',
    url: options.url,
    expiry: 'This link works for the next 24 hours.',
    footer: "If you didn't create a YADA account, you can ignore this email."
  };

  return {
    subject: 'Confirm your email — YADA',
    html: layout('Confirm your email', options.name, body),
    text: plain(options.name, body)
  };
}

export function resetPasswordTemplate(options: { name?: string; url: string }): MailTemplate {
  const body: Body = {
    lead: 'Someone asked to reset the password on your YADA account. Use the link below to choose a new one.',
    buttonLabel: 'Choose a new password',
    url: options.url,
    expiry: 'This link works for the next hour, and only once.',
    footer:
      "If you didn't ask for this, ignore this email — your password stays as it is."
  };

  return {
    subject: 'Reset your password — YADA',
    html: layout('Reset your password', options.name, body),
    text: plain(options.name, body)
  };
}
