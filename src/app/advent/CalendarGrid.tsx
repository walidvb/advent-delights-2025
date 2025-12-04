'use client';

import { CalendarCard } from './CalendarCard';
import { Track } from './types';

interface CalendarGridProps {
  tracks: Track[];
  revealedIndices: Set<number>;
  onReveal: (index: number) => void;
  onHover: (track: Track | null, event: React.MouseEvent | null) => void;
  onMobileSelect: (track: Track) => void;
}

export function CalendarGrid({
  tracks,
  revealedIndices,
  onReveal,
  onHover,
  onMobileSelect,
}: CalendarGridProps) {
  return (
    <div className="overflow-auto px-6 py-4">
      <div className="grid grid-cols-2 md:grid-cols-5 xl:grid-cols-7 gap-4">
        {tracks.map((track, index) => (
          <CalendarCard
            key={track.dayIndex}
            track={track}
            isRevealed={revealedIndices.has(track.dayIndex)}
            onReveal={() => onReveal(track.dayIndex)}
            onHover={onHover}
            onMobileSelect={() => onMobileSelect(track)}
            entranceDelay={index * 0.05}
          />
        ))}
      </div>
    </div>
  );
}
