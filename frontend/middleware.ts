// Edge middleware — gates /settings, /friends and /admin/* via the edge-safe authConfig.
// mongodb MUST NOT appear in this import graph; that's why the Credentials
// provider and DB lookup live in auth.ts, separate from auth.config.ts.
// Spec: docs/DESIGN_V1.md section E.

import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

// Next.js runs this for every request matched by `config.matcher`.
// `auth` from NextAuth is a middleware-compatible function that applies the
// `authorized` callback in auth.config.ts.
export default auth;

export const config = {
  matcher: ["/settings", "/friends", "/groups/:path*", "/admin/:path*", "/welcome"],
};
