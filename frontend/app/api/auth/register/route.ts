// ─── POST /api/auth/register ─────────────────────────────────────────────────
// Creates a user account: email + password + display name. Password is hashed
// with bcrypt before storage. After a 201 the client signs in via the normal
// NextAuth credentials flow.

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongodb";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, password, name } = (body ?? {}) as Record<string, unknown>;

  const cleanEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanPassword = typeof password === "string" ? password : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  if (cleanName.length < 1 || cleanName.length > 50) {
    return NextResponse.json(
      { error: "Display name must be 1–50 characters" },
      { status: 400 },
    );
  }
  if (cleanPassword.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const db = await getDb();
  const users = db.collection("users");

  const existing = await users.findOne({ email: cleanEmail });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 },
    );
  }

  const password_hash = await bcrypt.hash(cleanPassword, 12);

  try {
    await users.insertOne({
      email: cleanEmail,
      name: cleanName,
      password_hash,
      role: "user",
      created_at: new Date(),
      onboarding_pending: true,
    });
  } catch (err: unknown) {
    // Unique index race: two simultaneous registrations with the same email.
    if (
      err &&
      typeof err === "object" &&
      (err as { code?: number }).code === 11000
    ) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }
    throw err;
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
