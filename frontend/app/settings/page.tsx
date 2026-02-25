"use client";

import { useState, useEffect, useRef } from "react";
import TwoMonthCalendar from "@/components/calendar/TwoMonthCalendar";
import AirportSelector from "@/components/settings/AirportSelector";
import DestinationPicker from "@/components/settings/DestinationPicker";
import TripPreferences from "@/components/settings/TripPreferences";
import { getPreferences, savePreferences } from "@/lib/api";
import { UserPreferences, DateWindow } from "@/types";

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoaded = useRef(false);

  useEffect(() => {
    getPreferences().then((p) => {
      setPrefs(p);
      hasLoaded.current = true;
    });
  }, []);

  // Auto-save with 600ms debounce after any preference change
  useEffect(() => {
    if (!hasLoaded.current || !prefs) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveStatus("saving");

    debounceRef.current = setTimeout(async () => {
      await savePreferences(prefs);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1500);
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [prefs]);

  if (!prefs) return null;

  const updatePrefs = (partial: Partial<UserPreferences>) => {
    setPrefs({ ...prefs, ...partial });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold text-neutral-900">Settings</h1>
        {saveStatus === "saving" && (
          <span className="text-xs text-neutral-400">Saving…</span>
        )}
        {saveStatus === "saved" && (
          <span className="text-xs text-neutral-400">Saved</span>
        )}
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
          {prefs.availability.length > 0 && (
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <button
                onClick={() => updatePrefs({ availability: [] })}
                className="text-xs text-neutral-400 hover:text-red-500"
              >
                Clear all dates
              </button>
            </div>
          )}
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
    </div>
  );
}
