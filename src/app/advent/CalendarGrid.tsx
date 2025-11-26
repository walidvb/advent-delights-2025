'use client';

import { CalendarCard } from './CalendarCard';
import { Track } from './types';

interface CalendarGridProps {
  tracks: Track[];
  revealedIndices: Set<number>;
  playingIndex: number | null;
  onReveal: (index: number) => void;
  onPlay: (index: number) => void;
  onHover: (track: Track | null, event: React.MouseEvent | null) => void;
}

export function CalendarGrid({
  tracks,
  revealedIndices,
  playingIndex,
  onReveal,
  onPlay,
  onHover,
}: CalendarGridProps) {
  return (
    <div className="overflow-auto px-6 py-4">
      <div className="grid min-w-[800px] grid-cols-5 gap-4">
        {tracks.map((track) => (
          <CalendarCard
            key={track.dayIndex}
            track={track}
            isRevealed={revealedIndices.has(track.dayIndex)}
            isPlaying={playingIndex === track.dayIndex}
            onReveal={() => onReveal(track.dayIndex)}
            onPlay={() => onPlay(track.dayIndex)}
            onHover={onHover}
          />
        ))}
      </div>
    </div>
  );
}
