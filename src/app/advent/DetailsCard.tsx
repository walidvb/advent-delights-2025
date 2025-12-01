'use client';

import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { Track } from './types';
import { useAdventDay } from './AdventDayContext';

interface DetailsCardProps {
  track: Track | null;
  position: { x: number; y: number };
  isPlaying: boolean;
  onPlay: () => void;
  mobileTrack: Track | null;
  onCloseMobile: () => void;
  onMobilePlay: () => void;
  isMobilePlaying: boolean;
}

export function DetailsCard({
  track,
  position,
  isPlaying,
  onPlay,
  mobileTrack,
  onCloseMobile,
  onMobilePlay,
  isMobilePlaying,
}: DetailsCardProps) {
  const { variant } = useAdventDay();

  const getTrackDetails = (t: Track) => ({
    coverImage: variant === 'light' ? t.lightCoverImage : t.heavyCoverImage,
    creditedTo: variant === 'light' ? t.lightCreditedTo : t.heavyCreditedTo,
    description: variant === 'light' ? t.lightDescription : t.heavyDescription,
    artistName: variant === 'light' ? t.lightArtistName : t.heavyArtistName,
    trackName: variant === 'light' ? t.lightTrackName : t.heavyTrackName,
  });

  return (
    <>
      {/* Desktop hover card */}
      <AnimatePresence>
        {track && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none fixed z-100 w-80 rounded-[12px] p-[20px] backdrop-blur-[25px] backdrop-filter bg-[rgba(251,251,251,0.7)] shadow-[-1px_-1px_8px_0px_rgba(255,255,255,0.7),1px_1px_8px_0px_rgba(54,60,83,0.25)] hidden md:block"
            style={{
              left: position.x + 20,
              top: position.y - 100,
            }}
          >
            <CardContent
              {...getTrackDetails(track)}
              dayIndex={track.dayIndex}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile fullscreen card */}
      <AnimatePresence>
        {mobileTrack && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-30 overflow-y-auto bg-[rgba(251,251,251,0.95)] backdrop-blur-[25px] md:hidden"
          >
            <button
              onClick={onCloseMobile}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/10 text-black"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="p-6 pb-32">
              <CardContent
                {...getTrackDetails(mobileTrack)}
                dayIndex={mobileTrack.dayIndex}
              />
              <button
                onClick={onMobilePlay}
                className="mt-6 w-full flex items-center justify-center gap-2 rounded-full bg-zinc-900 py-3 text-white font-medium"
              >
                {isMobilePlaying ? (
                  <>
                    <PauseIcon className="h-5 w-5" />
                    Pause
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-5 w-5" />
                    Play
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function CardContent({
  coverImage,
  creditedTo,
  description,
  artistName,
  trackName,
  dayIndex,
}: {
  coverImage: string;
  creditedTo: string;
  description: string;
  artistName: string;
  trackName: string;
  dayIndex: number;
}) {
  return (
    <>
      <div className="relative mb-2 aspect-square w-full overflow-hidden rounded-[4px]">
        <img
          src={coverImage}
          alt={`Day ${dayIndex + 1}`}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      <div className="py-2 flex w-full items-center justify-start gap-1 text-[16px] font-bold tracking-[-0.64px] text-black">
        <p>December {dayIndex + 1}</p>
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
    </>
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
