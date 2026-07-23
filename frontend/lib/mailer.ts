// ─── Gmail SMTP mailer ────────────────────────────────────────────────────────
// Sends app email from the dedicated flysomewhereapp@gmail.com account using a
// Gmail app password. Server-side only (nodemailer needs Node runtime).
// Env: GMAIL_USER + GMAIL_APP_PASSWORD (frontend/.env.local + Vercel).

import nodemailer from "nodemailer";

const FEEDBACK_RECIPIENT = "pablovegarzv@gmail.com";

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("GMAIL_USER / GMAIL_APP_PASSWORD not configured");
  }
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
}

export interface FeedbackEmailInput {
  name: string | null;
  email: string | null;
  message: string;
  page: string | null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendFeedbackEmail(input: FeedbackEmailInput) {
  const transporter = getTransporter();
  const from = process.env.GMAIL_USER!;
  const sentAt = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";

  const metaRows: Array<[string, string]> = [
    ["From", input.name || "(anonymous)"],
    ["Email", input.email || "(not given)"],
    ["Page", input.page || "(direct)"],
    ["Sent", sentAt],
  ];

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1f242e;">
    <div style="background:#14171d;border-radius:10px 10px 0 0;padding:14px 20px;">
      <span style="color:#ffc72c;font-family:monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Somewhere · Feedback</span>
    </div>
    <div style="border:1px solid #e7e1d3;border-top:0;border-radius:0 0 10px 10px;padding:20px;background:#fff;">
      <table style="font-family:monospace;font-size:13px;color:#5c6470;border-collapse:collapse;">
        ${metaRows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:2px 16px 2px 0;text-transform:uppercase;letter-spacing:1px;font-size:11px;">${k}</td><td style="padding:2px 0;color:#1f242e;">${escapeHtml(v)}</td></tr>`,
          )
          .join("")}
      </table>
      <div style="margin-top:16px;border-left:4px solid #ffc72c;background:#faf7f0;border-radius:0 8px 8px 0;padding:14px 16px;font-size:15px;line-height:1.5;white-space:pre-wrap;">${escapeHtml(input.message)}</div>
    </div>
  </div>`;

  const text = metaRows.map(([k, v]) => `${k}: ${v}`).join("\n") + `\n\n${input.message}`;

  await transporter.sendMail({
    from: `Somewhere <${from}>`,
    to: FEEDBACK_RECIPIENT,
    replyTo: input.email || undefined,
    subject: `[Somewhere feedback] ${input.name || "Anonymous"}`,
    text,
    html,
  });
}
