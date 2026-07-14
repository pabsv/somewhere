"use client";

// "Continue with Google" — kicks off the NextAuth Google OAuth flow and lands
// on `callbackUrl` (same destination as the credentials flow). Shared by the
// login and register pages. Requires AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET.

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function GoogleButton({
  callbackUrl = "/",
  label = "Continue with Google",
}: {
  callbackUrl?: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        signIn("google", { redirectTo: callbackUrl });
      }}
      className="flex w-full items-center justify-center gap-2.5 rounded-(--radius-tag) border border-line bg-card px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-paper disabled:opacity-50"
    >
      <svg aria-hidden="true" viewBox="0 0 18 18" className="h-[18px] w-[18px]">
        <path
          fill="#4285F4"
          d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2582h2.9086c1.7018-1.5668 2.6836-3.874 2.6836-6.6151z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.4673-.806 5.9564-2.1818l-2.9086-2.2582c-.8059.54-1.8368.859-3.0478.859-2.344 0-4.3282-1.5831-5.036-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"
        />
        <path
          fill="#FBBC05"
          d="M3.964 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2823-1.71V4.9582H.9573C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9573 4.0418L3.964 10.71z"
        />
        <path
          fill="#EA4335"
          d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z"
        />
      </svg>
      {label}
    </button>
  );
}
