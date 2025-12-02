'use client';

import { motion, AnimatePresence } from 'motion/react';
import { useId, useMemo, useState } from 'react';
import { useAdventDay } from './AdventDayContext';
import { Track } from './types';
import { cn } from '@/lib/utils';

interface CalendarCardProps {
  track: Track;
  isRevealed: boolean;
  isPlaying: boolean;
  onReveal: () => void;
  onPlay: () => void;
  onHover: (track: Track | null, event: React.MouseEvent | null) => void;
  onMobileSelect: () => void;
  entranceDelay: number;
}

interface MaskRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateMaskRect(day: number, variant: string): MaskRect {
  let seed = day * 123.456;
  const rand = () => {
    seed += 1;
    if (variant === 'light') {
      seed += 1;
    }
    return pseudoRandom(seed);
  };

  const maxArea = 500;
  const minDim = 10;
  const maxDim = 30;

  const width = minDim + rand() * (maxDim - minDim);
  const maxHeight = Math.min(maxDim, maxArea / width);
  const height = minDim + rand() * Math.max(0, maxHeight - minDim);

  const padding = 25;
  const maxX = 100 - width - padding;
  const maxY = 100 - height - padding;
  const x = padding + rand() * (maxX - padding);
  const y = padding + rand() * (maxY - padding);

  return { x, y, width, height };
}

export function CalendarCard({
  track,
  isRevealed,
  isPlaying,
  onReveal,
  onPlay,
  onHover,
  onMobileSelect,
  entranceDelay,
}: CalendarCardProps) {
  const { currentDayIndex, variant } = useAdventDay();
  const isInactive = track.dayIndex > currentDayIndex;
  const isToday = track.dayIndex === currentDayIndex;
  const isUnrevealed = !isInactive && !isRevealed;
  const [isHovered, setIsHovered] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const maskId = useId();

  const coverImage =
    variant === 'light' ? track.lightCoverImage : track.heavyCoverImage;

  const hasCoverImage = !!coverImage;

  const fallbackColor = useMemo(() => {
    const colors = [
      '#6366f1', // indigo
      '#8b5cf6', // violet
      '#a855f7', // purple
      '#d946ef', // fuchsia
      '#ec4899', // pink
      '#f43f5e', // rose
      '#ef4444', // red
      '#f97316', // orange
      '#f59e0b', // amber
      '#eab308', // yellow
      '#84cc16', // lime
      '#22c55e', // green
      '#10b981', // emerald
      '#14b8a6', // teal
      '#06b6d4', // cyan
      '#0ea5e9', // sky
      '#3b82f6', // blue
      '#6366f1', // indigo
      '#8b5cf6', // violet
      '#a855f7', // purple
      '#d946ef', // fuchsia
      '#ec4899', // pink
      '#f43f5e', // rose
      '#ef4444', // red
      '#f97316', // orange
    ];
    return colors[track.dayIndex % colors.length];
  }, [track.dayIndex]);

  const maskRect = useMemo(
    () => generateMaskRect(track.dayIndex + 1, variant),
    [track.dayIndex, variant]
  );

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const handleClick = () => {
    if (isInactive) return;
    if (isUnrevealed) {
      setIsRevealing(true);
      setTimeout(() => {
        onReveal();
        setIsRevealing(false);
      }, 600);
    }
    if (isMobile && isRevealed) {
      onMobileSelect();
    } else {
      onPlay();
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

  const getMaskState = ():
    | 'entrance'
    | 'initial'
    | 'revealing'
    | 'revealed' => {
    if (isRevealing) return 'revealing';
    if (isRevealed) return 'revealed';
    return 'initial';
  };

  const maskState = getMaskState();
  const shouldMask = !isRevealed;

  const aspectRatio = maskRect.width / maskRect.height;
  const centerX = maskRect.x + maskRect.width / 2;
  const centerY = maskRect.y + maskRect.height / 2;

  const phase1Width = maskRect.width * 1.5;
  const phase1Height = maskRect.height * 1.5;
  const phase1X = centerX - phase1Width / 2;
  const phase1Y = centerY - phase1Height / 2;

  const finalSize = 200;
  const finalWidth = aspectRatio >= 1 ? finalSize : finalSize * aspectRatio;
  const finalHeight = aspectRatio >= 1 ? finalSize / aspectRatio : finalSize;
  const finalX = centerX - finalWidth / 2 - 50;
  const finalY = centerY - finalHeight / 2 - 50;

  const maskVariants = {
    entrance: {
      x: centerX,
      y: centerY,
      width: 0,
      height: 0,
    },
    initial: {
      x: maskRect.x,
      y: maskRect.y,
      width: maskRect.width,
      height: maskRect.height,
    },
    revealing: {
      x: [maskRect.x, phase1X, finalX],
      y: [maskRect.y, phase1Y, finalY],
      width: [maskRect.width, phase1Width, finalWidth + 100],
      height: [maskRect.height, phase1Height, finalHeight + 100],
    },
    revealed: {
      x: finalX,
      y: finalY,
      width: finalWidth + 100,
      height: finalHeight + 100,
    },
  };

  const entranceTransition = {
    duration: 0.5,
    delay: entranceDelay,
    ease: [0.22, 1, 0.36, 1] as const,
  };

  const revealTransition = {
    duration: 0.5,
    times: [0, 0.35, 1],
    ease: 'easeInOut' as const,
  };

  return (
    <motion.div
      className={cn(
        'relative aspect-square  overflow-hidden rounded-lg bg-zinc-100',
        {
          'bg-zinc-100/25 backdrop-blur-2xl': isInactive && variant === 'light',
          'bg-zinc-900/25 backdrop-blur-2xl': isInactive && variant !== 'light',
          'cursor-pointer': !isInactive,
        }
      )}
      animate={
        isToday && isUnrevealed ? { scale: [1, 1.1, 1, 1.1, 1] } : { scale: 1 }
      }
      transition={
        isToday
          ? { duration: 0.7, repeat: Infinity, repeatDelay: 2.5 }
          : { duration: 0.2 }
      }
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileHover={!isInactive ? { scale: 1.02 } : undefined}
      whileTap={!isInactive ? { scale: 0.98 } : undefined}
    >
      {isUnrevealed && (
        <div
          className="absolute inset-0 overflow-hidden"
          style={
            hasCoverImage
              ? {
                  backgroundImage: `url(${coverImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(40px)',
                  transform: 'scale(1.1)',
                }
              : {
                  backgroundColor: fallbackColor,
                  opacity: 0.3,
                }
          }
        />
      )}

      {isInactive && (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(20px)',
          }}
        />
      )}

      <motion.div
        className="absolute inset-0"
        animate={{
          scale: isRevealing || isRevealed ? 1 : 1.1,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <mask id={maskId}>
              <rect x="0" y="0" width="100" height="100" fill="black" />
              <motion.rect
                key={variant}
                fill="white"
                initial="entrance"
                animate={maskState}
                variants={maskVariants}
                transition={
                  maskState === 'initial'
                    ? entranceTransition
                    : revealTransition
                }
              />
            </mask>
          </defs>
          {hasCoverImage ? (
            <image
              href={coverImage}
              x="0"
              y="0"
              width="100"
              height="100"
              preserveAspectRatio="xMidYMid slice"
              mask={shouldMask ? `url(#${maskId})` : undefined}
            />
          ) : (
            <rect
              x="0"
              y="0"
              width="100"
              height="100"
              fill={fallbackColor}
              mask={shouldMask ? `url(#${maskId})` : undefined}
            />
          )}
        </svg>
      </motion.div>

      <AnimatePresence>
        {isUnrevealed && isHovered && !isRevealing && (
          <motion.div
            className="absolute inset-0 flex items-start justify-center pt-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <span className="rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-zinc-700 shadow-sm">
              Reveal track
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          'absolute bottom-2 right-2 text-2xl font-bold',
          {
            'text-zinc-900': variant === 'light',
            'text-zinc-100': variant !== 'light',
          },
          'text-zinc-100'
        )}
        style={
          {
            // '--color': variant !== 'light' ? 'rgb(0,0,0)' : 'rgb(255,255,255)',
            '--color': 'rgb(0,0,0)',
            textShadow: '1px 1px 0px var(--color)',
            // '0 1px 2px var(--color), 1px 0 2px var(--color), -1px 0 2px var(--color), 0 -1px 2px var(--color)',
          } as React.CSSProperties
        }
      >
        {track.dayIndex + 1}
      </div>

      {!isInactive && isRevealed && (
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
