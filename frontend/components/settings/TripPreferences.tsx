"use client";

interface TripPreferencesProps {
  maxPrice: number;
  directOnly: boolean;
  onChange: (prefs: { maxPrice: number; directOnly: boolean }) => void;
}

export default function TripPreferences({
  maxPrice,
  directOnly,
  onChange,
}: TripPreferencesProps) {
  const update = (partial: Partial<{ maxPrice: number; directOnly: boolean }>) => {
    onChange({ maxPrice, directOnly, ...partial });
  };

  return (
    <div className="space-y-4">
      {/* Max price */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Max price (€)
        </label>
        <input
          type="number"
          min={0}
          step={10}
          value={maxPrice}
          onChange={(e) => update({ maxPrice: parseInt(e.target.value) || 0 })}
          className="w-full px-3 py-2 border border-neutral-300 text-sm"
        />
      </div>

      {/* Direct only */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={directOnly}
          onChange={(e) => update({ directOnly: e.target.checked })}
          className="w-4 h-4"
        />
        <span className="text-sm text-neutral-700">Direct flights only</span>
      </label>
    </div>
  );
}
