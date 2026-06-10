import type { Metadata } from "next";
import Navigation from "@/components/layout/Navigation";
import { bricolage, instrument, splineMono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Somewhere — fly somewhere, cheap",
  description:
    "Where could you go, cheap? Live flight deals from airports near you — no dates, no destination, no problem.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${instrument.variable} ${splineMono.variable}`}
    >
      <body className="min-h-dvh bg-paper text-ink antialiased">
        <Navigation />
        <main>{children}</main>
      </body>
    </html>
  );
}
