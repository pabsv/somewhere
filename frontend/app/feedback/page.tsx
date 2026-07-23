"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

type Status = "idle" | "submitting" | "done" | "error";

const inputClass =
  "w-full rounded-full border border-line bg-card px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 outline-none transition-colors focus:border-ink/40";

/**
 * Public feedback form — bugs, ideas, anything. Linkable from anywhere.
 * POSTs to /api/feedback which stores the message and emails the maintainer.
 */
export default function FeedbackPage() {
  const { data: session } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [page, setPage] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  // Prefill from the session; remember where the visitor came from.
  useEffect(() => {
    setPage(document.referrer || null);
  }, []);
  useEffect(() => {
    if (session?.user) {
      setName((v) => v || session.user?.name || "");
      setEmail((v) => v || session.user?.email || "");
    }
  }, [session]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || undefined,
          email: email || undefined,
          message,
          page: page || undefined,
          website,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Something went wrong.");
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setError("Something went wrong. Try again?");
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="font-mono text-[11px] uppercase tracking-widest text-ink-muted/70">
        Feedback
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Something broken? Tell us.
      </h1>
      <p className="mt-3 text-ink-muted">
        Bugs, weird fares, missing airports, ideas. Anything helps, and it
        lands straight in our inbox.
      </p>

      {status === "done" ? (
        <div className="mt-8 rounded-[var(--radius-card)] border border-line bg-card p-6">
          <p className="flex items-center gap-2 text-sm font-medium text-steal">
            <span aria-hidden="true">✓</span> Thanks, got it. We read
            everything.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-ink/90"
          >
            Back home <span aria-hidden="true">→</span>
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (optional)"
              autoComplete="name"
              maxLength={100}
              className={inputClass}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (optional, for replies)"
              autoComplete="email"
              maxLength={200}
              className={inputClass}
            />
          </div>
          <textarea
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What happened, or what would make this better?"
            rows={6}
            minLength={3}
            maxLength={5000}
            className="w-full rounded-[var(--radius-card)] border border-line bg-card px-4 py-3 text-sm text-ink placeholder:text-ink-muted/60 outline-none transition-colors focus:border-ink/40"
          />
          {/* Honeypot — hidden from humans, tempting for bots. */}
          <input
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -left-[9999px] h-0 w-0 opacity-0"
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={status === "submitting"}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-ink/90 disabled:opacity-60"
            >
              {status === "submitting" ? "Sending…" : "Send feedback"}
              <span aria-hidden="true">→</span>
            </button>
            {error && <p className="text-sm text-alert">{error}</p>}
          </div>
        </form>
      )}
    </div>
  );
}
