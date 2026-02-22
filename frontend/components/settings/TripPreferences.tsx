"use client";

interface TripPreferencesProps {
  minDays: number;
  maxDays: number;
  maxPrice: number;
  directOnly: boolean;
  onChange: (prefs: {
    minDays: number;
    maxDays: number;
    maxPrice: number;
    directOnly: boolean;
  }) => void;
}

export default function TripPreferences({
  minDays,
  maxDays,
  maxPrice,
  directOnly,
  onChange,
}: TripPreferencesProps) {
  const update = (partial: Partial<{
    minDays: number;
    maxDays: number;
    maxPrice: number;
    directOnly: boolean;
  }>) => {
    onChange({ minDays, maxDays, maxPrice, directOnly, ...partial });
  };

  return (
    <div className="space-y-4">
      {/* Trip length */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Min days
          </label>
          <input
            type="number"
            min={1}
            max={maxDays}
            value={minDays}
            onChange={(e) => update({ minDays: parseInt(e.target.value) || 1 })}
            className="w-full px-3 py-2 border border-neutral-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Max days
          </label>
          <input
            type="number"
            min={minDays}
            max={30}
            value={maxDays}
            onChange={(e) => update({ maxDays: parseInt(e.target.value) || 7 })}
            className="w-full px-3 py-2 border border-neutral-300 text-sm"
          />
        </div>
      </div>

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
