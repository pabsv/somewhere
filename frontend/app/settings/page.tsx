"use client";

import { useEffect } from "react";
import AcademicCard from "@/components/settings/AcademicCard";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import FavouritesCard from "@/components/settings/FavouritesCard";
import PreferencesCard from "@/components/settings/PreferencesCard";
import YearPaint from "@/components/settings/YearPaint";

export default function SettingsPage() {
  // The native #favourites jump lands wrong: the cards above finish loading
  // after it (YearPaint alone adds ~1000px once its availability fetch lands)
  // and Next runs its own scroll on top. Re-assert the target for ~2s, giving
  // up as soon as it holds still or the user scrolls themselves.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;

    let stable = 0;
    const iv = window.setInterval(() => {
      const el = document.getElementById(id);
      if (!el) return;
      const off = el.getBoundingClientRect().top;
      // scroll-mt-24 keeps it clear of the nav, so "landed" is off ≈ 96px —
      // or already as far down as the page goes.
      const atBottom =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 1;
      if (Math.abs(off - 96) < 4 || (atBottom && off > 0)) {
        if (++stable >= 3) done();
        return;
      }
      stable = 0;
      el.scrollIntoView({ block: "start" });
    }, 100);

    const done = () => {
      clearInterval(iv);
      window.removeEventListener("wheel", done);
      window.removeEventListener("touchstart", done);
      clearTimeout(stop);
    };
    const stop = window.setTimeout(done, 2000);
    window.addEventListener("wheel", done, { passive: true });
    window.addEventListener("touchstart", done, { passive: true });
    return done;
  }, []);

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

      {/* Favourite destinations */}
      {/* id + scroll-mt: the calendar's "Edit favourite cities" link lands here,
          clear of the sticky nav. */}
      <section id="favourites" className="mb-12 scroll-mt-24">
        <div className="mb-4">
          <h2 className="font-display text-xl font-semibold text-ink">
            Favourite destinations
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">
            Star the cities you always want to see. We show their cheapest fare
            even when it isn&rsquo;t a steal, and pin them to the top of Explore.
          </p>
        </div>
        <div className="rounded-(--radius-card) border border-line bg-card p-5 shadow-(--shadow-card) sm:p-6">
          <FavouritesCard />
        </div>
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
