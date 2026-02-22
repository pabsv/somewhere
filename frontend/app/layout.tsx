import type { Metadata } from "next";
import Navigation from "@/components/layout/Navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlightDeals",
  description: "Find cheap flight deals based on your availability",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-neutral-900 antialiased">
        <Navigation />
        <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
