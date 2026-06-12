// ─── NextAuth instance (Node runtime) ───────────────────────────────────────
// The full auth setup with the Credentials provider + Mongo upsert. Imported
// by server components, route handlers, and the [...nextauth] handler — NOT by
// middleware (which uses auth.config.ts to stay edge-safe).
// Spec: docs/DESIGN_V1.md section E.

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { getDb } from "@/lib/mongodb";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      // Sign-in only — account creation happens via POST /api/auth/register.
      // Looks up the user by email and verifies the bcrypt password hash.
      authorize: async (credentials) => {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) return null;

        const db = await getDb();
        const user = await db.collection("users").findOne({ email });
        if (!user || typeof user.password_hash !== "string") return null;

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return null;

        return {
          id: user._id.toString(),
          email,
          name: user.name as string,
          role: (user.role as string) ?? "user",
        };
      },
    }),
  ],
});
