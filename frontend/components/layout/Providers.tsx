"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { SavedCitiesProvider } from "@/lib/saved-cities";

export default function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <SavedCitiesProvider>{children}</SavedCitiesProvider>
    </SessionProvider>
  );
}
