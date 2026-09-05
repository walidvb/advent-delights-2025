'use client';

import { CalendarCard } from './CalendarCard';
import { Day } from './types';

interface CalendarGridProps {
  days: Day[];
  revealedIndices: Set<number>;
  playingIndex: number | null;
  onReveal: (index: number) => void;
  onPlay: (index: number) => void;
  onHover: (day: Day | null, event: React.MouseEvent | null) => void;
  onMobileSelect: (day: Day) => void;
}

export function CalendarGrid({
  days,
  revealedIndices,
  playingIndex,
  onReveal,
  onPlay,
  onHover,
  onMobileSelect,
}: CalendarGridProps) {
  return (
    <div className="overflow-auto px-6 py-4">
      <div className="grid grid-cols-2 md:grid-cols-5 xl:grid-cols-7 gap-4">
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
