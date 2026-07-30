import { writable } from 'svelte/store';

type SessionState = {
  user: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: 'business' | 'courier' | 'admin';
    image: string | null;
  } | null;
  isLoading: boolean;
  error: string | null;
};

const initialState: SessionState = {
  user: null,
  isLoading: false,
  error: null
};

const { subscribe, set, update } = writable<SessionState>(initialState);

function mapUser(user: {
  id: string;
  name: string;
  email: string | null;
  image?: string | null;
  phoneNumber?: string | null;
  role?: 'business' | 'courier' | 'admin';
} | null): SessionState['user'] {
  return user
    ? {
        id: user.id,
        name: user.name,
        email: user.email ?? null,
        phone: user.phoneNumber ?? null,
        role: user.role ?? 'business',
        image: user.image ?? null
      }
    : null;
}

async function syncSession() {
  update((state) => ({ ...state, isLoading: true, error: null }));

  try {
    const response = await fetch('/api/auth/get-session');

    if (!response.ok) {
      set({ user: null, isLoading: false, error: null });
      return null;
    }

    const payload = (await response.json().catch(() => null)) as {
      user?: Parameters<typeof mapUser>[0] | null;
      data?: { user?: Parameters<typeof mapUser>[0] | null } | null;
    } | null;

    const currentUser = payload?.user ?? payload?.data?.user ?? null;

    set({
      user: mapUser(currentUser),
      isLoading: false,
      error: null
    });

    return mapUser(currentUser);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load session.';
    set({ user: null, isLoading: false, error: message });
    throw error;
  }
}

async function signIn(email: string, password: string, rememberMe = false) {
  update((state) => ({ ...state, isLoading: true, error: null }));

  try {
    const response = await fetch('/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, rememberMe })
    });

    if (!response.ok) {
      throw new Error('Unable to sign in.');
    }

    const payload = (await response.json().catch(() => null)) as {
      user?: Parameters<typeof mapUser>[0] | null;
      data?: { user?: Parameters<typeof mapUser>[0] | null } | null;
    } | null;

    const currentUser = payload?.user ?? payload?.data?.user ?? null;
    const mappedUser = mapUser(currentUser);

    set({ user: mappedUser, isLoading: false, error: null });
    return mappedUser;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to sign in.';
    update((state) => ({ ...state, isLoading: false, error: message }));
    throw error;
  }
}

async function requestPasswordReset(email: string) {
  update((state) => ({ ...state, isLoading: true, error: null }));

  try {
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : '/reset-password';

    const response = await fetch('/api/auth/forget-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, redirectTo })
    });

    if (!response.ok) {
      throw new Error('Unable to send password reset email.');
    }

    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send password reset email.';
    update((state) => ({ ...state, isLoading: false, error: message }));
    throw error;
  } finally {
    update((state) => ({ ...state, isLoading: false }));
  }
}

async function resetPassword(token: string, newPassword: string) {
  update((state) => ({ ...state, isLoading: true, error: null }));

  try {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
    });

    if (!response.ok) {
      throw new Error('Unable to reset password.');
    }

    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to reset password.';
    update((state) => ({ ...state, isLoading: false, error: message }));
    throw error;
  } finally {
    update((state) => ({ ...state, isLoading: false }));
  }
}

async function signUp(
  email: string,
  password: string,
  name: string,
  phone?: string,
  role: 'business' | 'courier' | 'admin' = 'business'
) {
  update((state) => ({ ...state, isLoading: true, error: null }));

  try {
    const response = await fetch('/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, phoneNumber: phone, role })
    });

    if (!response.ok) {
      throw new Error('Unable to sign up.');
    }

    const payload = (await response.json()) as {
      user?: Parameters<typeof mapUser>[0] | null;
      data?: { user?: Parameters<typeof mapUser>[0] | null } | null;
    };

    const currentUser = payload.user ?? payload.data?.user ?? null;
    const mappedUser = mapUser(currentUser);

    set({ user: mappedUser, isLoading: false, error: null });
    return mappedUser;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to sign up.';
    update((state) => ({ ...state, isLoading: false, error: message }));
    throw error;
  }
}

async function signOut(returnTo = '/') {
  await fetch('/api/auth/sign-out', { method: 'POST' });

  set(initialState);

  if (typeof window !== 'undefined') {
    window.location.href = returnTo;
  }
}

async function updateProfile(fields: { name?: string; phone?: string }) {
  update((state) => ({ ...state, isLoading: true, error: null }));

  try {
    const body: Record<string, string> = {};
    if (fields.name !== undefined) body.name = fields.name.trim();
    if (fields.phone !== undefined) body.phoneNumber = fields.phone.trim();

    const response = await fetch('/api/auth/update-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        error?: { message?: string };
      } | null;
      throw new Error(
        payload?.message || payload?.error?.message || 'Unable to update profile.'
      );
    }

    const payload = (await response.json()) as {
      user?: Parameters<typeof mapUser>[0] | null;
      data?: { user?: Parameters<typeof mapUser>[0] | null } | null;
    };

    const currentUser = payload.user ?? payload.data?.user ?? null;
    const mappedUser = mapUser(currentUser) ?? (await syncSession());

    if (!mappedUser) {
      throw new Error('Unable to update profile.');
    }

    set({ user: mappedUser, isLoading: false, error: null });
    return mappedUser;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update profile.';
    update((state) => ({ ...state, isLoading: false, error: message }));
    throw error;
  }
}

async function changePassword(currentPassword: string, newPassword: string) {
  update((state) => ({ ...state, isLoading: true, error: null }));

  try {
    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword,
        newPassword,
        revokeOtherSessions: false
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        error?: { message?: string };
      } | null;
      throw new Error(
        payload?.message || payload?.error?.message || 'Unable to change password.'
      );
    }

    update((state) => ({ ...state, isLoading: false, error: null }));
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to change password.';
    update((state) => ({ ...state, isLoading: false, error: message }));
    throw error;
  }
}

export const auth = {
  subscribe,
  syncSession,
  signIn,
  signUp,
  signOut,
  updateProfile,
  changePassword,
  requestPasswordReset,
  resetPassword
};