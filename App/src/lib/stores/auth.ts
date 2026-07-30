import { writable } from 'svelte/store';

export type AuthRole = 'business' | 'courier' | 'admin';

export type AuthUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: AuthRole;
  image: string | null;
};

type SessionState = {
  user: AuthUser | null;
  isLoading: boolean;
};

const initialState: SessionState = {
  user: null,
  isLoading: false
};

const { subscribe, set, update } = writable<SessionState>(initialState);

// ---------------------------------------------------------------------------
// Shared plumbing
// ---------------------------------------------------------------------------

const AUTH_ROLES: readonly AuthRole[] = ['business', 'courier', 'admin'];

/** Mirrors toAuthRole() in $lib/server/auth — kept separate so the client bundle
 *  doesn't pull in the server module. Unrecognised values are never `admin`. */
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
        image: user.image ?? null
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

/** Build an Error from Better Auth's error body, falling back to `message`. */
async function errorFrom(response: Response, message: string) {
  const payload = await readJson<{ message?: string; error?: { message?: string } }>(response);
  return new Error(payload?.message || payload?.error?.message || message);
}

function post(path: string, body: unknown) {
  return fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

function setUser(user: AuthUser | null) {
  update((state) => ({ ...state, user }));
}

/**
 * The loading envelope every auth call shares. `isLoading` is cleared in a
 * `finally`, so a rejected call can't leave the UI stuck in a pending state.
 */
async function withLoading<T>(run: () => Promise<T>): Promise<T> {
  update((state) => ({ ...state, isLoading: true }));

  try {
    return await run();
  } finally {
    update((state) => ({ ...state, isLoading: false }));
  }
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

/**
 * Seed the store from server-rendered session data (see routes/+layout.server.ts).
 *
 * Client-only by design: this store is module-scoped, so writing to it during SSR
 * would share one request's user with every other in-flight render.
 */
function hydrate(user: AuthUser | null) {
  set({ user, isLoading: false });
}

/** The session fetch without the loading envelope, so callers already inside
 *  `withLoading` don't flip `isLoading` off half way through. */
async function fetchSession() {
  try {
    const response = await fetch('/api/auth/get-session');
    const user = response.ok ? extractUser(await readJson<UserPayload>(response)) : null;

    setUser(user);
    return user;
  } catch (error) {
    setUser(null);
    throw error;
  }
}

async function syncSession() {
  return withLoading(fetchSession);
}

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

async function signIn(email: string, password: string, rememberMe = false) {
  return withLoading(async () => {
    const response = await post('/api/auth/sign-in/email', { email, password, rememberMe });

    if (!response.ok) {
      throw new Error('Unable to sign in.');
    }

    const user = extractUser(await readJson<UserPayload>(response));
    setUser(user);
    return user;
  });
}

async function signUp(
  email: string,
  password: string,
  name: string,
  phone?: string,
  role: 'business' | 'courier' = 'business'
) {
  return withLoading(async () => {
    const response = await post('/api/auth/sign-up/email', {
      email,
      password,
      name,
      phoneNumber: phone,
      role
    });

    if (!response.ok) {
      throw new Error('Unable to sign up.');
    }

    const user = extractUser(await readJson<UserPayload>(response));
    setUser(user);
    return user;
  });
}

/**
 * Clear the session locally and leave, whatever the server says.
 *
 * The sign-out request is best-effort: if it rejects, the cookie may survive,
 * but the UI must not keep showing a signed-in state — so the store is reset
 * and the redirect runs in a `finally`.
 */
async function signOut(returnTo = '/') {
  try {
    await fetch('/api/auth/sign-out', { method: 'POST' });
  } catch {
    // Best-effort; fall through to clearing local state.
  } finally {
    set(initialState);

    if (typeof window !== 'undefined') {
      window.location.href = returnTo;
    }
  }
}

// ---------------------------------------------------------------------------
// Password
// ---------------------------------------------------------------------------

async function requestPasswordReset(email: string) {
  return withLoading(async () => {
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : '/reset-password';

    const response = await post('/api/auth/forget-password', { email, redirectTo });

    if (!response.ok) {
      throw await errorFrom(response, 'Unable to send password reset email.');
    }

    return response.json();
  });
}

async function resetPassword(token: string, newPassword: string) {
  return withLoading(async () => {
    const response = await post('/api/auth/reset-password', { token, newPassword });

    if (!response.ok) {
      throw await errorFrom(response, 'Unable to reset password.');
    }

    return response.json();
  });
}

async function changePassword(currentPassword: string, newPassword: string) {
  return withLoading(async () => {
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

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

async function updateProfile(fields: { name?: string; phone?: string }) {
  return withLoading(async () => {
    const body: Record<string, string> = {};
    if (fields.name !== undefined) body.name = fields.name.trim();
    if (fields.phone !== undefined) body.phoneNumber = fields.phone.trim();

    const response = await post('/api/auth/update-user', body);

    if (!response.ok) {
      throw await errorFrom(response, 'Unable to update profile.');
    }

    // update-user doesn't always echo the user back; fall back to re-reading it.
    const user = extractUser(await readJson<UserPayload>(response)) ?? (await fetchSession());

    if (!user) {
      throw new Error('Unable to update profile.');
    }

    setUser(user);
    return user;
  });
}

export const auth = {
  subscribe,
  hydrate,
  syncSession,
  signIn,
  signUp,
  signOut,
  updateProfile,
  changePassword,
  requestPasswordReset,
  resetPassword
};
