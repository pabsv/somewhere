"use client";

import { useState, useEffect, useRef } from "react";
import TwoMonthCalendar from "@/components/calendar/TwoMonthCalendar";
import AirportSelector from "@/components/settings/AirportSelector";
import DestinationPicker from "@/components/settings/DestinationPicker";
import TripPreferences from "@/components/settings/TripPreferences";
import Button from "@/components/ui/Button";
import { getPreferences, savePreferences, triggerScrape, getScrapeStatus, ScrapeState } from "@/lib/api";
import { UserPreferences, DateWindow } from "@/types";

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [saved, setSaved] = useState(false);
  const [scrape, setScrape] = useState<ScrapeState>({
    status: "idle",
    started_at: null,
    finished_at: null,
    result: null,
    error: null,
  });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getPreferences().then(setPrefs);
    // Sync scrape state on mount in case a scrape is already running
    getScrapeStatus().then(setScrape).catch(() => {});
  }, []);

  // Poll status while running
  useEffect(() => {
    if (scrape.status === "running") {
      pollRef.current = setInterval(() => {
        getScrapeStatus().then(setScrape).catch(() => {});
      }, 2000);
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [scrape.status]);

  if (!prefs) return null;

  const updatePrefs = (partial: Partial<UserPreferences>) => {
    setPrefs({ ...prefs, ...partial });
    setSaved(false);
  };

  const handleSave = () => {
    savePreferences(prefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleScrape = async () => {
    setScrape(s => ({ ...s, status: "running", result: null, error: null }));
    try {
      await triggerScrape();
    } catch (e) {
      setScrape(s => ({ ...s, status: "error", error: String(e) }));
    }
  };

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold text-neutral-900">Settings</h1>
        <Button onClick={handleSave} variant={saved ? "secondary" : "primary"}>
          {saved ? "Saved" : "Save changes"}
        </Button>
      </div>

      {/* Availability */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide mb-4">
          Availability
        </h2>
        <p className="text-sm text-neutral-500 mb-4">
          Drag on the calendar to select when you can travel.
        </p>
        <div className="border border-neutral-200 p-6">
          <TwoMonthCalendar
            selectedRanges={prefs.availability}
            onRangesChange={(ranges: DateWindow[]) => updatePrefs({ availability: ranges })}
            mode="select"
          />
        </div>
      </section>

      {/* Airports */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide mb-4">
          Departure Airports
        </h2>
        <div className="border border-neutral-200 p-6">
          <AirportSelector
            homeAirport={prefs.home_airport}
            nearbyAirports={prefs.nearby_airports}
            onHomeChange={(code) => updatePrefs({ home_airport: code })}
            onNearbyChange={(codes) => updatePrefs({ nearby_airports: codes })}
          />
        </div>
      </section>

      {/* Destinations */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide mb-4">
          Destinations
        </h2>
        <div className="border border-neutral-200 p-6">
          <DestinationPicker
            selected={prefs.destinations}
            onChange={(codes) => updatePrefs({ destinations: codes })}
          />
        </div>
      </section>

      {/* Search preferences */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide mb-1">
          Search Preferences
        </h2>
        <p className="text-sm text-neutral-500 mb-4">
          Trip length is calculated automatically from your availability windows.
        </p>
        <div className="border border-neutral-200 p-6">
          <TripPreferences
            maxPrice={prefs.max_price}
            directOnly={prefs.direct_only}
            onChange={({ maxPrice, directOnly }) =>
              updatePrefs({ max_price: maxPrice, direct_only: directOnly })
            }
          />
        </div>
      </section>

      {/* Save + Scrape */}
      <div className="border-t border-neutral-200 pt-6 flex items-start justify-between gap-8">
        <Button onClick={handleSave} variant={saved ? "secondary" : "primary"}>
          {saved ? "Saved" : "Save changes"}
        </Button>

        <div className="flex flex-col items-end gap-2">
          <Button
            onClick={handleScrape}
            variant="secondary"
            disabled={scrape.status === "running"}
          >
            {scrape.status === "running" ? "Scraping…" : "Run scraper"}
          </Button>

          {scrape.status === "running" && (
            <p className="text-xs text-neutral-500">
              Searching Azair for your destinations and dates — this takes a few minutes.
            </p>
          )}

          {scrape.status === "done" && scrape.result && (
            <p className="text-xs text-neutral-600">
              Done — {scrape.result.new} new flights, {scrape.result.updated} updated,{" "}
              <span className="font-medium">{scrape.result.deals} deals</span>
            </p>
          )}

          {scrape.status === "error" && (
            <p className="text-xs text-red-600">{scrape.error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
