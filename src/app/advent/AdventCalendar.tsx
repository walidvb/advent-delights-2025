'use client';

import { useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Header } from './Header';
import { CalendarGrid } from './CalendarGrid';
import { DetailsCard } from './DetailsCard';
import { Player } from './Player';
import { Track } from './types';
import { useAdventDay } from './AdventDayContext';

interface AdventCalendarProps {
  tracks: Track[];
}

export function AdventCalendar({ tracks }: AdventCalendarProps) {
  const { revealedIndices, addRevealedIndex, variant } = useAdventDay();
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hoveredTrack, setHoveredTrack] = useState<Track | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const revealedSet = useMemo(
    () => new Set(revealedIndices),
    [revealedIndices]
  );

  // Sort revealed indices to navigate through them in order
  const sortedRevealedIndices = useMemo(() => {
    return [...revealedIndices].sort((a, b) => a - b);
  }, [revealedIndices]);

  const handleReveal = useCallback(
    (index: number) => {
      addRevealedIndex(index);
    },
    [addRevealedIndex]
  );

  const handlePlay = useCallback(
    (index: number) => {
      if (playingIndex === index) {
        setIsPlaying(!isPlaying);
      } else {
        setPlayingIndex(index);
        setIsPlaying(true);
        addRevealedIndex(index);
      }
    },
    [playingIndex, isPlaying, addRevealedIndex]
  );

  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleNext = useCallback(() => {
    if (playingIndex === null || sortedRevealedIndices.length === 0) return;

    const currentPos = sortedRevealedIndices.indexOf(playingIndex);
    if (currentPos === -1) {
      // If current playing track is somehow not in revealed list (shouldn't happen normally if we only play revealed),
      // just go to the first revealed.
      // However, handlePlay adds it to revealed, so it should be there.
      setPlayingIndex(sortedRevealedIndices[0]);
    } else {
      const nextPos = (currentPos + 1) % sortedRevealedIndices.length;
      setPlayingIndex(sortedRevealedIndices[nextPos]);
    }
    setIsPlaying(true);
  }, [playingIndex, sortedRevealedIndices]);

  const handlePrevious = useCallback(() => {
    if (playingIndex === null || sortedRevealedIndices.length === 0) return;

    const currentPos = sortedRevealedIndices.indexOf(playingIndex);
    if (currentPos === -1) {
      setPlayingIndex(sortedRevealedIndices[sortedRevealedIndices.length - 1]);
    } else {
      const prevPos =
        (currentPos - 1 + sortedRevealedIndices.length) %
        sortedRevealedIndices.length;
      setPlayingIndex(sortedRevealedIndices[prevPos]);
    }
    setIsPlaying(true);
  }, [playingIndex, sortedRevealedIndices]);

  const handleHover = useCallback(
    (track: Track | null, event: React.MouseEvent | null) => {
      setHoveredTrack(track);
      if (event) {
        setMousePosition({ x: event.clientX, y: event.clientY });
      }
    },
    []
  );

  const handleDetailsPlay = useCallback(() => {
    if (hoveredTrack) {
      handlePlay(hoveredTrack.dayIndex);
    }
  }, [hoveredTrack, handlePlay]);

  const currentTrack =
    playingIndex !== null
      ? tracks.find((t) => t.dayIndex === playingIndex) || null
      : null;

  return (
    <div className="relative min-h-screen pb-24">
      <AnimatePresence>
        <motion.div
          key={variant}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${
              variant === 'light' ? '/light.webp' : '/dark.webp'
            })`,
          }}
        />
      </AnimatePresence>
      <Header />
      <CalendarGrid
        tracks={tracks}
        revealedIndices={revealedSet}
        playingIndex={playingIndex}
        onReveal={handleReveal}
        onPlay={handlePlay}
        onHover={handleHover}
      />
      <DetailsCard
        track={hoveredTrack}
        position={mousePosition}
        isPlaying={isPlaying && hoveredTrack?.dayIndex === playingIndex}
        onPlay={handleDetailsPlay}
      />
      <Player
        track={currentTrack}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onNext={handleNext}
        onPrevious={handlePrevious}
      />
    </div>
  );
}
