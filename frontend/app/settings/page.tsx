"use client";

import { useState, useEffect } from "react";
import TwoMonthCalendar from "@/components/calendar/TwoMonthCalendar";
import AirportSelector from "@/components/settings/AirportSelector";
import DestinationPicker from "@/components/settings/DestinationPicker";
import TripPreferences from "@/components/settings/TripPreferences";
import Button from "@/components/ui/Button";
import { getPreferences, savePreferences } from "@/lib/api";
import { UserPreferences, DateWindow } from "@/types";

function formatShortDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getPreferences().then(setPrefs);
  }, []);

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

  const removeWindow = (index: number) => {
    updatePrefs({ availability: prefs.availability.filter((_, i) => i !== index) });
  };

  const clearAvailability = () => updatePrefs({ availability: [] });

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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">
            Availability
          </h2>
          {prefs.availability.length > 0 && (
            <button
              onClick={clearAvailability}
              className="text-sm text-neutral-500 hover:text-neutral-900"
            >
              Clear all
            </button>
          )}
        </div>
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

        {/* Individual range removal */}
        {prefs.availability.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {prefs.availability.map((window, i) => (
              <button
                key={i}
                onClick={() => removeWindow(i)}
                className="flex items-center gap-1.5 px-2 py-0.5 text-xs border border-neutral-300 text-neutral-600 hover:border-neutral-500 hover:text-neutral-900"
              >
                <span>
                  {window.label
                    ? window.label
                    : `${formatShortDate(window.start)} – ${formatShortDate(window.end)}`}
                </span>
                <span className="text-neutral-400">×</span>
              </button>
            ))}
          </div>
        )}
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

      {/* Trip preferences */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide mb-4">
          Trip Preferences
        </h2>
        <div className="border border-neutral-200 p-6">
          <TripPreferences
            minDays={prefs.min_days}
            maxDays={prefs.max_days}
            maxPrice={prefs.max_price}
            directOnly={prefs.direct_only}
            onChange={({ minDays, maxDays, maxPrice, directOnly }) =>
              updatePrefs({
                min_days: minDays,
                max_days: maxDays,
                max_price: maxPrice,
                direct_only: directOnly,
              })
            }
          />
        </div>
      </section>

      {/* Save (bottom) */}
      <div className="border-t border-neutral-200 pt-6">
        <Button onClick={handleSave} variant={saved ? "secondary" : "primary"}>
          {saved ? "Saved" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
