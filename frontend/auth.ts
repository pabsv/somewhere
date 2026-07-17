// ─── NextAuth instance (Node runtime) ───────────────────────────────────────
// The full auth setup with the Credentials provider + Mongo upsert. Imported
// by server components, route handlers, and the [...nextauth] handler — NOT by
// middleware (which uses auth.config.ts to stay edge-safe).
// Spec: docs/DESIGN_V1.md section E.

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { authConfig } from "@/auth.config";
import { getDb } from "@/lib/mongodb";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    // OAuth — reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET from the environment.
    // No adapter: the Mongo user is resolved/created by email in the jwt
    // callback below, so a Google sign-in lands on the SAME users doc (and the
    // same session.user.id) as an email/password sign-in with that address.
    Google,
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
          onboarding_pending: !!user.onboarding_pending,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Gate Google sign-ins on a present, verified email (Google's default
    // scopes include it). Credentials sign-ins are already validated in
    // authorize(), so let them straight through.
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        const emailVerified = (profile as { email_verified?: boolean } | undefined)
          ?.email_verified;
        if (!profile?.email || emailVerified === false) return false;
      }
      return true;
    },
    // Stamp the Mongo _id + role onto the token at sign-in. The whole app keys
    // off session.user.id being the Mongo _id, so for Google we resolve (or
    // create) the users doc by email HERE — this is also what links a Google
    // login to an existing email/password account with the same address.
    // Runs only on the initial sign-in (when `user` is present), not per request.
    async jwt({ token, user, account, profile, trigger }) {
      // Onboarding-completion refresh: OnboardingWizard calls the session
      // update() trigger after POST /api/onboarding clears the DB flag, so the
      // token (minted at sign-in, otherwise never re-checked) doesn't keep
      // reporting onboarding_pending=true for the rest of the session.
      if (trigger === "update" && typeof token.id === "string") {
        const db = await getDb();
        const fresh = await db
          .collection("users")
          .findOne(
            { _id: new ObjectId(token.id as string) },
            { projection: { onboarding_pending: 1 } },
          );
        token.onboarding_pending = !!fresh?.onboarding_pending;
        return token;
      }

      if (!user) return token;

      if (account?.provider === "google") {
        const db = await getDb();
        const users = db.collection("users");
        const email = String(profile?.email ?? user.email ?? "")
          .trim()
          .toLowerCase();

        const existing = await users.findOne({ email });
        if (existing) {
          token.id = existing._id.toString();
          token.role = (existing.role as string) ?? "user";
          token.onboarding_pending = !!existing.onboarding_pending;
          // Backfill google_id the first time an existing account uses Google.
          if (!existing.google_id) {
            await users.updateOne(
              { _id: existing._id },
              { $set: { google_id: account.providerAccountId } },
            );
          }
        } else {
          const name =
            String(profile?.name ?? user.name ?? "")
              .trim()
              .slice(0, 50) || email.split("@")[0];
          const res = await users.insertOne({
            email,
            name,
            role: "user",
            created_at: new Date(),
            google_id: account.providerAccountId,
            onboarding_pending: true,
          });
          token.id = res.insertedId.toString();
          token.role = "user";
          token.onboarding_pending = true;
        }
      } else {
        // Credentials: authorize() already returned the Mongo id + role.
        token.id = user.id;
        token.role = user.role ?? "user";
        token.onboarding_pending = !!user.onboarding_pending;
      }
      return token;
    },
  },
});
