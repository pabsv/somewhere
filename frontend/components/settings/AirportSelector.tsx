"use client";

import { airports, getNearbyAirports } from "@/data/airports";
import Chip from "@/components/ui/Chip";

interface AirportSelectorProps {
  homeAirport: string;
  nearbyAirports: string[];
  onHomeChange: (code: string) => void;
  onNearbyChange: (codes: string[]) => void;
}

export default function AirportSelector({
  homeAirport,
  nearbyAirports,
  onHomeChange,
  onNearbyChange,
}: AirportSelectorProps) {
  const suggestions = getNearbyAirports(homeAirport);

  const toggleNearby = (code: string) => {
    if (nearbyAirports.includes(code)) {
      onNearbyChange(nearbyAirports.filter((c) => c !== code));
    } else {
      onNearbyChange([...nearbyAirports, code]);
    }
  };

  const handleHomeChange = (code: string) => {
    onHomeChange(code);
    // Auto-clear nearby airports that are now the home
    if (nearbyAirports.includes(code)) {
      onNearbyChange(nearbyAirports.filter((c) => c !== code));
    }
  };

  return (
    <div className="space-y-4">
      {/* Home airport */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Home airport
        </label>
        <select
          value={homeAirport}
          onChange={(e) => handleHomeChange(e.target.value)}
          className="w-full px-3 py-2 border border-neutral-300 bg-white text-sm"
        >
          {airports.map((a) => (
            <option key={a.code} value={a.code}>
              {a.code} – {a.name}
            </option>
          ))}
        </select>
      </div>

      {/* Nearby airports */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Also search from
        </label>
        {suggestions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((airport) => (
              <Chip
                key={airport.code}
                selected={nearbyAirports.includes(airport.code)}
                onClick={() => toggleNearby(airport.code)}
                size="sm"
              >
                {airport.code}
              </Chip>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">No nearby airports found</p>
        )}
      </div>
    </div>
  );
}
