// Simple 4-color scheme for destinations
export const destinationColors: Record<string, string> = {
  LIS: "bg-orange-400",
  BCN: "bg-rose-400",
  BUD: "bg-emerald-400",
  PRG: "bg-sky-400",
};

export const destinationColorsLight: Record<string, string> = {
  LIS: "bg-orange-100 text-orange-700 border-orange-300",
  BCN: "bg-rose-100 text-rose-700 border-rose-300",
  BUD: "bg-emerald-100 text-emerald-700 border-emerald-300",
  PRG: "bg-sky-100 text-sky-700 border-sky-300",
};

export function getColor(code: string): string {
  return destinationColors[code] || "bg-neutral-400";
}

export function getColorLight(code: string): string {
  return destinationColorsLight[code] || "bg-neutral-100 text-neutral-700 border-neutral-300";
}
