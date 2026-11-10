'use client';

import { CalendarCard } from './CalendarCard';
import { Day } from './types';

interface CalendarGridProps {
  year: number;
  days: Day[];
  revealedIndices: Set<number>;
  playingIndex: number | null;
  onReveal: (index: number) => void;
  onPlay: (index: number) => void;
  onHover: (day: Day | null, event: React.MouseEvent | null) => void;
  onMobileSelect: (day: Day) => void;
}

/** Weeks run Monday to Sunday, so Day 1 sits under its December 1st weekday. */
export function decemberOffset(year: number) {
  return (new Date(year, 11, 1).getDay() + 6) % 7;
}

export function CalendarGrid({
  year,
  days,
  revealedIndices,
  playingIndex,
  onReveal,
  onPlay,
  onHover,
  onMobileSelect,
}: CalendarGridProps) {
  const offset = decemberOffset(year);
  return (
    <div className="overflow-auto px-2 sm:px-6 py-4">
      <div className="grid grid-cols-7 gap-1 sm:gap-4">
        {offset > 0 && (
          <div aria-hidden style={{ gridColumn: `span ${offset}` }} />
        )}
        {days.map((day, index) => (
          <CalendarCard
            key={day.dayIndex}
            day={day}
            isRevealed={revealedIndices.has(day.dayIndex)}
            isPlaying={playingIndex === day.dayIndex}
            onReveal={() => onReveal(day.dayIndex)}
            onPlay={() => onPlay(day.dayIndex)}
            onHover={onHover}
            onMobileSelect={() => onMobileSelect(day)}
            entranceDelay={index * 0.05}
          />
        ))}
      </div>
    </div>
  );
}
