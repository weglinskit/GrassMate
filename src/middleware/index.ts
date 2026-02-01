import { defineMiddleware } from "astro:middleware";
import { createServerClient } from "@supabase/ssr";
import { parse } from "cookie";

import type { Database } from "../db/database.types";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

/** Ścieżki wymagające autentykacji (exact match lub prefix). */
const PROTECTED_PATHS = ["/", "/profil"];

/** Ścieżki publiczne – bez przekierowania. */
const PUBLIC_PATHS = [
  "/login",
  "/rejestracja",
  "/zapomniane-haslo",
  "/reset-haslo",
];

/** Ścieżki pomijane przez guard (API, assety Astro). */
const SKIP_PATHS_PREFIX = ["/api", "/_astro", "/favicon"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

function shouldSkipGuard(pathname: string): boolean {
  return SKIP_PATHS_PREFIX.some((prefix) => pathname.startsWith(prefix));
}

export const onRequest = defineMiddleware(async (context, next) => {
  const cookieHeader = context.request.headers.get("Cookie") ?? "";
  const cookies = parse(cookieHeader);

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return Object.entries(cookies).map(([name, value]) => ({
          name,
          value: value ?? "",
        }));
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          context.cookies.set(name, value ?? "", {
            path: options?.path ?? "/",
            maxAge: options?.maxAge,
            secure: options?.secure,
            httpOnly: options?.httpOnly ?? true,
            sameSite: (options?.sameSite as "lax" | "strict" | "none") ?? "lax",
          });
        }
      },
    },
  });

  context.locals.supabase = supabase;

  const url = new URL(context.request.url);
  const pathname = url.pathname;

  if (shouldSkipGuard(pathname) || isPublicPath(pathname)) {
    return next();
  }

  const authGuardEnabled = import.meta.env.PUBLIC_AUTH_GUARD_ENABLED === "true";

  if (authGuardEnabled && isProtectedPath(pathname)) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const hasValidSession = Boolean(session);

    if (!hasValidSession) {
      const returnUrl = encodeURIComponent(pathname + url.search);
      return context.redirect(`/login?returnUrl=${returnUrl}`);
    }
  }

  return next();
});
