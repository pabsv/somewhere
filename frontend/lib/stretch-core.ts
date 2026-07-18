// ─── Trip-stretch core — pure candidate enumeration + hybrid pricing ─────────
// Powers the calendar hover's "leave earlier / return later / full window"
// suggestions. Mongo-free on purpose (mirrors openjaw-core) so it's unit
// testable: npx tsx --test lib/__tests__/stretch-core.test.ts
// Callers (lib/queries.ts) supply the exact stored round-trip fares and the
// two one-way grids; exact fares win, grid sums fill the gaps as ~estimates.

import type { StretchVariant } from "@/types/api";
import { parseLocalDate } from "@/lib/format";

/** Max days a trip may stretch per side (outside the full-window candidate). */
export const STRETCH_MAX_DAYS = 3;

export interface StretchCandidate {
  out: string;
  ret: string;
  kind: StretchVariant["kind"];
}

/** The slice of an exact stored round-trip fare that pricing needs. */
export interface ExactFare {
  price: number;
  deal_tier: StretchVariant["deal_tier"];
  delta_pct: number | null;
  search_link: string | null;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Local-safe YYYY-MM-DD + n days (no client-component imports). */
function addDays(from: string, n: number): string {
  const d = parseLocalDate(from);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Calendar nights between two YYYY-MM-DD strings (ret − out in days). */
function nightsOf(out: string, ret: string): number {
  const ms = parseLocalDate(ret).getTime() - parseLocalDate(out).getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * Enumerate the date pairs worth pricing for a hovered trip:
 *  - "earlier": depart 1..3 days sooner (never before today or the window start)
 *  - "later":   return 1..3 days later (never past the window end)
 *  - "full":    the whole availability window (only when bounds are given and
 *               the pair differs from the base trip and every other candidate)
 * Base pair itself is never emitted; neither is any pair with out >= ret.
 * Max 7 candidates.
 */
export function enumerateStretchCandidates(
  base: { out: string; ret: string },
  win: { winStart?: string; winEnd?: string },
  today: string,
): StretchCandidate[] {
  const candidates: StretchCandidate[] = [];
  const seen = new Set<string>([`${base.out}|${base.ret}`]);
  const push = (out: string, ret: string, kind: StretchCandidate["kind"]) => {
    const k = `${out}|${ret}`;
    if (out < today || out >= ret || seen.has(k)) return;
    seen.add(k);
    candidates.push({ out, ret, kind });
  };

  // earlier departures, closest shift first
  const earliestOut =
    win.winStart != null && win.winStart > today ? win.winStart : today;
  for (let i = 1; i <= STRETCH_MAX_DAYS; i++) {
    const out = addDays(base.out, -i);
    if (out < earliestOut) break;
    push(out, base.ret, "earlier");
  }

  // later returns, closest shift first
  for (let j = 1; j <= STRETCH_MAX_DAYS; j++) {
    const ret = addDays(base.ret, j);
    if (win.winEnd != null && ret > win.winEnd) break;
    push(base.out, ret, "later");
  }

  // the whole window
  if (win.winStart != null && win.winEnd != null) {
    const out = win.winStart > today ? win.winStart : today;
    push(out, win.winEnd, "full");
  }

  return candidates;
}

/**
 * Price candidates hybrid-style: an exact stored round-trip fare (keyed
 * "out|ret") wins; otherwise the sum of the two one-way grid fares becomes an
 * `estimated` variant; a pair with neither source is silently dropped.
 * Order: earlier (closest shift first), later (closest shift first), full.
 */
export function priceStretchCandidates(
  candidates: StretchCandidate[],
  exactByPair: Map<string, ExactFare>,
  outGrid: Record<string, number>,
  backGrid: Record<string, number>,
): StretchVariant[] {
  const variants: StretchVariant[] = [];
  for (const c of candidates) {
    const exact = exactByPair.get(`${c.out}|${c.ret}`);
    if (exact) {
      variants.push({
        out_date: c.out,
        return_date: c.ret,
        nights: nightsOf(c.out, c.ret),
        price: exact.price,
        estimated: false,
        kind: c.kind,
        deal_tier: exact.deal_tier,
        delta_pct: exact.delta_pct,
        search_link: exact.search_link,
      });
      continue;
    }
    const outFare = outGrid[c.out];
    const backFare = backGrid[c.ret];
    if (outFare == null || backFare == null) continue;
    variants.push({
      out_date: c.out,
      return_date: c.ret,
      nights: nightsOf(c.out, c.ret),
      price: outFare + backFare,
      estimated: true,
      kind: c.kind,
      deal_tier: null,
      delta_pct: null,
      search_link: null,
    });
  }
  // enumerate() already emits earlier→later→full with closest shifts first —
  // keep that order (a sort by date would put the furthest earlier shift first)
  return variants;
}
