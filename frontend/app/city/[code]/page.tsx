// ─── /city/[code] — City detail (Track E) ───────────────────────────────────
// Thin server component: unwrap the Next 16 params Promise, normalize the code,
// and hand off to the client child which does the data fetching + rendering.
// Suspense boundary so the client child's useSearchParams (via useOrigins)
// never trips the static-bailout error. Spec: docs/DESIGN_V1.md A + F.

import { Suspense } from "react";
import CityDetail, { CityDetailFallback } from "@/components/city/CityDetail";

export default async function CityPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const normalized = code.toUpperCase();
  return (
    <Suspense fallback={<CityDetailFallback />}>
      <CityDetail code={normalized} />
    </Suspense>
  );
}
