'use client';

import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { useAdventDay } from './AdventDayContext';
import { Track } from './types';

interface CalendarCardProps {
  track: Track;
  isRevealed: boolean;
  isPlaying: boolean;
  onReveal: () => void;
  onPlay: () => void;
  onHover: (track: Track | null, event: React.MouseEvent | null) => void;
}

function generateMaskPosition(day: number): { x: number; y: number } {
  const seed = day * 17;
  return {
    x: 30 + (seed % 40),
    y: 30 + ((seed * 3) % 40),
  };
}

export function CalendarCard({
  track,
  isRevealed,
  isPlaying,
  onReveal,
  onPlay,
  onHover,
}: CalendarCardProps) {
  const { currentDayIndex } = useAdventDay();
  const isInactive = track.dayIndex > currentDayIndex;
  const isUnrevealed = !isInactive && !isRevealed;
  const [isHovered, setIsHovered] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);

  const maskPosition = useMemo(() => generateMaskPosition(track.dayIndex + 1), [track.dayIndex]);

  const handleClick = () => {
    if (isInactive) return;
    if (isUnrevealed) {
      setIsRevealing(true);
      setTimeout(() => {
        onReveal();
        setIsRevealing(false);
      }, 600);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isRevealed) {
      onHover(track, e);
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    onHover(null, null);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isInactive) {
      onPlay();
    }
  };

  const getMaskSize = () => {
    if (isRevealing) return 200;
    return 15;
  };

  return (
    <motion.div
      className="relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-zinc-100"
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileHover={!isInactive ? { scale: 1.02 } : undefined}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="absolute inset-0"
        animate={{
          filter: isInactive ? 'grayscale(100%) opacity(0.3)' : 'none',
        }}
      >
        <Image
          src={track.coverImage}
          alt={`Day ${track.dayIndex + 1}`}
          fill
          className="object-cover transition-all duration-500"
          style={{
            filter: isUnrevealed && !isRevealing ? 'blur(20px)' : 'blur(0px)',
            WebkitMaskImage: isUnrevealed
              ? `radial-gradient(circle at ${maskPosition.x}% ${maskPosition.y}%, black 0%, black ${getMaskSize() * 0.5}%, transparent ${getMaskSize()}%)`
              : undefined,
            maskImage: isUnrevealed
              ? `radial-gradient(circle at ${maskPosition.x}% ${maskPosition.y}%, black 0%, black ${getMaskSize() * 0.5}%, transparent ${getMaskSize()}%)`
              : undefined,
            transition: 'mask-image 0.6s ease-out, -webkit-mask-image 0.6s ease-out, filter 0.5s ease-out',
          }}
        />

        <AnimatePresence>
          {isUnrevealed && !isRevealing && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ duration: 0.3 }}
            >
              <Image
                src={track.coverImage}
                alt=""
                width={80}
                height={80}
                className="rounded object-cover shadow-lg"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {isUnrevealed && isHovered && !isRevealing && (
          <motion.div
            className="absolute inset-0 flex items-end justify-center pb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <span className="rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-zinc-700 shadow-sm">
              Discover track
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-2 right-2 text-2xl font-light text-white drop-shadow-lg">
        {track.dayIndex + 1}
      </div>

      {!isInactive && (
        <button
          onClick={handlePlayClick}
          className="absolute bottom-2 left-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow-md transition-transform hover:scale-110"
        >
          {isPlaying ? (
            <PauseIcon className="h-4 w-4" />
          ) : (
            <PlayIcon className="h-4 w-4 ml-0.5" />
          )}
        </button>
      )}
    </motion.div>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}
