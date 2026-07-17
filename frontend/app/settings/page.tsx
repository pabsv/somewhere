"use client";

import AcademicCard from "@/components/settings/AcademicCard";
import CollapsibleSection from "@/components/settings/CollapsibleSection";
import PreferencesCard from "@/components/settings/PreferencesCard";
import YearPaint from "@/components/settings/YearPaint";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
          Settings
        </h1>
      </header>

      {/* Quick setup + Availability */}
      <section className="mb-12">
        <CollapsibleSection
          title="Availability"
          storageKey="somewhere:settings:availability-open"
        >
          <AcademicCard />
          <div className="border-t border-line pt-6">
            <YearPaint />
          </div>
        </CollapsibleSection>
      </section>

      {/* Preferences */}
      <section className="mb-12">
        <div className="mb-4">
          <h2 className="font-display text-xl font-semibold text-ink">
            Preferences
          </h2>
        </div>
        <div className="rounded-(--radius-card) border border-line bg-card p-5 shadow-(--shadow-card) sm:p-6">
          <PreferencesCard />
        </div>
      </section>
    </div>
  );
}
