// NextAuth v5 catch-all handler — wires GET/POST for sign-in, callback,
// session, CSRF, sign-out, etc. Spec: docs/DESIGN_V1.md section E.
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
