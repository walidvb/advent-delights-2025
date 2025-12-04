'use client';

import { useState, useCallback, useMemo } from 'react';
import { Header } from './Header';
import { CalendarGrid } from './CalendarGrid';
import { DetailsCard } from './DetailsCard';
import { AboutSidebar } from './AboutSidebar';
import { Track, Participant } from './types';
import { useAdventDay } from './AdventDayContext';

interface AdventCalendarProps {
  tracks: Track[];
  participants: Participant[];
}

export function AdventCalendar({ tracks, participants }: AdventCalendarProps) {
  const { revealedIndices, addRevealedIndex } = useAdventDay();
  const [hoveredTrack, setHoveredTrack] = useState<Track | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [mobileSelectedTrack, setMobileSelectedTrack] = useState<Track | null>(
    null
  );

  const revealedSet = useMemo(
    () => new Set(revealedIndices),
    [revealedIndices]
  );

  const handleReveal = useCallback(
    (index: number) => {
      addRevealedIndex(index);
    },
    [addRevealedIndex]
  );

  const handleHover = useCallback(
    (track: Track | null, event: React.MouseEvent | null) => {
      setHoveredTrack(track);
      if (event) {
        setMousePosition({ x: event.clientX, y: event.clientY });
      }
    },
    []
  );

  const handleMobileSelect = useCallback((track: Track) => {
    setMobileSelectedTrack(track);
  }, []);

  const handleCloseMobileDetails = useCallback(() => {
    setMobileSelectedTrack(null);
  }, []);

  return (
    <div className="relative min-h-screen pb-24">
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(/light.webp)` }}
      />
      <Header onAboutClick={() => setIsAboutOpen(true)} />
      <CalendarGrid
        tracks={tracks}
        revealedIndices={revealedSet}
        onReveal={handleReveal}
        onHover={handleHover}
        onMobileSelect={handleMobileSelect}
      />
      <DetailsCard
        track={hoveredTrack}
        position={mousePosition}
        mobileTrack={mobileSelectedTrack}
        onCloseMobile={handleCloseMobileDetails}
      />
      <AboutSidebar
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        participants={participants}
      />
    </div>
  );
}
