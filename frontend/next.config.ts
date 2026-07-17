import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NEXT_DIST_DIR lets a second dev server run beside the default one
  // (Next 16 holds a lock in .next/dev) — used by `npm run dev:alt`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
