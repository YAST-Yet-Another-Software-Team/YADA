import type { auth } from '$auth/auth.server';
import type { SessionUser } from '$lib/utils/types';

declare global {
  namespace App {
    interface Locals {
      user: SessionUser | null;
      session: typeof auth.$Infer.Session.session | null;
    }
  }
}

export {};