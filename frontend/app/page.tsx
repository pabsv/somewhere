"use client";

import { useState, useEffect } from "react";
import DealsCalendar from "@/components/calendar/DealsCalendar";
import { getDeals, getPreferences } from "@/lib/api";
import { Deal, DateWindow } from "@/types";

export default function Home() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [availability, setAvailability] = useState<DateWindow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getDeals(), getPreferences()])
      .then(([d, prefs]) => {
        setDeals(d);
        setAvailability(prefs.availability);
      })
      .catch(() => setError("Could not connect to the API. Is it running?"))
      .finally(() => setLoading(false));
  }, []);

  const cheapest = deals.length > 0 ? Math.min(...deals.map((d) => d.price)) : null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">Flight Deals</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {loading
            ? "Loading…"
            : `${deals.length} deals · from €${cheapest}`}
        </p>
      </div>

      {/* Calendar */}
      {loading ? (
        <div className="py-16 text-sm text-neutral-400">Loading deals…</div>
      ) : error ? (
        <div className="py-16 text-sm text-red-500">{error}</div>
      ) : deals.length === 0 ? (
        <div className="py-16 text-sm text-neutral-500">No deals available.</div>
      ) : (
        <DealsCalendar deals={deals} availabilityWindows={availability} />
      )}

      {!loading && deals.length > 0 && (
        <p className="text-sm text-neutral-500 mt-6">
          Click a deal to see details and book.
        </p>
      )}
    </div>
  );
}
