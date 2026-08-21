import type { EmailMessage, EmailTransport } from "./types";

/**
 * The development transport: print the mail instead of sending it.
 *
 * This is the whole local test loop for both flows. No API key, no inbox, and
 * no sends burned against the daily quota while iterating — every template
 * puts its link on a line of its own in the text part, which terminals render
 * as a clickable URL, so the reset and verify journeys can be walked end to
 * end from the dev server output.
 *
 * It is also the fallback when `BREVO_API_KEY` is unset, which means a missing
 * key degrades to "the mail is in the log" rather than to a crash.
 */
export function consoleTransport(): EmailTransport {
  return {
    name: "console",

    async send(message: EmailMessage) {
      console.info(
        [
          "",
          "┌─ email (console transport — nothing was sent) ─────────────",
          `│ To:      ${message.to.name ? `${message.to.name} <${message.to.email}>` : message.to.email}`,
          `│ Subject: ${message.subject}`,
          "├────────────────────────────────────────────────────────────",
          message.text
            .split("\n")
            .map((line) => `│ ${line}`)
            .join("\n"),
          "└────────────────────────────────────────────────────────────",
          "",
        ].join("\n"),
      );
    },
  };
}
