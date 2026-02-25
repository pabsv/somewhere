"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import { setStoredUser } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(name.trim(), email.trim());
      setStoredUser(user);
      router.push("/");
    } catch {
      setError("Could not connect to the API. Is it running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-sm px-6">
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-neutral-900">FlightDeals</h1>
          <p className="text-sm text-neutral-500 mt-1">Find cheap flights on your schedule.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-700 mb-1" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alice"
              required
              autoFocus
              className="w-full border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-700 mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alice@example.com"
              required
              className="w-full border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-neutral-900 text-white text-sm py-2 px-4 hover:bg-neutral-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-xs text-neutral-400 mt-6">
          New here? Just enter your name and email — we'll create your account automatically.
        </p>
      </div>
    </div>
  );
}
