"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { SavedCitiesProvider } from "@/lib/saved-cities";
import { UniCalendarProvider } from "@/lib/university/context";
import OnboardingGate from "@/components/onboarding/OnboardingGate";

export default function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <OnboardingGate />
      <SavedCitiesProvider>
        <UniCalendarProvider>{children}</UniCalendarProvider>
      </SavedCitiesProvider>
    </SessionProvider>
  );
}
