import {
  Bricolage_Grotesque,
  Instrument_Sans,
  Spline_Sans_Mono,
} from "next/font/google";

/**
 * Somewhere type system (DESIGN_V1 §F):
 * - Bricolage Grotesque — display (titles, city names)
 * - Instrument Sans    — body/UI
 * - Spline Sans Mono   — ALL flight data (prices, dates, IATA codes)
 */

export const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-bricolage",
});

export const instrument = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument",
});

export const splineMono = Spline_Sans_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-spline-mono",
});
