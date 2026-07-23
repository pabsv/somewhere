// ─── The gold contour — one definition, four bar renderers ───────────────────
// A favourited city's bar gets a gold ring drawn INSIDE its own bounds plus a
// ★ in the label. Shared by TripBar, StretchOverlay (the substitute bar shown
// while hovering), TripRail (mobile tag).
//
// Why an INSET box-shadow rather than a border or an outset ring — four
// separate hazards, all avoided by the same choice:
//
//   1. No bleed into the neighbour. The bars grid is `gap-px` and lane packing
//      treats touching trips as non-overlapping, so two bars can sit one column
//      apart with a 1px gutter. Any outset ring >=1px merges them into one
//      continuous gold stroke that reads as a single bar.
//   2. No layout shift. TripBar's steal skin declares no border width at all
//      while TripRail's declares `border`; a border-colour swap would be
//      free on one and 2px-growing on the other.
//   3. Clipped tags stay open. The rail zeroes border-radius on a clipped edge
//      so the flat side reads "continues past here". An inset shadow follows
//      that same computed radius instead of drawing a closed outline around a
//      deliberately open shape.
//   4. It composes with the near-miss skin, which uses `border-dashed` and
//      overrides the whole tier skin. Different CSS properties → both render:
//      amber still says "doesn't fit", gold still says "yours".
//
// Ring colour is per tier because the steal bar is a solid saturated green that
// swallows the deep gold — same shape as the existing TIER_BAR maps.

import type { DealTier } from "@/types/api";

export const FAV_RING: Record<DealTier, string> = {
  // solid --color-steal fill → the light gold is the only one that survives
  steal: "shadow-[inset_0_0_0_1.5px_var(--color-fav-hi)]",
  deal: "shadow-[inset_0_0_0_1.5px_var(--color-fav)]",
  fair: "shadow-[inset_0_0_0_1.5px_var(--color-fav)]",
};

/** Star colour, matched to the ring for the same contrast reason. */
export const FAV_GLYPH_TEXT: Record<DealTier, string> = {
  steal: "text-fav-hi",
  deal: "text-fav",
  fair: "text-fav",
};

/**
 * Ring classes for a bar, or "" when it isn't a favourite. `tier` is the
 * DISPLAYED tier (post-promotion), so the ring is picked against the fill that
 * actually renders.
 */
export function favRing(isFavourite: boolean, tier: DealTier): string {
  return isFavourite ? FAV_RING[tier] : "";
}

/**
 * The ★ that rides in the label. Kept even in the rail's shortest tags and in
 * TripBar's compact mode — when everything else is shed, "is this mine?" is
 * still worth one character.
 */
export const FAV_GLYPH = "★";
