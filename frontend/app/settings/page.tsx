"use client";

import { useState, useEffect } from "react";
import TwoMonthCalendar from "@/components/calendar/TwoMonthCalendar";
import AirportSelector from "@/components/settings/AirportSelector";
import DestinationPicker from "@/components/settings/DestinationPicker";
import TripPreferences from "@/components/settings/TripPreferences";
import { getPreferences, savePreferences } from "@/lib/api";
import { UserPreferences, DateWindow } from "@/types";

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "dirty" | "saving" | "saved">("idle");
  const [availabilityOpen, setAvailabilityOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("settings_availability_open");
    return stored === null ? true : stored === "true";
  });

  const toggleAvailability = () => {
    const next = !availabilityOpen;
    setAvailabilityOpen(next);
    localStorage.setItem("settings_availability_open", String(next));
  };

  useEffect(() => {
    getPreferences().then((p) => {
      setPrefs(p);
    });
  }, []);

  const handleSave = async () => {
    if (!prefs) return;
    setSaveStatus("saving");
    await savePreferences(prefs);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 1500);
  };

  if (!prefs) return null;

  const updatePrefs = (partial: Partial<UserPreferences>) => {
    setPrefs({ ...prefs, ...partial });
    setSaveStatus("dirty");
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold text-neutral-900">Settings</h1>
        <button
          onClick={handleSave}
          disabled={saveStatus === "saving" || saveStatus === "saved" || saveStatus === "idle"}
          className={`text-sm px-4 py-1.5 font-medium border transition-colors ${
            saveStatus === "saved"
              ? "border-green-200 bg-green-50 text-green-700 cursor-default"
              : saveStatus === "saving"
              ? "border-neutral-200 text-neutral-400 cursor-default"
              : saveStatus === "dirty"
              ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
              : "border-neutral-200 text-neutral-300 cursor-default"
          }`}
        >
          {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved ✓" : "Save changes"}
        </button>
      </div>

      {/* Availability */}
      <section className="mb-10">
        <button
          onClick={toggleAvailability}
          className="flex items-center justify-between w-full mb-4 group"
        >
          <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">
            Availability
          </h2>
          <svg
            className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${availabilityOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {availabilityOpen && (
          <>
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
          </>
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
