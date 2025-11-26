'use client';

import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { format } from 'date-fns';
import { Track } from './types';

interface DetailsCardProps {
  track: Track | null;
  position: { x: number; y: number };
  isPlaying: boolean;
  onPlay: () => void;
}

export function DetailsCard({ track, position, isPlaying, onPlay }: DetailsCardProps) {
  return (
    <AnimatePresence>
      {track && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.15 }}
          className="pointer-events-none fixed z-50 w-80 rounded-xl bg-white p-4 shadow-2xl"
          style={{
            left: position.x + 20,
            top: position.y - 100,
          }}
        >
          <div className="relative mb-4 aspect-square w-full overflow-hidden rounded-lg">
            <Image
              src={track.coverImage}
              alt={`Day ${track.dayIndex + 1}`}
              fill
              className="object-cover"
            />
          </div>

          <p className="mb-2 text-sm text-zinc-500">
            Track of <span className="ml-2 font-medium">{format(new Date(2025, 11, track.dayIndex + 1), 'dd.MM')}</span>
          </p>

          <div className="mb-3 flex items-center gap-3">
            <button
              onClick={onPlay}
              className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-900 transition-colors hover:bg-zinc-200"
            >
              {isPlaying ? (
                <PauseIcon className="h-5 w-5" />
              ) : (
                <PlayIcon className="h-5 w-5 ml-0.5" />
              )}
            </button>
            <div>
              {/* AITODO: Extract track title from YouTube or use a placeholder */}
              <h3 className="text-xl font-semibold">Track Title</h3>
              <p className="text-sm text-zinc-500">
                {/* AITODO: Extract album/artist info if available */}
                Album name by {track.creditedTo}
              </p>
            </div>
          </div>

          <p className="mb-4 text-sm leading-relaxed text-zinc-600">{track.description}</p>

          <div className="flex items-center justify-between">
            {track.buyLink && (
              <a
                href={track.buyLink}
                target="_blank"
                rel="noopener noreferrer"
                className="pointer-events-auto flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700"
              >
                <span className="h-4 w-4 rounded bg-teal-500" />
                Buy track
              </a>
            )}
            <p className="text-sm text-zinc-500">
              Chosen by: <span className="font-medium">{track.creditedTo}</span>
            </p>
          </div>
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
