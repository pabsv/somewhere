import type { MetadataRoute } from "next";

/**
 * Web App Manifest — makes Somewhere installable ("Add to Home Screen") so it
 * launches standalone, full-bleed, with no browser chrome. Colors mirror the
 * design tokens in globals.css (paper background, night board for the splash).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Somewhere — fly somewhere, cheap",
    short_name: "Somewhere",
    description:
      "Live flight deals from airports near you — no dates, no destination, no problem.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#14171d",
    theme_color: "#faf7f0",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
