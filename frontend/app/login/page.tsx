"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

function LoginForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/";
  const urlError = params.get("error");

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    await signIn("credentials", {
      email: email.trim().toLowerCase(),
      name: name.trim(),
      redirectTo: callbackUrl,
    });
    // signIn redirects on success; on failure it returns here via ?error=.
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          autoFocus
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="rounded-(--radius-tag) border-line"
        />
      </div>

      <div>
        <label
          htmlFor="name"
          className="mb-1 block font-mono text-xs uppercase tracking-wide text-ink-muted"
        >
          Display name
        </label>
        <Input
          id="name"
          type="text"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Alex"
          className="rounded-(--radius-tag) border-line"
        />
      </div>

      {urlError && (
        <p className="text-sm text-alert">
          Could not sign you in. Check your email and name, then try again.
        </p>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full rounded-(--radius-tag) bg-ink text-paper hover:bg-night"
      >
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-(--radius-card) border border-line bg-card p-8 shadow-(--shadow-card)">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            Sign in
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Fly somewhere. Cheap.
          </p>
        </div>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <p className="mt-6 font-mono text-xs leading-relaxed text-ink-muted">
          No password — this is a personal beta. Enter an email and a display
          name and we&apos;ll create your account automatically.
        </p>
      </div>
    </div>
  );
}
