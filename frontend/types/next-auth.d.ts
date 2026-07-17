// ─── NextAuth module augmentation — the session contract ────────────────────
// Track A owns this. Everyone else consumes:
//   Server:  const session = await auth();  session.user = {id, email, name, role}
//   Client:  useSession() from next-auth/react (SessionProvider wired in layout)
// Spec: docs/DESIGN_V1.md section E.

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** Mongo users._id as a hex string. */
      id: string;
      /** "admin" | "user" — gate /admin and /api/admin/* on "admin". */
      role: string;
      /** True until the user finishes or skips the /welcome onboarding wizard. */
      onboarding_pending?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    /** Returned by the Credentials authorize() callback. */
    role?: string;
    onboarding_pending?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    onboarding_pending?: boolean;
  }
}
