import { fail, redirect } from "@sveltejs/kit";
import { z } from "zod";

import { auth } from "$auth/auth.server";
import { authErrorMessage } from "$auth/errors";
import { messageForApiError } from "$lib/server/auth-error";

import type { Actions } from "./$types";

/** Better Auth's default `minPasswordLength`, mirrored as it is on /auth. */
const MIN_PASSWORD_LENGTH = 8;

const resetSchema = z
  .object({
    token: z.string().min(1, "That reset link is invalid. Request a new one."),
    password: z
      .string()
      .min(
        MIN_PASSWORD_LENGTH,
        `Your password is too short — use at least ${MIN_PASSWORD_LENGTH} characters.`,
      ),
    confirm: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.password !== value.confirm) {
      ctx.addIssue({
        code: "custom",
        path: ["confirm"],
        message: "Those passwords don't match.",
      });
    }
  });

/**
 * Where the link in a reset email ends up.
 *
 * Not the link itself — that points at Better Auth's own
 * `/api/auth/reset-password/:token`, which checks the token exists before
 * redirecting here with it in the query. So arriving with a token means it was
 * real *then*; it is spent when this page's action runs, and only then.
 */
export function load({ url }) {
  const token = url.searchParams.get("token");
  const error = url.searchParams.get("error");

  return {
    // The form reads the token from the URL. Returning it in `data` as well
    // would put it in the SSR payload for no gain.
    hasToken: Boolean(token) && !error,
    message: error
      ? authErrorMessage(error, null, "That reset link is invalid.")
      : null,
    minPasswordLength: MIN_PASSWORD_LENGTH,
  };
}

export const actions = {
  default: async ({ request }) => {
    const data = await request.formData();

    const parsed = resetSchema.safeParse({
      token: String(data.get("token") ?? ""),
      password: data.get("password") ?? "",
      confirm: data.get("confirm") ?? "",
    });

    if (!parsed.success) {
      return fail(400, { message: parsed.error.issues[0].message });
    }

    try {
      await auth.api.resetPassword({
        body: { newPassword: parsed.data.password, token: parsed.data.token },
        headers: request.headers,
      });
    } catch (error) {
      // The token is consumed on success, so a second submit of the same one
      // lands here as INVALID_TOKEN — which is the honest answer, and the copy
      // in $auth/errors already tells them to request a new link.
      const message = messageForApiError(
        error,
        "Unable to set a new password.",
      );
      if (message === null) throw error;

      return fail(400, { message });
    }

    // To sign-in rather than into a workspace: resetting a password does not
    // establish a session, and proving the new one works is the point.
    redirect(303, "/auth?reset=done");
  },
} satisfies Actions;
