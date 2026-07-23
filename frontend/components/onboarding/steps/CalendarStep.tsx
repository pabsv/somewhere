"use client";

// Availability step — mirrors the Settings → Availability section exactly:
// quick setup (busy-weekday chips + "Apply to calendar") on top, the full
// 12-month YearPaint underneath. Both components are the Settings ones and
// save themselves, so the wizard's Next button persists nothing here.

import AcademicCard from "@/components/settings/AcademicCard";
import YearPaint from "@/components/settings/YearPaint";

export default function CalendarStep() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">
          When are you free to fly?
        </h2>
      </div>

      <AcademicCard />

      {/* Full paint calendar — same component + size as Settings */}
      <div className="border-t border-line pt-6">
        <YearPaint />
      </div>
    </div>
  );
}
