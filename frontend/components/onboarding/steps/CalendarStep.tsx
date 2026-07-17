"use client";

// Availability step — mirrors the Settings → Availability section exactly:
// quick setup (busy-weekday chips + "Apply to calendar") on top, the full
// 12-month YearPaint underneath. Both components are the Settings ones,
// unmodified — they load and save themselves, so the wizard's Next button
// persists nothing here (no clobber risk). The TU/e chip saves through the
// wizard on Next (it lives on preferences, like in Settings).

import Chip from "@/components/ui/Chip";
import AcademicCard from "@/components/settings/AcademicCard";
import YearPaint from "@/components/settings/YearPaint";

export default function CalendarStep({
  university,
  onToggleUniversity,
}: {
  university: boolean;
  onToggleUniversity: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">
          When are you free to fly?
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          We&rsquo;ll only surface trips that fit your free days. Quick setup
          below paints your recurring pattern — then fine-tune any day on the
          calendar.
        </p>
      </div>

      {/* TU/e — overlays exam periods + holidays on the calendar */}
      <div>
        <h3 className="mb-2 font-mono text-xs uppercase tracking-wide text-ink-muted">
          University calendar
        </h3>
        <Chip size="sm" selected={university} onClick={onToggleUniversity}>
          I&rsquo;m a TU/e student
        </Chip>
        <p className="mt-1.5 text-sm text-ink-muted/80">
          Shows TU/e exam periods and holidays on your calendars.
        </p>
      </div>

      {/* Quick setup — same component as Settings */}
      <div>
        <h3 className="mb-2 font-mono text-xs uppercase tracking-wide text-ink-muted">
          Quick setup
        </h3>
        <AcademicCard />
      </div>

      {/* Full paint calendar — same component + size as Settings */}
      <YearPaint />
    </div>
  );
}
