'use client';

import { useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Header } from './Header';
import { CalendarGrid } from './CalendarGrid';
import { DetailsCard } from './DetailsCard';
import { Player } from './Player';
import { AboutSidebar } from './AboutSidebar';
import { Day, Contributor } from './types';
import { useAdventDay } from './AdventDayContext';

interface AdventCalendarProps {
  year: number;
  days: Day[];
  /** Null on a Self-filled Calendar, which credits nobody. */
  contributors: Contributor[] | null;
}

export function AdventCalendar({ year, days, contributors }: AdventCalendarProps) {
  const {
    openedIndices,
    addOpenedIndex,
    mood,
    shuffleEnabled,
    setShuffleEnabled,
  } = useAdventDay();
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<Day | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [mobileSelectedDay, setMobileSelectedDay] = useState<Day | null>(null);

  const openedSet = useMemo(() => new Set(openedIndices), [openedIndices]);

  // Sort opened indices to navigate through them in order
  const sortedOpenedIndices = useMemo(() => {
    return [...openedIndices].sort((a, b) => a - b);
  }, [openedIndices]);

  const handleReveal = useCallback(
    (index: number) => {
      addOpenedIndex(index);
    },
    [addOpenedIndex]
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
    if (playingIndex === null || sortedOpenedIndices.length === 0) return;

    if (shuffleEnabled) {
      const availableIndices = sortedOpenedIndices.filter(
        (i) => i !== playingIndex
      );
      if (availableIndices.length > 0) {
        const randomIndex =
          availableIndices[Math.floor(Math.random() * availableIndices.length)];
        setPlayingIndex(randomIndex);
      } else {
        setPlayingIndex(sortedOpenedIndices[0]);
      }
    } else {
      const currentPos = sortedOpenedIndices.indexOf(playingIndex);
      if (currentPos === -1) {
        setPlayingIndex(sortedOpenedIndices[0]);
      } else {
        const isLastTrack = currentPos === sortedOpenedIndices.length - 1;
        if (isLastTrack) {
          setShuffleEnabled(true);
          const availableIndices = sortedOpenedIndices.filter(
            (i) => i !== playingIndex
          );
          if (availableIndices.length > 0) {
            const randomIndex =
              availableIndices[
                Math.floor(Math.random() * availableIndices.length)
              ];
            setPlayingIndex(randomIndex);
          } else {
            setPlayingIndex(sortedOpenedIndices[0]);
          }
        } else {
          const nextPos = currentPos + 1;
          setPlayingIndex(sortedOpenedIndices[nextPos]);
        }
      }
    }
    setIsPlaying(true);
  }, [playingIndex, sortedOpenedIndices, shuffleEnabled, setShuffleEnabled]);

  const handlePrevious = useCallback(() => {
    if (playingIndex === null || sortedOpenedIndices.length === 0) return;

    const currentPos = sortedOpenedIndices.indexOf(playingIndex);
    if (currentPos === -1) {
      setPlayingIndex(sortedOpenedIndices[sortedOpenedIndices.length - 1]);
    } else {
      const prevPos =
        (currentPos - 1 + sortedOpenedIndices.length) %
        sortedOpenedIndices.length;
      setPlayingIndex(sortedOpenedIndices[prevPos]);
    }
    setIsPlaying(true);
  }, [playingIndex, sortedOpenedIndices]);

  const handleHover = useCallback(
    (day: Day | null, event: React.MouseEvent | null) => {
      setHoveredDay(day);
      if (event) {
        setMousePosition({ x: event.clientX, y: event.clientY });
      }
    },
    []
  );

  const handleMobileSelect = useCallback((day: Day) => {
    setMobileSelectedDay(day);
  }, []);

  const handleCloseMobileDetails = useCallback(() => {
    setMobileSelectedDay(null);
  }, []);

  const handleMobilePlay = useCallback(() => {
    if (mobileSelectedDay) {
      handlePlay(mobileSelectedDay.dayIndex);
    }
  }, [mobileSelectedDay, handlePlay]);

  const handleDetailsPlay = useCallback(() => {
    if (hoveredDay) {
      handlePlay(hoveredDay.dayIndex);
    }
  }, [hoveredDay, handlePlay]);

  const currentDay =
    playingIndex !== null
      ? days.find((d) => d.dayIndex === playingIndex) || null
      : null;

  return (
    <div className="relative min-h-screen pb-64 md:pb-24">
      <AnimatePresence>
        <motion.div
          key={mood}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${
              mood === 'light' ? '/light.webp' : '/dark.webp'
            })`,
          }}
        />
      </AnimatePresence>
      <Header onAboutClick={() => setIsAboutOpen(true)} />
      <CalendarGrid
        year={year}
        days={days}
        revealedIndices={openedSet}
        playingIndex={playingIndex}
        onReveal={handleReveal}
        onPlay={handlePlay}
        onHover={handleHover}
        onMobileSelect={handleMobileSelect}
      />
      {contributors && contributors.length > 0 && (
        <Participants contributors={contributors} mood={mood} />
      )}
      <DetailsCard
        day={hoveredDay}
        position={mousePosition}
        isPlaying={isPlaying && hoveredDay?.dayIndex === playingIndex}
        onPlay={handleDetailsPlay}
        mobileDay={mobileSelectedDay}
        onCloseMobile={handleCloseMobileDetails}
        onMobilePlay={handleMobilePlay}
        isMobilePlaying={
          isPlaying && mobileSelectedDay?.dayIndex === playingIndex
        }
      />
      <Player
        day={currentDay}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onNext={handleNext}
        onPrevious={handlePrevious}
      />
      <AboutSidebar
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        contributors={contributors}
      />
    </div>
  );
}

/**
 * Who is in this Calendar, under the grid. Names only, in the payload's
 * alphabetical order — which Day belongs to whom stays behind the doors.
 */
function Participants({ contributors, mood }: { contributors: Contributor[]; mood: string }) {
  const light = mood === 'light';
  return (
    <section className="mx-auto max-w-3xl px-6 pt-6 text-center">
      <h2
        className={`mb-2 font-mono text-[11px] uppercase tracking-wide ${
          light ? 'text-zinc-500' : 'text-zinc-400'
        }`}
      >
        With music from
      </h2>
      <p className={`text-sm leading-relaxed ${light ? 'text-zinc-700' : 'text-zinc-200'}`}>
        {contributors.map((contributor, index) => (
          <span key={contributor.name}>
            {index > 0 && ' · '}
            {contributor.link ? (
              <a
                href={contributor.link}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {contributor.name}
              </a>
            ) : (
              contributor.name
            )}
          </span>
        ))}
      </p>
    </section>
  );
}
