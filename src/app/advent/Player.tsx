/* eslint-disable @next/next/no-img-element */
'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'motion/react';
import { Track, TrackVariant } from './types';
import ReactPlayer from 'react-player';
import { useAdventDay } from './AdventDayContext';

interface PlayerProps {
  track: Track | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

interface LockedPlayback {
  dayIndex: number;
  variant: TrackVariant;
  url: string;
}

export function Player({
  track,
  isPlaying,
  onPlayPause,
  onNext,
  onPrevious,
}: PlayerProps) {
  const { variant } = useAdventDay();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [lockedPlayback, setLockedPlayback] = useState<LockedPlayback | null>(
    null
  );

  const currentVariantUrl = track
    ? variant === 'light'
      ? track.lightTrackUrl
      : track.heavyTrackUrl
    : undefined;

  useEffect(() => {
    if (track && currentVariantUrl) {
      const shouldLock =
        !lockedPlayback || lockedPlayback.dayIndex !== track.dayIndex;
      if (shouldLock) {
        setLockedPlayback({
          dayIndex: track.dayIndex,
          variant,
          url: currentVariantUrl,
        });
      }
    }
  }, [track, currentVariantUrl, variant, lockedPlayback]);

  useEffect(() => {
    if (!isPlaying && lockedPlayback && currentVariantUrl) {
      if (
        lockedPlayback.variant !== variant ||
        lockedPlayback.url !== currentVariantUrl
      ) {
        setLockedPlayback({
          dayIndex: lockedPlayback.dayIndex,
          variant,
          url: currentVariantUrl,
        });
      }
    }
  }, [isPlaying, variant, currentVariantUrl, lockedPlayback]);

  const trackUrl =
    isPlaying && lockedPlayback && track?.dayIndex === lockedPlayback.dayIndex
      ? lockedPlayback.url
      : currentVariantUrl;

  const displayVariant =
    isPlaying && lockedPlayback && track?.dayIndex === lockedPlayback.dayIndex
      ? lockedPlayback.variant
      : variant;

  const coverImage = track
    ? displayVariant === 'light'
      ? track.lightCoverImage
      : track.heavyCoverImage
    : undefined;
  const creditedTo = track
    ? displayVariant === 'light'
      ? track.lightCreditedTo
      : track.heavyCreditedTo
    : undefined;
  const buyLink = track
    ? displayVariant === 'light'
      ? track.lightBuyLink
      : track.heavyBuyLink
    : undefined;
  const artistName = track
    ? displayVariant === 'light'
      ? track.lightArtistName
      : track.heavyArtistName
    : undefined;
  const trackName = track
    ? displayVariant === 'light'
      ? track.lightTrackName
      : track.heavyTrackName
    : undefined;

  const handleEnded = useCallback(() => {
    onNext();
  }, [onNext]);

  const handleProgress = useCallback(() => {
    if (!seeking) {
      setDuration(playerRef.current?.duration);
    }
  }, [seeking]);

  const handleTimeUpdate = () => {
    setProgress(playerRef.current?.currentTime / playerRef.current?.duration);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProgress(parseFloat(e.target.value) / 100);
  };

  const handleSeekMouseDown = () => {
    setSeeking(true);
  };

  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    setSeeking(false);
    if (!playerRef.current) return;
    playerRef.current.currentTime =
      (parseFloat((e.target as HTMLInputElement).value) / 100) *
      playerRef.current.duration;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-20 border-t border-zinc-200 bg-white/95 backdrop-blur-sm"
    >
      <div className="hidden">
        {' '}
        <ReactPlayer
          ref={playerRef}
          src={trackUrl}
          playing={isPlaying}
          onProgress={handleProgress}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          width="1000"
          height="1000"
        />
      </div>
      <div className="mx-auto flex justify-between flex-wrap max-w-4xl items-center gap-4 px-6 py-3">
        {track ? (
          <>
            <div className="flex items-center gap-3 -0">
              <div className="relative h-12 w-12 overflow-hidden rounded">
                {coverImage && (
                  <img
                    src={coverImage}
                    alt={`Day ${track.dayIndex + 1}`}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {trackName || 'Track Title'}
                </p>
                <p className="truncate text-xs text-zinc-500">
                  {artistName || creditedTo}
                </p>
              </div>
            </div>
            {buyLink && (
              <a
                href={buyLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex md:hidden items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700 -0"
              >
                <img
                  src="/bandcamp-button-circle-line-green/bandcamp-button-circle-line-green-128.png"
                  alt="Bandcamp"
                  className="h-5 w-5"
                />
                Buy track
              </a>
            )}

            <div className="flex flex-1 flex-col items-center gap-3 w-ful">
              <div className="flex items-center gap-4">
                <button
                  onClick={onPrevious}
                  className="text-zinc-600 transition-colors hover:text-zinc-900"
                >
                  <PreviousIcon className="h-7 w-7 md:h-5 md:w-5" />
                </button>
                <button
                  onClick={onPlayPause}
                  className="text-zinc-900 transition-colors hover:text-zinc-600"
                >
                  {isPlaying ? (
                    <PauseIcon className="h-8 w-8 md:h-6 md:w-6" />
                  ) : (
                    <PlayIcon className="h-8 w-8 md:h-6 md:w-6" />
                  )}
                </button>
                <button
                  onClick={onNext}
                  className="text-zinc-600 transition-colors hover:text-zinc-900"
                >
                  <NextIcon className="h-7 w-7 md:h-5 md:w-5" />
                </button>
              </div>

              <div className="flex w-full max-w-md items-center gap-2">
                <span className="text-xs text-zinc-500">
                  {formatTime(Math.ceil(progress * duration))}
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={seeking ? undefined : progress * 100}
                  onChange={handleSeekChange}
                  onMouseDown={handleSeekMouseDown}
                  onMouseUp={handleSeekMouseUp}
                  className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-200 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-900"
                />
                <span className="text-xs text-zinc-500">
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            {buyLink && (
              <a
                href={buyLink}
                target="_blank"
                rel="noopener noreferrer"
                className="items-center hidden md:flex gap-2 text-sm font-medium text-teal-600 hover:text-teal-700 -0"
              >
                <img
                  src="/bandcamp-button-circle-line-green/bandcamp-button-circle-line-green-128.png"
                  alt="Bandcamp"
                  className="h-5 w-5"
                />
                Buy track
              </a>
            )}
          </>
        ) : (
          <div className="flex-1" />
        )}

        <p className="text-sm text-zinc-500 shrink-0 md:absolute md:right-8 md:top-1/2 md:translate-y-[-50%]">
          Made in 2025, with <span className="text-red-500">🩶</span> by
          <a
            href="https://https://alinema-vanboetzelaer.framer.website"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 hover:text-teal-700 hover:underline"
          >
            {' '}
            Aline
          </a>{' '}
          &{' '}
          <a
            href="https://walidvb.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 hover:text-teal-700 hover:underline"
          >
            {' '}
            Walid
          </a>
        </p>
      </div>
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

function PreviousIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
    </svg>
  );
}

function NextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
    </svg>
  );
}
