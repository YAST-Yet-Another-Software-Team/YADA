/// <reference types="unplugin-icons/types/svelte" />
// No `google.maps` reference on this stack: MapLibre ships its own types with
// the package, so the map code needs nothing declared here.

import type { auth } from '$auth/auth.server';
import type { SessionUser } from '$lib/utils/types';

declare global {
  namespace App {
    interface Locals {
      user: SessionUser | null;
      session: typeof auth.$Infer.Session.session | null;
    }

    // Supplied by adapter-cloudflare, and undefined under adapter-node. Only
    // the bits the app actually reaches for are declared: `context.waitUntil`
    // keeps the isolate alive while the request's Neon pool shuts down.
    interface Platform {
      context?: {
        waitUntil(promise: Promise<unknown>): void;
      };
    }
  }
}

export {};