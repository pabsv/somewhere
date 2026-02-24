// Dynamic color assignment for destination IATA codes.
// Uses a polynomial hash so the same code always maps to the same color,
// deterministically, without needing a lookup table.
// Palette is large enough to cover all 57 configured destinations with few collisions.

const PALETTE_DARK = [
  "bg-orange-400",
  "bg-rose-500",
  "bg-emerald-500",
  "bg-sky-400",
  "bg-violet-400",
  "bg-amber-400",
  "bg-teal-500",
  "bg-pink-400",
  "bg-indigo-400",
  "bg-lime-500",
  "bg-cyan-500",
  "bg-fuchsia-400",
  "bg-red-400",
  "bg-blue-400",
  "bg-green-500",
  "bg-yellow-400",
];

const PALETTE_LIGHT = [
  "bg-orange-100 text-orange-700 border-orange-300",
  "bg-rose-100 text-rose-700 border-rose-300",
  "bg-emerald-100 text-emerald-700 border-emerald-300",
  "bg-sky-100 text-sky-700 border-sky-300",
  "bg-violet-100 text-violet-700 border-violet-300",
  "bg-amber-100 text-amber-700 border-amber-300",
  "bg-teal-100 text-teal-700 border-teal-300",
  "bg-pink-100 text-pink-700 border-pink-300",
  "bg-indigo-100 text-indigo-700 border-indigo-300",
  "bg-lime-100 text-lime-700 border-lime-300",
  "bg-cyan-100 text-cyan-700 border-cyan-300",
  "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300",
  "bg-red-100 text-red-700 border-red-300",
  "bg-blue-100 text-blue-700 border-blue-300",
  "bg-green-100 text-green-700 border-green-300",
  "bg-yellow-100 text-yellow-700 border-yellow-300",
];

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0; // unsigned 32-bit polynomial hash
  }
  return h;
}

export function getColor(code: string): string {
  return PALETTE_DARK[hashCode(code) % PALETTE_DARK.length];
}

export function getColorLight(code: string): string {
  return PALETTE_LIGHT[hashCode(code) % PALETTE_LIGHT.length];
}
