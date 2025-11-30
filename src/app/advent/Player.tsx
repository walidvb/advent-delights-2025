'use client';

import { useRef, useState, useCallback } from 'react';
import { Track } from './types';
import ReactPlayer from 'react-player';
import { useAdventDay } from './AdventDayContext';

interface PlayerProps {
  track: Track | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
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
  const prevTrackDay = useRef(track?.dayIndex);

  if (track?.dayIndex !== prevTrackDay.current) {
    prevTrackDay.current = track?.dayIndex;
    setProgress(0);
  }

  const trackUrl = track
    ? variant === 'light'
      ? track.lightTrackUrl
      : track.heavyTrackUrl
    : undefined;
  const coverImage = track
    ? variant === 'light'
      ? track.lightCoverImage
      : track.heavyCoverImage
    : undefined;
  const creditedTo = track
    ? variant === 'light'
      ? track.lightCreditedTo
      : track.heavyCreditedTo
    : undefined;
  const buyLink = track
    ? variant === 'light'
      ? track.lightBuyLink
      : track.heavyBuyLink
    : undefined;
  const artistName = track
    ? variant === 'light'
      ? track.lightArtistName
      : track.heavyArtistName
    : undefined;
  const trackName = track
    ? variant === 'light'
      ? track.lightTrackName
      : track.heavyTrackName
    : undefined;

  const handleProgress = useCallback(
    (state: { played: number; playedSeconds: number }) => {
      if (!seeking) {
        setProgress(state.playedSeconds);
      }
    },
    [seeking]
  );

  const handleDuration = (d: number) => {
    setDuration(d);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProgress(parseFloat(e.target.value));
  };

  const handleSeekMouseDown = () => {
    setSeeking(true);
  };

  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    setSeeking(false);
    playerRef.current?.seekTo(parseFloat((e.target as HTMLInputElement).value));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!track) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur-sm">
      <div className="hidden">
        <ReactPlayer
          ref={playerRef}
          url={trackUrl}
          playing={isPlaying}
          // @ts-expect-error - react-player types mismatch
          onProgress={handleProgress}
          onDuration={handleDuration}
          width="0"
          height="0"
        />
      </div>
      <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-3">
        <div className="flex items-center gap-3">
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

        <div className="flex flex-1 flex-col items-center gap-1">
          <div className="flex items-center gap-4">
            <button
              onClick={onPrevious}
              className="text-zinc-600 transition-colors hover:text-zinc-900"
            >
              <PreviousIcon className="h-5 w-5" />
            </button>
            <button
              onClick={onPlayPause}
              className="text-zinc-900 transition-colors hover:text-zinc-600"
            >
              {isPlaying ? (
                <PauseIcon className="h-6 w-6" />
              ) : (
                <PlayIcon className="h-6 w-6" />
              )}
            </button>
            <button
              onClick={onNext}
              className="text-zinc-600 transition-colors hover:text-zinc-900"
            >
              <NextIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="flex w-full max-w-md items-center gap-2">
            <span className="text-xs text-zinc-500">
              {formatTime(progress)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={progress}
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
            className="flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700"
          >
            <img
              src="/bandcamp-button-circle-line-green/bandcamp-button-circle-line-green-128.png"
              alt="Bandcamp"
              className="h-5 w-5"
            />
            Buy track
          </a>
        )}
      </div>
    </div>
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
