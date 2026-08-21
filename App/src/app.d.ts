/// <reference types="unplugin-icons/types/svelte" />
// The `google.maps` namespace the map code annotates against. Referenced
// explicitly rather than left to automatic `@types` discovery: the package was
// reaching the compiler only as a hoisted transitive of
// `@googlemaps/js-api-loader`, which typechecked from the CLI but left editors
// resolving `google` as an unknown namespace.
/// <reference types="google.maps" />

import type { auth } from "$auth/auth.server";
import type { SessionUser } from "$lib/utils/types";

declare global {
  namespace App {
    interface Locals {
      user: SessionUser | null;
      session: typeof auth.$Infer.Session.session | null;
    }

    // Supplied by adapter-cloudflare, and undefined under `vite dev`. Only
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
