"use client";

import AcademicCard from "@/components/settings/AcademicCard";
import PreferencesCard from "@/components/settings/PreferencesCard";
import YearPaint from "@/components/settings/YearPaint";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
          Settings
        </h1>
        <p className="mt-2 max-w-xl text-base text-ink-muted">
          Tune what counts as your kind of trip. Nothing here hides deals — it
          just decides which ones get the spotlight.
        </p>
      </header>

      {/* Quick setup */}
      <section className="mb-12">
        <div className="mb-4">
          <h2 className="font-display text-xl font-semibold text-ink">
            Quick setup
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">
            Fast-fill your calendar: tick the weekdays you can&apos;t travel,
            apply, and the free days get painted below.
          </p>
        </div>
        <div className="rounded-(--radius-card) border border-line bg-card p-5 shadow-(--shadow-card) sm:p-6">
          <AcademicCard />
        </div>
      </section>

      {/* Availability */}
      <section className="mb-12">
        <div className="mb-4">
          <h2 className="font-display text-xl font-semibold text-ink">
            Availability
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">
            Paint the dates you&apos;re free to fly. We&apos;ll surface trips
            that fit your windows.
          </p>
        </div>
        <div className="rounded-(--radius-card) border border-line bg-card p-5 shadow-(--shadow-card) sm:p-6">
          <YearPaint />
        </div>
      </section>

      {/* Preferences */}
      <section className="mb-12">
        <div className="mb-4">
          <h2 className="font-display text-xl font-semibold text-ink">
            Preferences
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">
            Your defaults for airports, trip length, and price.
          </p>
        </div>
        <div className="rounded-(--radius-card) border border-line bg-card p-5 shadow-(--shadow-card) sm:p-6">
          <PreferencesCard />
        </div>
      </section>
    </div>
  );
}
