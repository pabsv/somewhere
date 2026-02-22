"use client";

import { useMemo } from "react";

interface DayInfo {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
}

interface MonthGridProps {
  year: number;
  month: number; // 0-indexed
  renderDay: (day: DayInfo) => React.ReactNode;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Convert to Monday = 0
}

export default function MonthGrid({ year, month, renderDay }: MonthGridProps) {
  const monthName = new Date(year, month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const days = useMemo(() => {
    const result: DayInfo[] = [];
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Previous month days
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

    for (let i = firstDay - 1; i >= 0; i--) {
      const date = new Date(prevYear, prevMonth, daysInPrevMonth - i);
      result.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isPast: date < today,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      result.push({
        date,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        isPast: date < today,
      });
    }

    // Next month days to fill grid
    const remaining = 42 - result.length; // 6 rows x 7 days
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;

    for (let day = 1; day <= remaining; day++) {
      const date = new Date(nextYear, nextMonth, day);
      result.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isPast: date < today,
      });
    }

    return result;
  }, [year, month]);

  return (
    <div>
      <h3 className="text-sm font-semibold text-neutral-900 mb-3">{monthName}</h3>
      <div className="grid grid-cols-7 gap-px bg-neutral-200">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="bg-neutral-50 py-2 text-center text-xs font-medium text-neutral-500"
          >
            {day}
          </div>
        ))}
        {days.map((day, i) => (
          <div key={i} className="bg-white">
            {renderDay(day)}
          </div>
        ))}
      </div>
    </div>
  );
}
