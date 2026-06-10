// ─── NextAuth edge-safe config ──────────────────────────────────────────────
// Shared between the full NextAuth instance (auth.ts) and the edge middleware
// (middleware.ts). MUST NOT import mongodb or anything that pulls Node-only
// modules — middleware runs on the edge runtime. The Credentials provider and
// its DB lookup live in auth.ts, layered on top of this object.
// Spec: docs/DESIGN_V1.md section E.

import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    // Persist id + role onto the token at sign-in; thereafter the token is the
    // source of truth (no DB hit per request).
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "user";
      }
      return token;
    },
    // Expose id + role on the client/server session object.
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      if (token.role) session.user.role = token.role as string;
      return session;
    },
    // Used by middleware to gate protected routes.
    //   /admin/*  → requires an admin token
    //   /settings → requires any logged-in user
    // Returning false makes NextAuth redirect to the signIn page (/login).
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const token = auth?.user;

      if (pathname.startsWith("/admin")) {
        return token?.role === "admin";
      }
      if (pathname.startsWith("/settings")) {
        return !!token;
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
