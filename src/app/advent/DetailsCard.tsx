'use client';

import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { Track } from './types';
import { useAdventDay } from './AdventDayContext';

interface DetailsCardProps {
  track: Track | null;
  position: { x: number; y: number };
  isPlaying: boolean;
  onPlay: () => void;
}

export function DetailsCard({
  track,
  position,
  isPlaying,
  onPlay,
}: DetailsCardProps) {
  const { variant } = useAdventDay();

  if (!track) return null;

  const coverImage =
    variant === 'light' ? track.lightCoverImage : track.heavyCoverImage;
  const creditedTo =
    variant === 'light' ? track.lightCreditedTo : track.heavyCreditedTo;
  const description =
    variant === 'light' ? track.lightDescription : track.heavyDescription;
  const artistName =
    variant === 'light' ? track.lightArtistName : track.heavyArtistName;
  const trackName =
    variant === 'light' ? track.lightTrackName : track.heavyTrackName;

  return (
    <AnimatePresence>
      {track && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.15 }}
          className="pointer-events-none fixed z-50 w-80 rounded-[12px] p-[20px] backdrop-blur-[25px] backdrop-filter bg-[rgba(251,251,251,0.7)] shadow-[-1px_-1px_8px_0px_rgba(255,255,255,0.7),1px_1px_8px_0px_rgba(54,60,83,0.25)]"
          style={{
            left: position.x + 20,
            top: position.y - 100,
          }}
        >
          <div className="relative mb-2 aspect-square w-full overflow-hidden rounded-[4px]">
            <img
              src={coverImage}
              alt={`Day ${track.dayIndex + 1}`}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>

          <div className="py-2 flex w-full items-center justify-start gap-1 text-[16px] font-bold tracking-[-0.64px] text-black">
            <p>December {track.dayIndex + 1}</p>
          </div>

          <div className="py-2 flex items-start gap-3">
            <div className="flex min-w-0 flex-col">
              <h3 className="text-[32px] font-bold leading-[32px] tracking-[-1.28px] text-black line-clamp-2">
                {trackName || 'Track Title'}
              </h3>
              <p className="text-[16px] font-medium tracking-[-0.64px] text-black truncate">
                by {artistName}
              </p>
            </div>
          </div>

          <p className="py-2 text-[16px] leading-normal tracking-[-0.64px] text-black">
            {description}
          </p>

          <p className="text-[16px] font-bold text-right tracking-[-0.64px] text-black">
            Submitted by: {creditedTo}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
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
