"use client";

import { useState, useCallback } from "react";
import MonthGrid from "./MonthGrid";
import { DateWindow } from "@/types";

interface TwoMonthCalendarProps {
  selectedRanges: DateWindow[];
  onRangesChange: (ranges: DateWindow[]) => void;
  dealDates?: string[]; // Dates that have deals (YYYY-MM-DD)
  mode?: "select" | "view"; // select = settings, view = main page
  onDayClick?: (date: string) => void;
}

function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
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
  const [baseMonth, setBaseMonth] = useState(today.getMonth());
  const [baseYear, setBaseYear] = useState(today.getFullYear());

  // Drag selection state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [dragEnd, setDragEnd] = useState<Date | null>(null);

  const secondMonth = baseMonth === 11 ? 0 : baseMonth + 1;
  const secondYear = baseMonth === 11 ? baseYear + 1 : baseYear;

  const prevMonths = () => {
    if (baseMonth === 0) {
      setBaseMonth(11);
      setBaseYear(baseYear - 1);
    } else {
      setBaseMonth(baseMonth - 1);
    }
  };

  const nextMonths = () => {
    if (baseMonth === 11) {
      setBaseMonth(0);
      setBaseYear(baseYear + 1);
    } else {
      setBaseMonth(baseMonth + 1);
    }
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

    // Check if clicking on existing range to remove it
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

    // Add new range
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

  const isSelected = (date: Date): boolean => {
    return selectedRanges.some(r => isInRange(date, r));
  };

  const hasDeal = (date: Date): boolean => {
    return dealDates.includes(formatDateKey(date));
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
          ${!isCurrentMonth ? "text-neutral-300" : ""}
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

  return (
    <div
      onMouseUp={handleMouseUp}
      onMouseLeave={() => isDragging && handleMouseUp()}
      className="select-none"
    >
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonths}
          className="p-1 text-neutral-500 hover:text-neutral-900"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={nextMonths}
          className="p-1 text-neutral-500 hover:text-neutral-900"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Two month grids */}
      <div className="grid grid-cols-2 gap-8">
        <MonthGrid
          year={baseYear}
          month={baseMonth}
          renderDay={renderDay}
        />
        <MonthGrid
          year={secondYear}
          month={secondMonth}
          renderDay={renderDay}
        />
      </div>
    </div>
  );
}
