"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import GoogleButton from "@/components/auth/GoogleButton";

// NextAuth's error redirect (both a failed Credentials POST and a failed
// Google OAuth round trip land back here via next-auth's own server-side
// redirect) only carries `error`/`code` — it drops `callbackUrl` entirely.
// Without this, retrying after a wrong password bounces you to "/" instead
// of back to e.g. /join/<token>. Stash it in sessionStorage on the way in so
// a bare /login?error=... reload can still recover it.
const CALLBACK_URL_KEY = "auth:callbackUrl";

function LoginForm() {
  const params = useSearchParams();
  const urlCallbackUrl = params.get("callbackUrl");
  const urlError = params.get("error");

  // Lazy-read, not an effect: this form only ever mounts client-side (it's
  // the child of a Suspense boundary around useSearchParams), so there's no
  // SSR value to mismatch against.
  const [storedCallbackUrl] = useState(() =>
    typeof window === "undefined" ? null : sessionStorage.getItem(CALLBACK_URL_KEY),
  );
  const callbackUrl = urlCallbackUrl ?? storedCallbackUrl ?? "/";

  useEffect(() => {
    if (urlCallbackUrl) sessionStorage.setItem(CALLBACK_URL_KEY, urlCallbackUrl);
  }, [urlCallbackUrl]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [credError, setCredError] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setCredError(false);
    // redirect:false so a failed attempt never leaves this page (and never
    // loses callbackUrl to next-auth's error redirect) — we drive
    // navigation ourselves on success instead.
    const result = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });
    if (result?.error) {
      setCredError(true);
      setLoading(false);
      return;
    }
    window.location.href = callbackUrl;
  }

  return (
    <div className="space-y-4">
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
          htmlFor="password"
          className="mb-1 block font-mono text-xs uppercase tracking-wide text-ink-muted"
        >
          Password
        </label>
        <Input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="rounded-(--radius-tag) border-line"
        />
      </div>

      {(credError || urlError) && (
        <p className="text-sm text-alert">
          {credError || urlError === "CredentialsSignin"
            ? "Could not sign you in. Check your email and password, then try again."
            : urlError === "OAuthSignin" ||
                urlError === "OAuthCallbackError" ||
                urlError === "AccessDenied"
              ? "Could not sign you in with Google. Please try again."
              : "Sign-in failed. Please try again."}
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

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="font-mono text-xs uppercase tracking-wide text-ink-muted">
          or
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <GoogleButton callbackUrl={callbackUrl} />

      <p className="mt-6 font-mono text-xs leading-relaxed text-ink-muted">
        No account yet?{" "}
        <Link
          href={
            callbackUrl !== "/"
              ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`
              : "/register"
          }
          className="underline hover:text-ink"
        >
          Create one
        </Link>
        .
      </p>
    </div>
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
      </div>
    </div>
  );
}
