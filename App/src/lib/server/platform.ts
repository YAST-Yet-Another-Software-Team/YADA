import type { RequestEvent } from "@sveltejs/kit";

/**
 * The Workers `ExecutionContext.waitUntil`, when there is one.
 *
 * Under `vite dev`, which runs on Node, `platform` is undefined and callers fall
 * back to their own behaviour.
 *
 * This lives here rather than in hooks.server because both the hook and the
 * Better Auth config need it, and hooks.server imports the auth config: a
 * shared module is what keeps that from becoming an import cycle.
 */
export function waitUntilFor(event: RequestEvent) {
  const context = event.platform?.context;

  return context ? context.waitUntil.bind(context) : undefined;
}

/**
 * Hand `promise` to the platform so it can outlive the response.
 *
 * Workers cancels anything still running when a request returns, so a send
 * dispatched and forgotten is a send that may never happen. `waitUntil` holds
 * the isolate open for it. Off Workers there is nothing to hold open and a
 * floating promise is the whole of it.
 *
 * Rejections are swallowed here: every caller is a background task whose
 * failure has already been logged where it happened, and an unhandled
 * rejection crossing the runtime boundary is its own problem.
 */
export function runInBackground(
  event: RequestEvent | null,
  promise: Promise<unknown>,
) {
  const settled = promise.catch(() => {});
  const waitUntil = event ? waitUntilFor(event) : undefined;

  if (waitUntil) waitUntil(settled);
}
