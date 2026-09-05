'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { Volume2, VolumeX } from 'lucide-react';
import { DiscoBall, Peace } from './advent/VariantSwitch';
import type { TrackVariant } from './advent/types';
import { cn } from '@/lib/utils';
import pool from './peek-pool.json';

// react-player v2 renders nothing on the server and mounts its player on the
// client, so server-rendering it fails hydration. Same treatment as the
// Calendar's own Player.
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

/** One Day of some past Calendar, as `scripts/build-peek-pool.mjs` bakes it. */
type PeekDay = {
  by: string;
  light: { url: string; cover: string };
  heavy: { url: string; cover: string };
};

const CELLS = 25;

/**
 * The last three Days are sealed, always, whatever today's date is. The grid is
 * a stage set rather than a calendar: "three still to come" is the only framing
 * that tells the story in July as well as in December, and a visitor's own
 * Calendar is where the real dates live.
 */
const SEALED_FROM = 22;

/** Twenty-five Days drawn at random, cycling if the pool is smaller than that. */
function deal(days: PeekDay[]): PeekDay[] {
  if (days.length === 0) return [];
  const shuffled = [...days];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return Array.from({ length: CELLS }, (_, i) => shuffled[i % shuffled.length]);
}

/**
 * The deal, held outside React.
 *
 * The page is static: one prerendered HTML file serves every visitor, so a
 * shuffle done while rendering would freeze a single arrangement into the
 * build. The Days are therefore a value that legitimately differs between
 * server and client — which is what `useSyncExternalStore` is for. The server
 * snapshot is empty, the client snapshot is dealt once and then stable, and
 * nothing re-renders in a cascade the way a `setState` in an effect would.
 */
const NO_DAYS: PeekDay[] = [];
let dealt: PeekDay[] | null = null;
const neverChanges = () => () => {};

function useDealtDays() {
  return useSyncExternalStore(
    neverChanges,
    () => (dealt ??= deal(pool as PeekDay[])),
    () => NO_DAYS,
  );
}

/**
 * The peek grid: twenty-five covers from Calendars that have finished, blurred
 * until one of them is playing.
 *
 * One instance serves both layouts. Rendering it twice behind breakpoint
 * classes would mount two players, and `display: none` does not stop audio.
 */
export function PeekGrid({
  variant,
  onVariantChange,
}: {
  variant: TrackVariant;
  onVariantChange: (variant: TrackVariant) => void;
}) {
  const days = useDealtDays();
  const [playing, setPlaying] = useState(0);
  const [muted, setMuted] = useState(true);

  // Playback runs on past the end of a track by itself, so the grid keeps going
  // while the visitor reads the rest of the page. Sealed Days sit out.
  const next = useCallback(() => setPlaying((n) => (n + 1) % SEALED_FROM), []);

  const track = days[playing]?.[variant];

  return (
    <div className="grid w-[300px] -rotate-[3.5deg] grid-cols-7 gap-[5px] pt-7 drop-shadow-[0_8px_20px_rgba(0,0,0,.22)] lg:w-[701px] lg:pt-[34px] lg:drop-shadow-[0_10px_24px_rgba(0,0,0,.22)]">
      <div className="col-span-2 flex items-center justify-center">
        <VariantPill variant={variant} onChange={onVariantChange} />
      </div>

      {Array.from({ length: CELLS }, (_, i) => (
        <Cell
          key={i}
          n={i + 1}
          day={days[i]}
          variant={variant}
          sealed={i >= SEALED_FROM}
          playing={i === playing}
          onPlay={() => setPlaying(i)}
        />
      ))}

      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? 'Unmute' : 'Mute'}
        className={cn(
          'flex aspect-square cursor-pointer items-center justify-center border-0 bg-transparent p-0 transition-colors',
          variant === 'light'
            ? 'text-zinc-900/55 hover:text-zinc-900'
            : 'text-zinc-50/70 hover:text-white',
        )}
      >
        {muted ? (
          <VolumeX className="size-[15px] lg:size-[26px]" />
        ) : (
          <Volume2 className="size-[15px] lg:size-[26px]" />
        )}
      </button>

      {/*
        Muted, because no browser starts audible playback without a gesture: an
        unmuted autoplay would leave the first card claiming to play while
        nothing happened. The sound control is the gesture that turns it on.
      */}
      {track && (
        <div className="hidden">
          <ReactPlayer url={track.url} playing muted={muted} onEnded={next} width="0" height="0" />
        </div>
      )}
    </div>
  );
}

function Cell({
  n,
  day,
  variant,
  sealed,
  playing,
  onPlay,
}: {
  n: number;
  day: PeekDay | undefined;
  variant: TrackVariant;
  sealed: boolean;
  playing: boolean;
  onPlay: () => void;
}) {
  return (
    <div
      onClick={sealed ? undefined : onPlay}
      className={cn(
        'relative aspect-square transition-transform duration-200',
        sealed ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-[1.06]',
        playing && 'z-[3]',
      )}
    >
      <span
        className={cn(
          'absolute inset-0 overflow-hidden rounded-[3px] lg:rounded-[4px]',
          // The ring follows the Variant: a zinc-900 outline is invisible
          // against the heavy background.
          playing &&
            cn(
              'outline-[1.5px] outline-offset-[-1.5px]',
              variant === 'light' ? 'outline-zinc-900' : 'outline-zinc-100',
            ),
        )}
        style={
          sealed ? { background: 'linear-gradient(150deg,#a1a1aa,#71717a 55%,#52525b)' } : undefined
        }
      >
        {/*
          The art is inset past the edges so the blur has something to smear
          into — blurring flush to the border fades the cover's own corners out.
          Only the playing cover is sharp; hovering lifts the card without
          giving its artwork away.
        */}
        {!sealed && day && (
          <span
            className="absolute -inset-2 bg-zinc-300 bg-cover bg-center bg-no-repeat transition-[filter] duration-[250ms]"
            style={{
              backgroundImage: `url(${day[variant].cover})`,
              filter: playing ? 'none' : 'blur(3px) saturate(.7)',
            }}
          />
        )}
      </span>

      <span
        className={cn(
          'absolute right-[3px] bottom-[1px] z-[1] text-[11px] font-bold text-zinc-100 [text-shadow:1px_1px_0_rgb(0,0,0)] lg:right-[5px] lg:bottom-[2px] lg:text-[15px]',
          sealed && 'opacity-75',
        )}
      >
        {n}
      </span>

      {playing && day && (
        <>
          <span className="absolute bottom-[calc(100%+4px)] left-1/2 z-[4] size-[7px] origin-[50%_120%] animate-tip-pop rounded-[1px] bg-zinc-900 lg:bottom-[calc(100%+6.5px)] lg:size-[9px]" />
          <span className="absolute bottom-[calc(100%+7px)] left-1/2 z-[4] flex origin-[50%_120%] animate-tip-pop flex-col items-center gap-px rounded-lg bg-zinc-900 px-[9px] py-[5px] whitespace-nowrap text-zinc-50 shadow-[0_10px_26px_rgba(0,0,0,.38)] lg:bottom-[calc(100%+10px)] lg:px-[13px] lg:py-[7px]">
            <span className="font-mono text-[7px] tracking-[.14em] text-white/55 uppercase lg:text-[8.5px]">
              now playing
            </span>
            <span className="text-[11px] leading-[1.15] font-medium lg:text-sm">{day.by}</span>
          </span>
        </>
      )}
    </div>
  );
}

/**
 * The Calendar's own switch, shrunk into a grid cell. It carries the two
 * backgrounds the way the Calendar's does — the pill wears the Variant you are
 * not in, so the control shows what you would be switching to.
 */
function VariantPill({
  variant,
  onChange,
}: {
  variant: TrackVariant;
  onChange: (variant: TrackVariant) => void;
}) {
  const backdrop = (image: string) => ({
    backgroundImage: `url(${image})`,
    backgroundSize: '100vw 100vh',
    backgroundPosition: 'top',
  });

  const half = (which: TrackVariant) =>
    cn(
      'flex cursor-pointer items-center justify-center rounded-full border-0 px-2 py-[3px] transition-colors lg:px-[26px] lg:py-[7px]',
      which === variant
        ? which === 'light'
          ? 'text-zinc-900'
          : 'text-zinc-50'
        : variant === 'light'
          ? 'text-zinc-300'
          : 'text-zinc-500',
    );

  return (
    <div
      className="flex items-center gap-[2px] rounded-full p-px shadow-[0_2px_10px_rgba(0,0,0,.22)] lg:gap-1"
      style={backdrop(variant === 'light' ? '/dark.webp' : '/light.webp')}
    >
      <button
        type="button"
        onClick={() => onChange('light')}
        aria-label="soothe your mind"
        className={half('light')}
        style={variant === 'light' ? backdrop('/light.webp') : undefined}
      >
        <Peace className="size-[14px] lg:size-[30px]" />
      </button>
      <button
        type="button"
        onClick={() => onChange('heavy')}
        aria-label="get schwifty"
        className={half('heavy')}
        style={variant === 'heavy' ? backdrop('/dark.webp') : undefined}
      >
        <DiscoBall className="size-[14px] lg:size-[30px]" />
      </button>
    </div>
  );
}
