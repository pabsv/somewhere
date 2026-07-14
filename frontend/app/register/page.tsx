"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import GoogleButton from "@/components/auth/GoogleButton";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not create your account. Try again.");
      setLoading(false);
      return;
    }

    // Account created — sign in with the same credentials and land on home.
    await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirectTo: "/",
    });
    setLoading(false);
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-(--radius-card) border border-line bg-card p-8 shadow-(--shadow-card)">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            Create account
          </h1>
          <p className="mt-1 text-sm text-ink-muted">Fly somewhere. Cheap.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="mb-1 block font-mono text-xs uppercase tracking-wide text-ink-muted"
            >
              Name
            </label>
            <Input
              id="name"
              type="text"
              required
              autoFocus
              autoComplete="name"
              maxLength={50}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="rounded-(--radius-tag) border-line"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1 block font-mono text-xs uppercase tracking-wide text-ink-muted"
            >
              Email
            </label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="rounded-(--radius-tag) border-line"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block font-mono text-xs uppercase tracking-wide text-ink-muted"
            >
              Password
            </label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="rounded-(--radius-tag) border-line"
            />
          </div>

          {error && <p className="text-sm text-alert">{error}</p>}

          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-(--radius-tag) bg-ink text-paper hover:bg-night"
          >
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <div className="mt-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="font-mono text-xs uppercase tracking-wide text-ink-muted">
            or
          </span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <div className="mt-4">
          <GoogleButton label="Sign up with Google" />
        </div>

        <p className="mt-6 font-mono text-xs leading-relaxed text-ink-muted">
          Already have an account?{" "}
          <Link href="/login" className="underline hover:text-ink">
            Sign in
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
