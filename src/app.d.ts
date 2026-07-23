import type { auth } from '$lib/server/auth';
import type { SessionUser } from '$lib/server/auth';

declare global {
  namespace App {
    interface Locals {
      user: SessionUser | null;
      session: typeof auth.$Infer.Session.session | null;
    }
  }
}

export {};