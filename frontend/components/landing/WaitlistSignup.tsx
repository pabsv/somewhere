"use client";

import { useState, type FormEvent } from "react";
import { ORIGINS } from "@/data/airports.gen";

// Airports the pool actually scrapes today. airports.gen.ts also carries
// inactive extras (DUS) — keep the landing copy truthful.
const ACTIVE_CODES = new Set(["EIN", "AMS", "BRU", "CRL", "MST"]);

type Status = "idle" | "submitting" | "done" | "already" | "error";

const inputClass =
  "w-full rounded-full border border-line bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 outline-none transition-colors focus:border-ink/40";

/**
 * Landing-page waitlist card: "we only fly from these airports today — tell
 * us yours and we'll ping you when we expand." Stores {name, email, airport}
 * via POST /api/waitlist.
 */
export default function WaitlistSignup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [airport, setAirport] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const activeOrigins = ORIGINS.filter((o) => ACTIVE_CODES.has(o.code));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, airport, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Something went wrong.");
        setStatus("error");
        return;
      }
      setStatus(data.already ? "already" : "done");
    } catch {
      setError("Something went wrong. Try again?");
      setStatus("error");
    }
  }

  const succeeded = status === "done" || status === "already";

  return (
    <section
      aria-labelledby="waitlist-heading"
      className="rounded-[var(--radius-card)] border border-line bg-card p-6 sm:p-8"
    >
      <p className="font-mono text-[11px] uppercase tracking-widest text-ink-muted/70">
        Expanding soon
      </p>
      <h2
        id="waitlist-heading"
        className="mt-2 font-display text-2xl font-bold tracking-tight text-ink"
      >
        Join the waitlist for your airport
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        Right now we watch flights going and coming from these airports. We
        are working on expanding the search a lot more soon. Leave your
        airport and we&rsquo;ll let you know the moment it&rsquo;s covered.
      </p>

      <ul className="mt-4 flex flex-wrap gap-2">
        {activeOrigins.map((o) => (
          <li
            key={o.code}
            className="inline-flex items-baseline gap-1.5 rounded-full border border-line bg-paper px-3 py-1"
          >
            <span className="font-mono text-xs font-semibold tracking-wide text-ink">
              {o.code}
            </span>
            <span className="text-xs text-ink-muted">{o.name}</span>
          </li>
        ))}
      </ul>

      {succeeded ? (
        <p className="mt-6 flex items-center gap-2 text-sm font-medium text-steal">
          <span aria-hidden="true">✓</span>
          {status === "already"
            ? "You're already on the list. We'll be in touch."
            : "You're on the list. We'll email you when your airport goes live."}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              autoComplete="name"
              maxLength={100}
              className={`${inputClass} sm:w-40`}
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoComplete="email"
              maxLength={200}
              className={`${inputClass} sm:flex-1`}
            />
            <input
              type="text"
              required
              value={airport}
              onChange={(e) => setAirport(e.target.value)}
              placeholder="Your airport or city"
              maxLength={100}
              className={`${inputClass} sm:flex-1`}
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
            <button
              type="submit"
              disabled={status === "submitting"}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-ink/90 disabled:opacity-60"
            >
              {status === "submitting" ? "Joining…" : "Notify me"}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-alert">{error}</p>}
        </form>
      )}
    </section>
  );
}
