import { env } from "$env/dynamic/private";

/**
 * The two transactional emails this app sends.
 *
 * Every choice here is a deliverability choice as much as a design one, because
 * this deployment cannot DKIM-sign its own From domain (see ./brevo): table
 * layout and inline styles because mail clients strip stylesheets and modern
 * CSS, one small hosted image and no tracking pixel, and a full plain-text
 * alternative on every message.
 */

/** Brand primary — `--color-primary`, kept in sync with $lib/styles/map-colors. */
const BRAND = "#e4312f";
const BRAND_DEEP = "#b32220";
const INK = "#1c1917";
const INK_SOFT = "#57534e";
const INK_FAINT = "#8a8480";
const PAGE = "#f5f5f4";
const PANEL = "#faf9f8";
const BORDER = "#e7e5e4";

/**
 * Where the logo is fetched from.
 *
 * It has to be an absolute, publicly reachable URL. Mail clients strip SVG, and
 * Gmail and Outlook both discard `data:` URIs, so the one thing that works is a
 * hosted PNG — `static/email-logo.png`, served by the Worker alongside the app.
 *
 * A localhost origin is treated as no origin at all. Mail sent from a dev
 * machine still lands in a real inbox, where `http://localhost:5173/...` is a
 * broken-image icon; the lettermark fallback below looks deliberate instead.
 */
const assetOrigin = (env.EMAIL_ASSET_ORIGIN ?? env.BETTER_AUTH_URL ?? "")
  .trim()
  .replace(/\/+$/, "");

const logoUrl =
  assetOrigin && !/localhost|127\.0\.0\.1|\[::1\]/i.test(assetOrigin)
    ? `${assetOrigin}/email-logo.png`
    : null;

export type MailTemplate = {
  subject: string;
  html: string;
  text: string;
};

type Body = {
  /**
   * The one line shown in the inbox list next to the subject. Without it
   * clients scrape the top of the HTML, which here is the word "YADA" repeated.
   */
  preheader: string;
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
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function greeting(name?: string) {
  const trimmed = name?.trim();
  // Only the first word: "Hi Kwame" reads like a person wrote it, "Hi Kwame
  // Mensah Enterprises Ltd" does not.
  return trimmed ? `Hi ${trimmed.split(/\s+/)[0]},` : "Hi,";
}

/**
 * The masthead. An image where one can be fetched, styled text where it cannot.
 *
 * The `alt` is styled rather than left bare because most clients block remote
 * images until the reader allows them, and an unstyled alt renders as small
 * black serif text on a red bar — which reads as broken. Given colour and
 * weight it is simply the wordmark, and most readers never notice which one
 * they got.
 */
function masthead() {
  if (!logoUrl) {
    return `<span style="color:#ffffff;font-size:26px;font-weight:700;letter-spacing:0.08em;">YADA</span>`;
  }

  return `<img src="${escapeHtml(logoUrl)}" width="120" height="74" alt="YADA"
        style="display:block;border:0;outline:none;text-decoration:none;width:120px;height:74px;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:0.08em;" />`;
}

function layout(heading: string, name: string | undefined, body: Body) {
  const safeUrl = escapeHtml(body.url);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${escapeHtml(heading)}</title>
  </head>
  <body style="margin:0;padding:0;background:${PAGE};-webkit-font-smoothing:antialiased;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <!-- Inbox preview line. Hidden in the body, then padded so the client does
         not pull the next visible words in after it. -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
      ${escapeHtml(body.preheader)}${"&#8203;&nbsp;".repeat(60)}
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PAGE};">
      <tr>
        <td align="center" style="padding:32px 12px;">

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:540px;background:#ffffff;border:1px solid ${BORDER};border-radius:14px;overflow:hidden;">
            <tr>
              <td align="center" style="background:${BRAND};padding:26px 28px 22px;">
                ${masthead()}
              </td>
            </tr>

            <tr>
              <td style="padding:32px 32px 28px;">
                <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;font-weight:700;color:${INK};">${escapeHtml(heading)}</h1>
                <p style="margin:0 0 10px;font-size:15px;line-height:1.65;color:${INK};">${escapeHtml(greeting(name))}</p>
                <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:${INK};">${escapeHtml(body.lead)}</p>

                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="border-radius:10px;background:${BRAND};border-bottom:2px solid ${BRAND_DEEP};">
                      <a href="${safeUrl}" style="display:inline-block;padding:14px 30px;font-size:15px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(body.buttonLabel)}</a>
                    </td>
                  </tr>
                </table>

                <p style="margin:28px 0 6px;font-size:13px;line-height:1.6;color:${INK_SOFT};">Button not working? Paste this into your browser:</p>
                <p style="margin:0;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${safeUrl}" style="color:${BRAND};text-decoration:underline;">${safeUrl}</a></p>

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:28px;background:${PANEL};border:1px solid ${BORDER};border-radius:10px;">
                  <tr>
                    <td style="padding:14px 16px;">
                      <p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:${INK_SOFT};">${escapeHtml(body.expiry)}</p>
                      <p style="margin:0;font-size:13px;line-height:1.6;color:${INK_SOFT};">${escapeHtml(body.footer)}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 32px 22px;border-top:1px solid ${BORDER};background:${PANEL};">
                <p style="margin:0;font-size:12px;line-height:1.6;color:${INK_SOFT};font-weight:600;">YADA</p>
                <p style="margin:2px 0 0;font-size:12px;line-height:1.6;color:${INK_FAINT};">Motor courier deliveries around KNUST and Ayeduase, Kumasi.</p>
              </td>
            </tr>
          </table>

          <p style="margin:16px 0 0;font-size:11px;line-height:1.5;color:${INK_FAINT};">This is an automated message — replies to it are not read.</p>

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
    "",
    body.lead,
    "",
    body.url,
    "",
    body.expiry,
    body.footer,
    "",
    "— YADA, motor courier deliveries around KNUST and Ayeduase, Kumasi.",
    "This is an automated message — replies to it are not read.",
  ].join("\n");
}

export function verifyEmailTemplate(options: {
  name?: string;
  url: string;
}): MailTemplate {
  const body: Body = {
    preheader: "Confirm your address to finish setting up your YADA account.",
    lead: "Confirm this email address to finish setting up your YADA account.",
    buttonLabel: "Confirm my email",
    url: options.url,
    expiry: "This link works for the next 24 hours.",
    footer: "If you didn't create a YADA account, you can ignore this email.",
  };

  return {
    subject: "Confirm your email — YADA",
    html: layout("Confirm your email", options.name, body),
    text: plain(options.name, body),
  };
}

export function resetPasswordTemplate(options: {
  name?: string;
  url: string;
}): MailTemplate {
  const body: Body = {
    preheader: "Choose a new password for your YADA account.",
    lead: "Someone asked to reset the password on your YADA account. Use the link below to choose a new one.",
    buttonLabel: "Choose a new password",
    url: options.url,
    expiry: "This link works for the next hour, and only once.",
    footer:
      "If you didn't ask for this, ignore this email — your password stays as it is.",
  };

  return {
    subject: "Reset your password — YADA",
    html: layout("Reset your password", options.name, body),
    text: plain(options.name, body),
  };
}
