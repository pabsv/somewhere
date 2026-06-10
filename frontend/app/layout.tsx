import type { Metadata } from "next";
import Navigation from "@/components/layout/Navigation";
import Providers from "@/components/layout/Providers";
import { auth } from "@/auth";
import { bricolage, instrument, splineMono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Somewhere — fly somewhere, cheap",
  description:
    "Where could you go, cheap? Live flight deals from airports near you — no dates, no destination, no problem.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${instrument.variable} ${splineMono.variable}`}
    >
      <body className="min-h-dvh bg-paper text-ink antialiased">
        <Navigation
          user={
            session?.user
              ? { name: session.user.name ?? "Traveler", role: session.user.role }
              : null
          }
        />
        <main>
          <Providers session={session}>{children}</Providers>
        </main>
      </body>
    </html>
  );
}
