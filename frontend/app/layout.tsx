import type { Metadata, Viewport } from "next";
import Navigation from "@/components/layout/Navigation";
import Providers from "@/components/layout/Providers";
import { auth } from "@/auth";
import { bricolage, instrument, splineMono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://flysomewhere.app"),
  title: "Somewhere — fly somewhere, cheap",
  description:
    "Where could you go, cheap? Live flight deals from airports near you — no dates, no destination, no problem.",
  applicationName: "Somewhere",
  // Link previews (WhatsApp, iMessage, Slack, ...). The og:image itself is
  // generated at /opengraph-image by app/opengraph-image.tsx.
  openGraph: {
    type: "website",
    url: "https://flysomewhere.app",
    siteName: "Somewhere",
    title: "Somewhere — fly somewhere, cheap",
    description:
      "Where could you go, cheap? Live flight deals from airports near you — no dates, no destination, no problem.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Somewhere — fly somewhere, cheap",
    description:
      "Where could you go, cheap? Live flight deals from airports near you — no dates, no destination, no problem.",
  },
  // Installed-app behavior on iOS: standalone (no Safari chrome), board-dark
  // status bar to match the splash.
  appleWebApp: {
    capable: true,
    title: "Somewhere",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg" }],
  },
};

// Mobile chrome: device-width, zoom allowed (a11y), full-bleed under the notch
// (viewport-fit cover → safe-area insets become available to the layout).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f0" },
    { media: "(prefers-color-scheme: dark)", color: "#14171d" },
  ],
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
        {/* Bottom padding clears the mobile tab bar (+ the phone's home-bar
            safe area); removed at md where the tab bar is hidden. */}
        <main className="safe-bottom-nav md:pb-0">
          <Providers session={session}>{children}</Providers>
        </main>
      </body>
    </html>
  );
}
