"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import GoogleButton from "@/components/auth/GoogleButton";

// Same key/rationale as app/login/page.tsx: next-auth's error redirect drops
// callbackUrl, so stash it before kicking off any sign-in attempt (the
// post-signup auto sign-in below, or GoogleButton) — if that bounces back to
// /login?error=..., the login page can still recover it from here.
const CALLBACK_URL_KEY = "auth:callbackUrl";

function RegisterForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/";

  useEffect(() => {
    if (params.get("callbackUrl")) {
      sessionStorage.setItem(CALLBACK_URL_KEY, callbackUrl);
    }
  }, [params, callbackUrl]);

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
    // redirect:false so, in the unlikely case this sign-in itself fails, we
    // don't lose callbackUrl to next-auth's error redirect (see login/page.tsx).
    const result = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });
    if (result?.error) {
      setError("Account created, but signing you in failed — please sign in.");
      setLoading(false);
      return;
    }
    window.location.href = callbackUrl;
  }

  return (
    <>
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
        <GoogleButton label="Sign up with Google" callbackUrl={callbackUrl} />
      </div>

      <p className="mt-6 font-mono text-xs leading-relaxed text-ink-muted">
        Already have an account?{" "}
        <Link
          href={
            callbackUrl !== "/"
              ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
              : "/login"
          }
          className="underline hover:text-ink"
        >
          Sign in
        </Link>
        .
      </p>
    </>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-(--radius-card) border border-line bg-card p-8 shadow-(--shadow-card)">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            Create account
          </h1>
          <p className="mt-1 text-sm text-ink-muted">Fly somewhere. Cheap.</p>
        </div>

        <Suspense fallback={null}>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
