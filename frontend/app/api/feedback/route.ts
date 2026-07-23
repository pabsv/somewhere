// ─── POST /api/feedback — bug reports / suggestions ──────────────────────────
// Unauthenticated (public form on /feedback). Body { name?, email?, message,
// page?, website? }. Stored in Mongo FIRST (source of truth), then emailed to
// the maintainer via Gmail SMTP — an email outage never loses feedback, the
// doc just stays emailed:false.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/mongodb";
import { sendFeedbackEmail } from "@/lib/mailer";

const FEEDBACK_COLLECTION = "feedback";

const PostBodySchema = z.object({
  name: z.string().trim().max(100).optional(),
  email: z.string().trim().toLowerCase().max(200).optional(),
  message: z.string().trim().min(3, "Tell us a bit more").max(5000),
  page: z.string().trim().max(500).optional(),
  website: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PostBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: z.prettifyError(parsed.error) },
      { status: 400 },
    );
  }

  if (parsed.data.website) {
    // Honeypot tripped — pretend success, store nothing.
    return NextResponse.json({ ok: true });
  }

  const name = parsed.data.name || null;
  const email = parsed.data.email || null;
  const page = parsed.data.page || null;
  const message = parsed.data.message;

  try {
    const db = await getDb();
    const feedback = db.collection(FEEDBACK_COLLECTION);
    const { insertedId } = await feedback.insertOne({
      name,
      email,
      message,
      page,
      emailed: false,
      created_at: new Date(),
    });

    try {
      await sendFeedbackEmail({ name, email, message, page });
      await feedback.updateOne({ _id: insertedId }, { $set: { emailed: true } });
    } catch (mailErr) {
      // Non-fatal: the doc is saved; the email can be re-sent by hand.
      console.error("[POST /api/feedback] email send failed:", mailErr);
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/feedback] failed:", err);
    return NextResponse.json({ error: "Failed to send feedback" }, { status: 500 });
  }
}
