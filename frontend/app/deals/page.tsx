"use client";

import { useState, useEffect, useMemo } from "react";
import DealCard from "@/components/deals/DealCard";
import DealFilters from "@/components/deals/DealFilters";
import { getDeals } from "@/lib/api";
import { Deal, DealFilters as FilterState } from "@/types";

export default function DealsPage() {
  const [allDeals, setAllDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<FilterState>({
    origin: null,
    destination: null,
    max_price: null,
    direct_only: false,
    date_from: null,
    date_to: null,
  });

  const [sortBy, setSortBy] = useState<"price" | "score" | "date">("score");

  useEffect(() => {
    getDeals()
      .then(setAllDeals)
      .finally(() => setLoading(false));
  }, []);

  const filteredDeals = useMemo(() => {
    let deals = [...allDeals];

    if (filters.origin)      deals = deals.filter((d) => d.origin === filters.origin);
    if (filters.destination) deals = deals.filter((d) => d.destination === filters.destination);
    if (filters.max_price)   deals = deals.filter((d) => d.price <= filters.max_price!);
    if (filters.direct_only) deals = deals.filter((d) => d.is_direct);
    if (filters.date_from)   deals = deals.filter((d) => d.outbound_date >= filters.date_from!);
    if (filters.date_to)     deals = deals.filter((d) => d.outbound_date <= filters.date_to!);

    switch (sortBy) {
      case "price": deals.sort((a, b) => a.price - b.price); break;
      case "score": deals.sort((a, b) => b.deal_score - a.deal_score); break;
      case "date":  deals.sort((a, b) => a.outbound_date.localeCompare(b.outbound_date)); break;
    }

    return deals;
  }, [allDeals, filters, sortBy]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">All Deals</h1>
      </div>

      {/* Filters */}
      <div className="border border-neutral-200 p-4 mb-6">
        <DealFilters
          filters={filters}
          onChange={setFilters}
          resultCount={filteredDeals.length}
          totalCount={allDeals.length}
        />
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <span className="text-neutral-500">Sort:</span>
        {(["score", "price", "date"] as const).map((option) => (
          <button
            key={option}
            onClick={() => setSortBy(option)}
            className={`px-2 py-1 ${
              sortBy === option
                ? "text-neutral-900 font-medium"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            {option === "score" ? "Best deal" : option === "price" ? "Price" : "Date"}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-8 text-sm text-neutral-400">Loading deals…</div>
      ) : filteredDeals.length === 0 ? (
        <div className="py-8 text-sm text-neutral-500">
          {allDeals.length === 0 ? "No deals available." : "No deals match your filters."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredDeals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}
    </div>
  );
}
