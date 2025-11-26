'use client';

import { useState, useCallback, useMemo } from 'react';
import { Header } from './Header';
import { CalendarGrid } from './CalendarGrid';
import { DetailsCard } from './DetailsCard';
import { Player } from './Player';
import { TRACKS } from './data';
import { Track } from './types';
import { useAdventDay } from './AdventDayContext';

export function AdventCalendar() {
  const { revealedIndices, addRevealedIndex } = useAdventDay();
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hoveredTrack, setHoveredTrack] = useState<Track | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const revealedSet = useMemo(() => new Set(revealedIndices), [revealedIndices]);

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
    if (playingIndex === null) return;
    const nextIndex = playingIndex < 24 ? playingIndex + 1 : 0;
    setPlayingIndex(nextIndex);
    setIsPlaying(true);
  }, [playingIndex]);

  const handlePrevious = useCallback(() => {
    if (playingIndex === null) return;
    const prevIndex = playingIndex > 0 ? playingIndex - 1 : 24;
    setPlayingIndex(prevIndex);
    setIsPlaying(true);
  }, [playingIndex]);

  const handleHover = useCallback((track: Track | null, event: React.MouseEvent | null) => {
    setHoveredTrack(track);
    if (event) {
      setMousePosition({ x: event.clientX, y: event.clientY });
    }
  }, []);

  const handleDetailsPlay = useCallback(() => {
    if (hoveredTrack) {
      handlePlay(hoveredTrack.dayIndex);
    }
  }, [hoveredTrack, handlePlay]);

  const currentTrack = playingIndex !== null ? TRACKS.find((t) => t.dayIndex === playingIndex) || null : null;

  return (
    <div className="min-h-screen bg-white pb-24">
      <Header />
      <CalendarGrid
        tracks={TRACKS}
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
