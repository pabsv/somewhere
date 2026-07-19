import { ImageResponse } from "next/og";

// Link-preview card (WhatsApp, iMessage, Slack, X). Rendered once per deploy
// by Next at /opengraph-image — keep it dependency-free (no fonts fetched,
// system sans only) so the edge render can never fail the share preview.
export const runtime = "edge";
export const alt = "Somewhere — fly somewhere, cheap";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BOARD = "#14171d";
const BRAND = "#ffc72c";
const PAPER = "#faf7f0";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          backgroundColor: BOARD,
          color: PAPER,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {/* wayfinding chevron from icon.svg, same geometry */}
          <svg width="99" height="80" viewBox="150 156 248 200">
            <path d="M150 156 H318 L398 256 L318 356 H150 Z" fill={BRAND} />
          </svg>
          <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -2 }}>
            Somewhere
          </div>
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 40,
            lineHeight: 1.3,
            color: "#c8cdd6",
            maxWidth: 900,
          }}
        >
          Where could you go, cheap? Live flight deals from airports near you —
          no dates, no destination, no problem.
        </div>
        <div
          style={{
            marginTop: 48,
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 30,
            color: BRAND,
            letterSpacing: 4,
          }}
        >
          FLYSOMEWHERE.APP
        </div>
      </div>
    ),
    size
  );
}
