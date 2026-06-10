// ─── NextAuth instance (Node runtime) ───────────────────────────────────────
// The full auth setup with the Credentials provider + Mongo upsert. Imported
// by server components, route handlers, and the [...nextauth] handler — NOT by
// middleware (which uses auth.config.ts to stay edge-safe).
// Spec: docs/DESIGN_V1.md section E.

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { getDb } from "@/lib/mongodb";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: {},
        name: {},
      },
      // No password in v1 (documented limitation): identity is email + name.
      // Upsert into `users` keyed on the unique email, set role on insert.
      authorize: async (credentials) => {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const name =
          typeof credentials?.name === "string" ? credentials.name.trim() : "";

        if (!email || !name) return null;

        const db = await getDb();
        const result = await db.collection("users").findOneAndUpdate(
          { email },
          {
            $setOnInsert: { email, role: "user", created_at: new Date() },
            $set: { name },
          },
          { upsert: true, returnDocument: "after" },
        );

        if (!result) return null;

        return {
          id: result._id.toString(),
          email,
          name: result.name as string,
          role: (result.role as string) ?? "user",
        };
      },
    }),
  ],
});
