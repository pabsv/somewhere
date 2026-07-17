// ─── NextAuth edge-safe config ──────────────────────────────────────────────
// Shared between the full NextAuth instance (auth.ts) and the edge middleware
// (middleware.ts). MUST NOT import mongodb or anything that pulls Node-only
// modules — middleware runs on the edge runtime. The Credentials provider and
// its DB lookup live in auth.ts, layered on top of this object.
// Spec: docs/DESIGN_V1.md section E.

import type { NextAuthConfig } from "next-auth";

// Cookies are scoped by hostname only (not port), so on localhost every
// NextAuth dev app shares the default `authjs.*` cookies. A csrf-token cookie
// written by another project (different AUTH_SECRET) fails our hash check and
// every OAuth sign-in dies with MissingCSRF. App-specific names isolate us.
const useSecureCookies = process.env.NODE_ENV === "production";
const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: useSecureCookies,
};

export const authConfig = {
  trustHost: true,
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  cookies: {
    sessionToken: {
      name: "somewhere.session-token",
      options: cookieOptions,
    },
    csrfToken: {
      name: "somewhere.csrf-token",
      options: cookieOptions,
    },
    callbackUrl: {
      name: "somewhere.callback-url",
      options: { ...cookieOptions, httpOnly: false },
    },
    pkceCodeVerifier: {
      name: "somewhere.pkce.code_verifier",
      options: { ...cookieOptions, maxAge: 60 * 15 },
    },
    state: {
      name: "somewhere.state",
      options: { ...cookieOptions, maxAge: 60 * 15 },
    },
    nonce: {
      name: "somewhere.nonce",
      options: cookieOptions,
    },
  },
  providers: [],
  callbacks: {
    // Persist id + role onto the token at sign-in; thereafter the token is the
    // source of truth (no DB hit per request).
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "user";
        token.onboarding_pending = !!user.onboarding_pending;
      }
      return token;
    },
    // Expose id + role on the client/server session object.
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      if (token.role) session.user.role = token.role as string;
      session.user.onboarding_pending = !!token.onboarding_pending;
      return session;
    },
    // Used by middleware to gate protected routes.
    //   /admin/*  → requires an admin token
    //   /settings, /welcome → requires any logged-in user
    // Returning false makes NextAuth redirect to the signIn page (/login).
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const token = auth?.user;

      if (pathname.startsWith("/admin")) {
        return token?.role === "admin";
      }
      if (
        pathname.startsWith("/settings") ||
        pathname.startsWith("/friends") ||
        pathname.startsWith("/groups") ||
        pathname.startsWith("/welcome")
      ) {
        return !!token;
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
