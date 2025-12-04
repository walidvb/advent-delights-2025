'use client';

import { motion, AnimatePresence } from 'motion/react';
import { useId, useMemo, useState } from 'react';
import { useAdventDay } from './AdventDayContext';
import { Track } from './types';
import { cn } from '@/lib/utils';

interface CalendarCardProps {
  track: Track;
  isRevealed: boolean;
  onReveal: () => void;
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

function generateMaskRect(day: number): MaskRect {
  let seed = day * 123.456;
  const rand = () => {
    seed += 1;
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

function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

function calculateTextLayout(text: string): {
  lines: string[];
  fontSize: number;
  lineHeight: number;
} {
  const padding = 10;
  const availableWidth = 100 - padding * 2;
  const availableHeight = 100 - padding * 2;
  const charWidthRatio = 0.55;

  const words = text.split(' ');

  for (let fontSize = 14; fontSize >= 6; fontSize -= 0.5) {
    const charsPerLine = Math.floor(
      availableWidth / (fontSize * charWidthRatio)
    );
    const lineHeight = fontSize * 1.3;
    const maxLines = Math.floor(availableHeight / lineHeight);

    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= charsPerLine) {
        currentLine = currentLine ? `${currentLine} ${word}` : word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    const totalTextHeight = lines.length * lineHeight;
    if (lines.length <= maxLines && totalTextHeight <= availableHeight) {
      return { lines, fontSize, lineHeight };
    }
  }

  const fallbackCharsPerLine = Math.floor(
    availableWidth / (6 * charWidthRatio)
  );
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    if (currentLine.length + word.length + 1 <= fallbackCharsPerLine) {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return { lines: lines.slice(0, 10), fontSize: 6, lineHeight: 7.8 };
}

export function CalendarCard({
  track,
  isRevealed,
  onReveal,
  onHover,
  onMobileSelect,
  entranceDelay,
}: CalendarCardProps) {
  const { currentDayIndex } = useAdventDay();
  const isDisabled = track.disabled;
  const isInactive = isDisabled || track.dayIndex > currentDayIndex;
  const isToday = track.dayIndex === currentDayIndex && !isDisabled;
  const isUnrevealed = !isInactive && !isRevealed;
  const [isHovered, setIsHovered] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const maskId = useId();

  const color = track.color || '#6366f1';
  const textColor = getContrastColor(color);

  const maskRect = useMemo(
    () => generateMaskRect(track.dayIndex + 1),
    [track.dayIndex]
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
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isRevealed && !isDisabled) {
      onHover(track, e);
    }
  };

  const handleMouseEnter = () => {
    if (!isDisabled) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (!isDisabled) {
      onHover(null, null);
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
        'relative aspect-square overflow-hidden rounded-lg bg-zinc-100',
        {
          'bg-zinc-100/25 backdrop-blur-2xl': isInactive,
          'cursor-pointer': !isInactive,
          'pointer-events-none': isDisabled,
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
          style={{
            backgroundColor: color,
            opacity: 0.3,
          }}
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
          <rect
            x="0"
            y="0"
            width="100"
            height="100"
            fill={color}
            mask={shouldMask ? `url(#${maskId})` : undefined}
          />
          {(() => {
            const { lines, fontSize, lineHeight } = calculateTextLayout(
              track.title
            );
            const totalHeight = lines.length * lineHeight;
            const startY = 50 - totalHeight / 2 + lineHeight / 2;
            return (
              <text
                textAnchor="middle"
                fill={textColor}
                fontSize={fontSize}
                fontWeight="bold"
                mask={shouldMask ? `url(#${maskId})` : undefined}
              >
                {lines.map((line, i) => (
                  <tspan key={i} x="50" y={startY + i * lineHeight}>
                    {line}
                  </tspan>
                ))}
              </text>
            );
          })()}
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
              Reveal
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="absolute bottom-2 right-2 text-2xl font-bold text-zinc-100"
        style={
          {
            '--color': 'rgb(0,0,0)',
            textShadow: '1px 1px 0px var(--color)',
          } as React.CSSProperties
        }
      >
        {track.dayIndex + 1}
      </div>
    </motion.div>
  );
}
