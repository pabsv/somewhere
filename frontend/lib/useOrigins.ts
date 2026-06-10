"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ORIGINS } from "@/data/airports.gen";

const ALL_CODES = ORIGINS.map((o) => o.code);

/**
 * Origin selection, shared across Explore / Calendar / City via the
 * `?from=EIN,AMS` query param. No param (or an invalid one) = all origins.
 * At least one origin is always selected — the last one cannot be toggled
 * off. When everything is selected the param is dropped to keep URLs clean.
 */
export function useOrigins() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const origins = useMemo(() => {
    const raw = searchParams.get("from");
    if (!raw) return ALL_CODES;
    const requested = new Set(
      raw.split(",").map((c) => c.trim().toUpperCase()),
    );
    const valid = ALL_CODES.filter((c) => requested.has(c));
    return valid.length > 0 ? valid : ALL_CODES;
  }, [searchParams]);

  const toggle = useCallback(
    (code: string) => {
      if (!ALL_CODES.includes(code)) return;

      const selected = new Set(origins);
      if (selected.has(code)) {
        if (selected.size === 1) return; // cannot deselect the last origin
        selected.delete(code);
      } else {
        selected.add(code);
      }

      const next = ALL_CODES.filter((c) => selected.has(c));
      const params = new URLSearchParams(searchParams.toString());
      if (next.length === ALL_CODES.length) {
        params.delete("from");
      } else {
        params.set("from", next.join(","));
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [origins, searchParams, router, pathname],
  );

  const isSelected = useCallback(
    (code: string) => origins.includes(code),
    [origins],
  );

  return { origins, toggle, isSelected };
}
