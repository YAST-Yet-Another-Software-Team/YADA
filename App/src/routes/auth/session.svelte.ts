import { getContext, setContext } from 'svelte';

import type { AuthRole, AuthUser } from '$lib/utils/types';

import { AuthError, authErrorMessage, networkError } from './errors';

// ---------------------------------------------------------------------------
// Response plumbing — stateless, so it stays outside the class
// ---------------------------------------------------------------------------

const AUTH_ROLES: readonly AuthRole[] = ['business', 'courier'];

/** Mirrors toAuthRole() in ./auth.server. The *type* is now shared, but the
 *  runtime narrowing still can't be — that lives in a server-only module. */
function toRole(value: unknown): AuthRole {
  return AUTH_ROLES.includes(value as AuthRole) ? (value as AuthRole) : 'business';
}

/** A user as Better Auth serialises it, before mapping to our shape. */
type RawUser = {
  id: string;
  name: string;
  email?: string | null;
  image?: string | null;
  phoneNumber?: string | null;
  role?: unknown;
  emailVerified?: boolean | null;
} | null;

/** Better Auth is inconsistent about wrapping: some routes return `{ user }`,
 *  others `{ data: { user } }`. Every call site needs both shapes handled. */
type UserPayload = { user?: RawUser; data?: { user?: RawUser } | null } | null;

function mapUser(user: RawUser): AuthUser | null {
  return user
    ? {
        id: user.id,
        name: user.name,
        email: user.email ?? null,
        phone: user.phoneNumber ?? null,
        role: toRole(user.role),
        image: user.image ?? null,
        emailVerified: user.emailVerified === true
      }
    : null;
}

/** Pull the user out of either response shape, in one pass. */
function extractUser(payload: UserPayload): AuthUser | null {
  return mapUser(payload?.user ?? payload?.data?.user ?? null);
}

async function readJson<T>(response: Response) {
  return (await response.json().catch(() => null)) as T | null;
}

/**
 * Build an `AuthError` from Better Auth's error body.
 *
 * The body's own `message` is deliberately not used as the copy — it's
 * developer English. It carries a `code`, and that is what `authErrorMessage`
 * translates; `fallback` covers a body with neither.
 */
async function errorFrom(response: Response, fallback: string) {
  const payload = await readJson<{ code?: string; error?: { code?: string } }>(response);
  const code = payload?.code ?? payload?.error?.code ?? null;

  return new AuthError(authErrorMessage(code, response.status, fallback), code, response.status);
}

/**
 * POST JSON, translating a failed *connection* into an `AuthError` too.
 *
 * Without this a dropped network rejects with a bare `TypeError: Failed to
 * fetch`, which is indistinguishable at the call site from a bug and reads like
 * one if it ever reaches the screen.
 */
async function post(path: string, body: unknown) {
  try {
    return await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch {
    throw networkError();
  }
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

/**
 * The signed-in user, plus every operation that changes who that is.
 *
 * One instance per render tree, handed out through context by the root layout.
 * That scoping is what makes it safe on the server: a module-level value would
 * be shared by every in-flight SSR request, so one visitor's session could be
 * rendered into another's HTML.
 */
export class Session {
  #user = $state<AuthUser | null>(null);
  /** Depth, not a boolean: concurrent calls must not clear each other's flag. */
  #pending = $state(0);

  constructor(user: AuthUser | null = null) {
    this.#user = user;
  }

  /** The signed-in user, or `null`. */
  get user() {
    return this.#user;
  }

  get role() {
    return this.#user?.role ?? null;
  }

  /** True while any auth request is in flight. */
  get isLoading() {
    return this.#pending > 0;
  }

  /** Re-seed from server-rendered session data (see routes/+layout.server.ts). */
  hydrate(user: AuthUser | null) {
    this.#user = user;
  }

  /**
   * Run an auth request inside the shared pending count, which is decremented
   * in a `finally` so a rejected call can't leave the UI stuck.
   */
  async #track<T>(run: () => Promise<T>): Promise<T> {
    this.#pending += 1;

    try {
      return await run();
    } finally {
      this.#pending -= 1;
    }
  }

  /** Re-read the session from the server. */
  async refresh() {
    return this.#track(async () => {
      try {
        const response = await fetch('/api/auth/get-session');
        this.#user = response.ok ? extractUser(await readJson<UserPayload>(response)) : null;
        return this.#user;
      } catch (error) {
        this.#user = null;
        throw error instanceof AuthError ? error : networkError();
      }
    });
  }

  // No signOut() here on purpose. It used to clear local state in a `finally`
  // and redirect whatever the server said, so a request that never landed left
  // a live session behind under a UI claiming otherwise — and the next visit
  // signed the user straight back in. Signing out is the `signout` action in
  // ./+page.server: it deletes the session row, so a surviving cookie
  // authenticates nothing, and the buttons post a form to it.

  async updateProfile(fields: { name?: string; phone?: string }) {
    return this.#track(async () => {
      const body: Record<string, string> = {};
      if (fields.name !== undefined) body.name = fields.name.trim();
      if (fields.phone !== undefined) body.phoneNumber = fields.phone.trim();

      const response = await post('/api/auth/update-user', body);

      if (!response.ok) {
        throw await errorFrom(response, 'Unable to update profile.');
      }

      // update-user doesn't always echo the user back; fall back to re-reading it.
      const user = extractUser(await readJson<UserPayload>(response)) ?? (await this.refresh());

      if (!user) {
        throw new AuthError('Unable to update profile.');
      }

      this.#user = user;
      return user;
    });
  }

  /**
   * Set or clear the profile photo. `null` removes it.
   *
   * Not part of `updateProfile` because it does not go through Better Auth:
   * `update-user` would take the data URL unchecked, so the write goes to
   * `PUT /api/account/photo`, which validates the scheme and the length first.
   * The user is patched locally rather than re-fetched — the endpoint echoes
   * back exactly what it stored, and nothing else about the account moved.
   */
  async updatePhoto(image: string | null) {
    return this.#track(async () => {
      let response: Response;

      try {
        response = await fetch('/api/account/photo', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image })
        });
      } catch {
        throw networkError();
      }

      const payload = await readJson<{ message?: string; image?: string | null }>(response);

      if (!response.ok) {
        throw new AuthError(payload?.message ?? 'Unable to save your photo.');
      }

      const current = this.#user;
      if (current) this.#user = { ...current, image: payload?.image ?? null };

      return payload?.image ?? null;
    });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.#track(async () => {
      const response = await post('/api/auth/change-password', {
        currentPassword,
        newPassword,
        revokeOtherSessions: false
      });

      if (!response.ok) {
        throw await errorFrom(response, 'Unable to change password.');
      }

      return true;
    });
  }

}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const SESSION_KEY = Symbol('yada.session');

/** Provide the session for the whole app. Called once, by the root layout. */
export function createSession(user: AuthUser | null) {
  return setContext(SESSION_KEY, new Session(user));
}

/** Read the session the root layout provided. */
export function getSession(): Session {
  const session = getContext<Session | undefined>(SESSION_KEY);

  if (!session) {
    throw new Error('getSession() was called outside the root layout, which provides it.');
  }

  return session;
}
