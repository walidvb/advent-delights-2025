/* eslint-disable @next/next/no-img-element */
'use client';

import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { MediaEngine, type MediaEngineHandle, type Progress } from '@cucu/media/react';
import { Day, TrackVariant } from './types';
import { useAdventDay } from './AdventDayContext';
import { refreshStreamAction } from './actions';
import { cn } from '@/lib/utils';

interface PlayerProps {
  day: Day | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

/** The Day and Variant actually playing, which a Variant switch mid-track doesn't change. */
interface LockedPlayback {
  dayIndex: number;
  variant: TrackVariant;
}

export function Player({
  day,
  isPlaying,
  onPlayPause,
  onNext,
  onPrevious,
}: PlayerProps) {
  const { slug, variant, shuffleEnabled, setShuffleEnabled } = useAdventDay();
  const engineRef = useRef<MediaEngineHandle>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [lockedPlayback, setLockedPlayback] = useState<LockedPlayback | null>(
    null
  );
  const [isBuffering, setIsBuffering] = useState(false);

  const hasCurrentVariant = !!day?.tracks[variant];

  // A new Day starts on whichever Variant is showing; while paused, the Track
  // follows the switch. While playing, it doesn't: the switch changes the
  // Calendar, not the song. Adjusted while rendering, not in an effect, so the
  // wrong Track never gets a frame.
  if (day && hasCurrentVariant) {
    const newDay = !lockedPlayback || lockedPlayback.dayIndex !== day.dayIndex;
    if (newDay || (!isPlaying && lockedPlayback.variant !== variant)) {
      setLockedPlayback({ dayIndex: day.dayIndex, variant });
    }
  }

  const displayVariant =
    isPlaying && lockedPlayback && day?.dayIndex === lockedPlayback.dayIndex
      ? lockedPlayback.variant
      : variant;

  const nowPlaying = day?.tracks[displayVariant];
  const { coverImage, buyLink, artistName, trackName } = nowPlaying ?? {};

  // Every Day has failed in a row: stop rather than skip round the Calendar forever.
  const failures = useRef(0);
  const handleError = () => {
    failures.current += 1;
    if (failures.current >= 25) {
      failures.current = 0;
      if (isPlaying) onPlayPause();
    } else {
      onNext();
    }
  };

  const handleProgress = (state: Progress) => {
    failures.current = 0;
    if (seeking) return;
    setProgress(state.played);
    setDuration(state.duration);
  };

  // A stored Bandcamp stream lasts weeks, not forever: ask for a fresh one.
  const refreshStream = day
    ? () => refreshStreamAction(slug, day.dayIndex + 1, displayVariant)
    : undefined;

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSeeking(true);
    setProgress(parseFloat(e.target.value) / 100);
  };

  // Pointer events, so a scrub on a phone lands too.
  const commitSeek = (
    e: React.PointerEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>
  ) => {
    // e.g. the keyup of the Tab that focused the scrubber
    if (!seeking) return;
    setSeeking(false);
    engineRef.current?.seekTo(parseFloat(e.currentTarget.value) / 100);
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
      <MediaEngine
        ref={engineRef}
        media={nowPlaying?.media ?? null}
        playing={isPlaying}
        onProgress={handleProgress}
        onEnded={onNext}
        onBuffering={setIsBuffering}
        onError={handleError}
        refreshStream={refreshStream}
      />
      <div className="mx-auto flex justify-between flex-wrap max-w-4xl items-center gap-4 px-6 py-3">
        {day ? (
          <>
            <div className="flex items-center gap-3 -0">
              <div className="relative h-15 w-15 overflow-hidden rounded">
                {coverImage && (
                  <img
                    src={coverImage}
                    alt={`Day ${day.dayIndex + 1}`}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {trackName || 'Track Title'}
                </p>
                <p className="truncate text-xs text-zinc-500">
                  {artistName || day.creditedTo}
                </p>
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
                      className="h-4 w-4"
                    />
                    Get track
                  </a>
                )}
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
              <div className="relative flex items-center gap-4">
                <button
                  onClick={onPrevious}
                  className="text-zinc-600 transition-colors hover:text-zinc-900"
                >
                  <PreviousIcon className="h-7 w-7 md:h-7 md:w-7" />
                </button>
                <button
                  onClick={onPlayPause}
                  className="text-zinc-900 transition-colors hover:text-zinc-600"
                >
                  {isPlaying && isBuffering ? (
                    <LoaderIcon className="h-8 w-8 md:h-10 md:w-10 animate-spin" />
                  ) : isPlaying ? (
                    <PauseIcon className="h-8 w-8 md:h-10 md:w-10" />
                  ) : (
                    <PlayIcon className="h-8 w-8 md:h-10 md:w-10" />
                  )}
                </button>
                <button
                  onClick={onNext}
                  className="text-zinc-600 transition-colors hover:text-zinc-900"
                >
                  <NextIcon className="h-7 w-7 md:h-7 md:w-7" />
                </button>
                <button
                  onClick={() => setShuffleEnabled(!shuffleEnabled)}
                  className={cn(
                    'absolute right-0 translate-x-full pl-2 transition-colors cursor-pointer',
                    shuffleEnabled ? 'text-zinc-900' : 'text-zinc-400'
                  )}
                  title={shuffleEnabled ? 'Disable shuffle' : 'Enable shuffle'}
                >
                  <ShuffleIcon className="h-5 w-5" />
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
                  value={progress * 100}
                  onChange={handleSeekChange}
                  onPointerDown={() => setSeeking(true)}
                  onPointerUp={commitSeek}
                  onPointerCancel={() => setSeeking(false)}
                  onKeyUp={commitSeek}
                  className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-200 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-900"
                />
                <span className="text-xs text-zinc-500">
                  {formatTime(duration)}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1" />
        )}

        {day && (
          <div>
            <span className="text-zinc-500 text-sm">Curated by:</span> <br />{' '}
            {day.contributorLink ? (
              <a
                href={day.contributorLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 hover:text-teal-700 hover:underline"
              >
                {day.creditedTo}
              </a>
            ) : (
              day.creditedTo
            )}
          </div>
        )}
        <p
          className={cn(
            'text-sm text-zinc-500 shrink-0',
            'text-xs lg:absolute lg:right-8 lg:bottom-2',
            ' xl:absolute xl:right-8 xl:top-1/2 xl:bottom-auto xl:translate-y-[-50%]'
          )}
        >
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

function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function ShuffleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" />
      <path d="m18 2 4 4-4 4" />
      <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" />
      <path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8" />
      <path d="m18 14 4 4-4 4" />
    </svg>
  );
}
