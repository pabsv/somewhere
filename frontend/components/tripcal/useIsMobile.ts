"use client";

import { useEffect, useState } from "react";

/**
 * True when the viewport is below `breakpoint` (default 768px → spec's mobile
 * agenda cutoff). SSR-safe: starts false, resolves on mount, tracks changes.
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}
