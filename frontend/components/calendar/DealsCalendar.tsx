"use client";

import { useState, useMemo, useRef } from "react";
import { Deal, DateWindow } from "@/types";
import { getColor } from "@/data/colors";
import { buildAzairSearchUrl } from "@/lib/api";

const NUM_MONTHS = 6;

interface DealsCalendarProps {
  deals: Deal[];
  availabilityWindows?: DateWindow[];
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function formatKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Parse date string as local date (not UTC)
function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDisplayDate(dateStr: string): string {
  const date = parseDate(dateStr);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatDisplayDateLong(dateStr: string): string {
  const date = parseDate(dateStr);
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export default function DealsCalendar({ deals, availabilityWindows = [] }: DealsCalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredDealId, setHoveredDealId] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Calendar view: one bar per destination+dates combo — keep best deal_score (then lowest price)
  const calendarDeals = useMemo(() => {
    const best = new Map<string, Deal>();
    for (const deal of deals) {
      const key = `${deal.destination}-${deal.outbound_date}-${deal.return_date}`;
      const existing = best.get(key);
      if (
        !existing ||
        deal.deal_score > existing.deal_score ||
        (deal.deal_score === existing.deal_score && deal.price < existing.price)
      ) {
        best.set(key, deal);
      }
    }
    return Array.from(best.values());
  }, [deals]);

  // Assign each deal a consistent row index for stacking
  const dealRows = useMemo(() => {
    const rows: Deal[][] = [];
    const sorted = [...calendarDeals].sort((a, b) => a.outbound_date.localeCompare(b.outbound_date));

    for (const deal of sorted) {
      let placed = false;
      for (let i = 0; i < rows.length; i++) {
        const lastInRow = rows[i][rows[i].length - 1];
        if (lastInRow.return_date < deal.outbound_date) {
          rows[i].push(deal);
          placed = true;
          break;
        }
      }
      if (!placed) {
        rows.push([deal]);
      }
    }

    const map: Record<string, number> = {};
    rows.forEach((row, rowIndex) => {
      row.forEach(deal => {
        map[deal.id] = rowIndex;
      });
    });
    return map;
  }, [calendarDeals]);

  const maxRows = Math.max(...Object.values(dealRows), 0) + 1;

  const getDealsForDate = (dateKey: string): Deal[] => {
    return calendarDeals
      .filter(d => dateKey >= d.outbound_date && dateKey <= d.return_date)
      .sort((a, b) => (dealRows[a.id] || 0) - (dealRows[b.id] || 0));
  };

  const destinations = useMemo(() => {
    const seen = new Set<string>();
    return deals
      .filter(d => {
        if (seen.has(d.destination)) return false;
        seen.add(d.destination);
        return true;
      })
      .map(d => ({ code: d.destination, city: d.destination_city }));
  }, [deals]);

  const hoveredDeal = calendarDeals.find(d => d.id === hoveredDealId) || null;

  // Generate NUM_MONTHS months starting from current month
  const months = useMemo(() => {
    const result: { year: number; month: number }[] = [];
    for (let i = 0; i < NUM_MONTHS; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      result.push({ year: d.getFullYear(), month: d.getMonth() });
    }
    return result;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollPrev = () => {
    const el = scrollRef.current;
    if (!el) return;
    const monthEl = el.children[0] as HTMLElement | null;
    const w = (monthEl?.offsetWidth ?? 320) + 24; // 24 = gap-6
    el.scrollBy({ left: -w, behavior: "smooth" });
  };

  const scrollNext = () => {
    const el = scrollRef.current;
    if (!el) return;
    const monthEl = el.children[0] as HTMLElement | null;
    const w = (monthEl?.offsetWidth ?? 320) + 24;
    el.scrollBy({ left: w, behavior: "smooth" });
  };

  const isAvailable = (dateKey: string): boolean =>
    availabilityWindows.some((w) => dateKey >= w.start && dateKey <= w.end);

  const handleMouseMove = (e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const renderMonth = (year: number, month: number) => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const monthName = new Date(year, month).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    const days: React.ReactNode[] = [];

    // Filler days from prev month
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push(
        <div key={`prev-${i}`} className="h-14 flex flex-col pt-1 text-neutral-300 bg-white">
          <span className="text-xs text-center">{daysInPrevMonth - i}</span>
        </div>
      );
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const key = formatKey(date);
      const isToday = date.getTime() === today.getTime();
      const isPast = date < today;
      const available = !isPast && isAvailable(key);
      const dayDeals = getDealsForDate(key);

      // Create slots for each row
      const slots: (Deal | null)[] = Array(maxRows).fill(null);
      dayDeals.forEach(deal => {
        const row = dealRows[deal.id];
        if (row !== undefined && row < maxRows) {
          slots[row] = deal;
        }
      });

      days.push(
        <div
          key={day}
          className={`h-14 flex flex-col pt-1 ${isPast ? "bg-neutral-50" : available ? "bg-blue-50" : "bg-white"}`}
        >
          <span
            className={`text-xs text-center mb-1 ${
              isToday
                ? "w-5 h-5 mx-auto bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-medium"
                : isPast
                ? "text-neutral-300"
                : "text-neutral-600"
            }`}
          >
            {day}
          </span>

          <div className="flex-1 flex flex-col justify-start gap-px px-0">
            {slots.slice(0, 3).map((deal, idx) => {
              if (!deal) {
                return <div key={idx} className="h-2.5" />;
              }

              const isStart = key === deal.outbound_date;
              const isEnd = key === deal.return_date;
              const isHovered = hoveredDealId === deal.id;

              return (
                <button
                  key={deal.id}
                  onClick={() => setSelectedDeal(deal)}
                  onMouseEnter={() => setHoveredDealId(deal.id)}
                  onMouseLeave={() => setHoveredDealId(null)}
                  onMouseMove={handleMouseMove}
                  className={`h-2.5 flex items-center ${getColor(deal.destination)} ${
                    isHovered ? "opacity-100 ring-1 ring-neutral-600" : "opacity-90"
                  } ${isStart ? "rounded-l ml-0.5" : ""} ${isEnd ? "rounded-r mr-0.5" : ""}`}
                >
                  {isStart && (
                    <span className="text-[8px] font-bold text-white pl-1 truncate">
                      €{deal.price}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    // Filler days for next month
    const totalCells = 42;
    const remaining = totalCells - days.length;

    for (let i = 1; i <= remaining; i++) {
      days.push(
        <div key={`next-${i}`} className="h-14 flex flex-col pt-1 text-neutral-300 bg-white">
          <span className="text-xs text-center">{i}</span>
        </div>
      );
    }

    return (
      <div key={`${year}-${month}`} className="flex-none min-w-[280px] w-[calc(50%-12px)]">
        <h3 className="text-sm font-semibold text-neutral-900 mb-3">{monthName}</h3>
        <div className="grid grid-cols-7 gap-px bg-neutral-200">
          {WEEKDAYS.map((d) => (
            <div key={d} className="bg-neutral-50 py-1.5 text-center text-xs font-medium text-neutral-500">
              {d}
            </div>
          ))}
          {days}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mb-4">
        {destinations.map((d) => (
          <div key={d.code} className="flex items-center gap-1.5">
            <div className={`w-6 h-2.5 rounded ${getColor(d.code)}`} />
            <span className="text-xs text-neutral-600">{d.city}</span>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="flex items-center gap-2">
        <button onClick={scrollPrev} className="flex-none p-1.5 hover:bg-neutral-100 rounded text-neutral-400 hover:text-neutral-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div
          ref={scrollRef}
          className="flex gap-6 flex-1 overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {months.map(({ year, month }) => renderMonth(year, month))}
        </div>

        <button onClick={scrollNext} className="flex-none p-1.5 hover:bg-neutral-100 rounded text-neutral-400 hover:text-neutral-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Tooltip */}
      {hoveredDeal && (
        <div
          className="fixed z-50 bg-neutral-900 text-white text-xs px-3 py-2 rounded shadow-lg pointer-events-none"
          style={{ left: tooltipPos.x + 12, top: tooltipPos.y + 12 }}
        >
          <div className="font-medium">
            €{hoveredDeal.price} · {hoveredDeal.origin} → {hoveredDeal.destination_city}
          </div>
          <div className="text-neutral-400 mt-0.5">
            {formatDisplayDate(hoveredDeal.outbound_date)} – {formatDisplayDate(hoveredDeal.return_date)}
            {hoveredDeal.duration_days ? ` · ${hoveredDeal.duration_days}d` : ""}
            {" · "}{hoveredDeal.is_direct ? "Direct" : `${(hoveredDeal.outbound_stops ?? 0) + (hoveredDeal.return_stops ?? 0)} stop`}
            {" · "}{hoveredDeal.airline}
          </div>
        </div>
      )}

      {/* Modal */}
      {selectedDeal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setSelectedDeal(null)}>
          <div className="bg-white shadow-xl p-5 max-w-xs w-full mx-4 rounded" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-semibold text-neutral-900">{selectedDeal.origin} → {selectedDeal.destination}</div>
                <div className="text-sm text-neutral-500">{selectedDeal.destination_city}</div>
              </div>
              <div className="text-xl font-bold text-neutral-900">€{selectedDeal.price}</div>
            </div>
            <div className="text-sm text-neutral-600 space-y-1 mb-4">
              <div>
                {formatDisplayDateLong(selectedDeal.outbound_date)} – {formatDisplayDateLong(selectedDeal.return_date)}
                {selectedDeal.duration_days ? ` · ${selectedDeal.duration_days} days` : ""}
              </div>
              {selectedDeal.outbound_departure && (
                <div className="text-neutral-500">
                  ↗ {selectedDeal.outbound_departure}–{selectedDeal.outbound_arrival}
                  {selectedDeal.outbound_duration ? ` · ${selectedDeal.outbound_duration}` : ""}
                  {selectedDeal.outbound_stops ? ` · ${selectedDeal.outbound_stops} stop` : " · Direct"}
                </div>
              )}
              {selectedDeal.return_departure && (
                <div className="text-neutral-500">
                  ↙ {selectedDeal.return_departure}–{selectedDeal.return_arrival}
                  {selectedDeal.return_duration ? ` · ${selectedDeal.return_duration}` : ""}
                  {selectedDeal.return_stops ? ` · ${selectedDeal.return_stops} stop` : " · Direct"}
                </div>
              )}
              <div>{selectedDeal.airline}</div>
            </div>
            <div className="flex flex-col gap-2">
              <a
                href={selectedDeal.azair_link}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-blue-600 text-white text-center py-2 text-sm font-medium rounded hover:bg-blue-700"
              >
                Book this flight →
              </a>
              <a
                href={buildAzairSearchUrl(selectedDeal)}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full border border-neutral-300 text-neutral-700 text-center py-2 text-sm font-medium rounded hover:bg-neutral-50"
              >
                View alternatives
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
