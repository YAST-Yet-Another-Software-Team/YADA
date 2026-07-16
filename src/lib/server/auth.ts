export type AuthRole = 'business' | 'courier' | 'admin';

export interface SessionUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: AuthRole;
  avatarUrl: string | null;
}

export const authProviders = ['email', 'phone', 'oauth'] as const;

export const authSettings = {
  sessionDays: 30,
  otpExpiryMinutes: 10,
  providers: authProviders
} as const;