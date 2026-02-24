"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import MonthGrid from "./MonthGrid";
import { DateWindow } from "@/types";

const NUM_MONTHS = 6;

interface TwoMonthCalendarProps {
  selectedRanges: DateWindow[];
  onRangesChange: (ranges: DateWindow[]) => void;
  dealDates?: string[]; // Dates that have deals (YYYY-MM-DD)
  mode?: "select" | "view"; // select = settings, view = main page
  onDayClick?: (date: string) => void;
}

// Local-date safe key (avoids UTC shift for UTC+ timezones)
function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isInRange(date: Date, range: DateWindow): boolean {
  const d = formatDateKey(date);
  return d >= range.start && d <= range.end;
}

export default function TwoMonthCalendar({
  selectedRanges,
  onRangesChange,
  dealDates = [],
  mode = "select",
  onDayClick,
}: TwoMonthCalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const scrollRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [dragEnd, setDragEnd] = useState<Date | null>(null);

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
    const w = (monthEl?.offsetWidth ?? 320) + 24;
    el.scrollBy({ left: -w, behavior: "smooth" });
  };

  const scrollNext = () => {
    const el = scrollRef.current;
    if (!el) return;
    const monthEl = el.children[0] as HTMLElement | null;
    const w = (monthEl?.offsetWidth ?? 320) + 24;
    el.scrollBy({ left: w, behavior: "smooth" });
  };

  const handleMouseDown = useCallback((date: Date) => {
    if (mode !== "select") return;
    setIsDragging(true);
    setDragStart(date);
    setDragEnd(date);
  }, [mode]);

  const handleMouseEnter = useCallback((date: Date) => {
    if (isDragging && mode === "select") {
      setDragEnd(date);
    }
  }, [isDragging, mode]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging || !dragStart || !dragEnd || mode !== "select") {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    const start = dragStart < dragEnd ? dragStart : dragEnd;
    const end = dragStart < dragEnd ? dragEnd : dragStart;

    // Single-click on an existing range removes it
    const startKey = formatDateKey(dragStart);
    const endKey = formatDateKey(dragEnd);
    if (startKey === endKey) {
      const existingRange = selectedRanges.find(r => isInRange(dragStart, r));
      if (existingRange) {
        onRangesChange(selectedRanges.filter(r => r !== existingRange));
        setIsDragging(false);
        setDragStart(null);
        setDragEnd(null);
        return;
      }
    }

    const newRange: DateWindow = {
      start: formatDateKey(start),
      end: formatDateKey(end),
    };
    onRangesChange([...selectedRanges, newRange]);

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  }, [isDragging, dragStart, dragEnd, mode, selectedRanges, onRangesChange]);

  const isInDragRange = (date: Date): boolean => {
    if (!isDragging || !dragStart || !dragEnd) return false;
    const start = dragStart < dragEnd ? dragStart : dragEnd;
    const end = dragStart < dragEnd ? dragEnd : dragStart;
    return date >= start && date <= end;
  };

  const renderDay = ({ date, isCurrentMonth, isToday, isPast }: {
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    isPast: boolean;
  }) => {
    const selected = isSelected(date);
    const inDrag = isInDragRange(date);
    const deal = hasDeal(date);
    const canInteract = !isPast && isCurrentMonth;
    const dateKey = formatDateKey(date);
    const endingRange = mode === "select" ? selectedRanges.find(r => dateKey === r.end) : undefined;

    return (
      <div
        onMouseDown={() => canInteract && handleMouseDown(date)}
        onMouseEnter={() => handleMouseEnter(date)}
        onClick={() => mode === "view" && deal && onDayClick?.(formatDateKey(date))}
        className={`
          h-14 flex flex-col pt-1 text-sm select-none relative
          ${!isCurrentMonth ? "text-neutral-300 bg-white" : ""}
          ${isPast && isCurrentMonth ? "text-neutral-300 bg-neutral-50" : ""}
          ${isCurrentMonth && !isPast ? "cursor-pointer" : ""}
          ${selected && !inDrag ? "bg-blue-100" : ""}
          ${inDrag ? "bg-blue-200" : ""}
          ${canInteract && !selected && !inDrag ? "hover:bg-neutral-50" : ""}
          ${mode === "view" && deal ? "cursor-pointer" : ""}
        `}
      >
        <span
          className={`text-xs text-center ${
            isToday
              ? "w-5 h-5 mx-auto bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-medium"
              : ""
          }`}
        >
          {date.getDate()}
        </span>
        {deal && (
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-500 rounded-full" />
        )}
        {endingRange && (
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRangesChange(selectedRanges.filter(r => r !== endingRange));
            }}
            className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center text-[11px] text-blue-400 hover:text-blue-700 leading-none"
          >
            ×
          </button>
        )}
      </div>
    );
  };

  const isSelected = (date: Date) => selectedRanges.some(r => isInRange(date, r));
  const hasDeal = (date: Date) => dealDates.includes(formatDateKey(date));

  return (
    <div
      onMouseUp={handleMouseUp}
      onMouseLeave={() => isDragging && handleMouseUp()}
      className="select-none"
    >
      <div className="flex items-center gap-2">
        <button
          onClick={scrollPrev}
          className="flex-none p-1.5 hover:bg-neutral-100 rounded text-neutral-400 hover:text-neutral-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div
          ref={scrollRef}
          className="flex gap-6 flex-1 overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {months.map(({ year, month }) => (
            <div key={`${year}-${month}`} className="flex-none min-w-[280px] w-[calc(50%-12px)]">
              <MonthGrid year={year} month={month} renderDay={renderDay} />
            </div>
          ))}
        </div>

        <button
          onClick={scrollNext}
          className="flex-none p-1.5 hover:bg-neutral-100 rounded text-neutral-400 hover:text-neutral-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
