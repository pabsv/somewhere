"use client";

import DealsCalendar from "@/components/calendar/DealsCalendar";
import { mockDeals } from "@/data/mock-deals";

export default function Home() {
  const hotDeals = mockDeals.filter((d) => d.is_hot_deal).length;
  const cheapest = Math.min(...mockDeals.map((d) => d.price));

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">Flight Deals</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {mockDeals.length} deals found · {hotDeals} hot · from €{cheapest}
        </p>
      </div>

      {/* Calendar */}
      <DealsCalendar deals={mockDeals} />

      {/* Help text */}
      <p className="text-sm text-neutral-500 mt-6">
        Click a deal to see details and book.
      </p>
    </div>
  );
}
