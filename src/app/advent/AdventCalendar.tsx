'use client';

import { useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Header } from './Header';
import { CalendarGrid } from './CalendarGrid';
import { DetailsCard } from './DetailsCard';
import { Player } from './Player';
import { AboutSidebar } from './AboutSidebar';
import { Track, Participant } from './types';
import { useAdventDay } from './AdventDayContext';

interface AdventCalendarProps {
  tracks: Track[];
  participants: Participant[];
}

export function AdventCalendar({ tracks, participants }: AdventCalendarProps) {
  const {
    revealedIndices,
    addRevealedIndex,
    variant,
    shuffleEnabled,
    setShuffleEnabled,
  } = useAdventDay();
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
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
        // addRevealedIndex(index);
      }
    },
    [playingIndex, isPlaying]
  );

  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleNext = useCallback(() => {
    if (playingIndex === null || sortedRevealedIndices.length === 0) return;

    if (shuffleEnabled) {
      const availableIndices = sortedRevealedIndices.filter(
        (i) => i !== playingIndex
      );
      if (availableIndices.length > 0) {
        const randomIndex =
          availableIndices[Math.floor(Math.random() * availableIndices.length)];
        setPlayingIndex(randomIndex);
      } else {
        setPlayingIndex(sortedRevealedIndices[0]);
      }
    } else {
      const currentPos = sortedRevealedIndices.indexOf(playingIndex);
      if (currentPos === -1) {
        setPlayingIndex(sortedRevealedIndices[0]);
      } else {
        const isLastTrack = currentPos === sortedRevealedIndices.length - 1;
        if (isLastTrack) {
          setShuffleEnabled(true);
          const availableIndices = sortedRevealedIndices.filter(
            (i) => i !== playingIndex
          );
          if (availableIndices.length > 0) {
            const randomIndex =
              availableIndices[
                Math.floor(Math.random() * availableIndices.length)
              ];
            setPlayingIndex(randomIndex);
          } else {
            setPlayingIndex(sortedRevealedIndices[0]);
          }
        } else {
          const nextPos = currentPos + 1;
          setPlayingIndex(sortedRevealedIndices[nextPos]);
        }
      }
    }
    setIsPlaying(true);
  }, [playingIndex, sortedRevealedIndices, shuffleEnabled, setShuffleEnabled]);

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

  const handleMobileSelect = useCallback((track: Track) => {
    setMobileSelectedTrack(track);
  }, []);

  const handleCloseMobileDetails = useCallback(() => {
    setMobileSelectedTrack(null);
  }, []);

  const handleMobilePlay = useCallback(() => {
    if (mobileSelectedTrack) {
      handlePlay(mobileSelectedTrack.dayIndex);
    }
  }, [mobileSelectedTrack, handlePlay]);

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
    <div className="relative min-h-screen pb-64 md:pb-24">
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
      <Header onAboutClick={() => setIsAboutOpen(true)} />
      <CalendarGrid
        tracks={tracks}
        revealedIndices={revealedSet}
        playingIndex={playingIndex}
        onReveal={handleReveal}
        onPlay={handlePlay}
        onHover={handleHover}
        onMobileSelect={handleMobileSelect}
      />
      <DetailsCard
        track={hoveredTrack}
        position={mousePosition}
        isPlaying={isPlaying && hoveredTrack?.dayIndex === playingIndex}
        onPlay={handleDetailsPlay}
        mobileTrack={mobileSelectedTrack}
        onCloseMobile={handleCloseMobileDetails}
        onMobilePlay={handleMobilePlay}
        isMobilePlaying={
          isPlaying && mobileSelectedTrack?.dayIndex === playingIndex
        }
      />
      <Player
        track={currentTrack}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onNext={handleNext}
        onPrevious={handlePrevious}
      />
      <AboutSidebar
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        participants={participants}
      />
    </div>
  );
}
