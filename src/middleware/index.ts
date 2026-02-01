import { defineMiddleware } from "astro:middleware";

import { supabaseClient } from "../db/supabase.client";

/** Ścieżki wymagające autentykacji (exact match lub prefix). */
const PROTECTED_PATHS = ["/", "/profil"];

/** Ścieżki publiczne – bez przekierowania. */
const PUBLIC_PATHS = ["/login"];

/** Ścieżki pomijane przez guard (API, assety Astro). */
const SKIP_PATHS_PREFIX = ["/api", "/_astro", "/favicon"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

function shouldSkipGuard(pathname: string): boolean {
  return SKIP_PATHS_PREFIX.some((prefix) => pathname.startsWith(prefix));
}

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.supabase = supabaseClient;

  const url = new URL(context.request.url);
  const pathname = url.pathname;

  if (shouldSkipGuard(pathname) || isPublicPath(pathname)) {
    return next();
  }

  const authGuardEnabled =
    import.meta.env.PUBLIC_AUTH_GUARD_ENABLED === "true";

  if (authGuardEnabled && isProtectedPath(pathname)) {
    // TODO: Weryfikacja JWT/sesji z cookies. Po wdrożeniu Supabase Auth
    // użyj createServerClient z @supabase/ssr i context.request do odczytu sesji.
    const hasValidSession = false; // placeholder – implementuj przed włączeniem guarda

    if (!hasValidSession) {
      const returnUrl = encodeURIComponent(pathname + url.search);
      return context.redirect(`/login?returnUrl=${returnUrl}`);
    }
  }

  return next();
});
