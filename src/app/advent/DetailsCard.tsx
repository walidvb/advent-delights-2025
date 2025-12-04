'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { Track } from './types';

interface DetailsCardProps {
  track: Track | null;
  position: { x: number; y: number };
  mobileTrack: Track | null;
  onCloseMobile: () => void;
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

export function DetailsCard({
  track,
  position,
  mobileTrack,
  onCloseMobile,
}: DetailsCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardPosition, setCardPosition] = useState({ left: 0, top: 0 });

  useLayoutEffect(() => {
    if (!track || typeof window === 'undefined') return;

    const padding = 16;
    const cardWidth = cardRef.current?.offsetWidth ?? 320;
    const cardHeight = cardRef.current?.offsetHeight ?? 500;

    let left = position.x + 20;
    let top = position.y - 100;

    if (left + cardWidth > window.innerWidth - padding) {
      left = position.x - cardWidth - 20;
    }
    if (left < padding) {
      left = padding;
    }

    if (top + cardHeight > window.innerHeight - padding) {
      top = window.innerHeight - cardHeight - padding;
    }
    if (top < padding) {
      top = padding;
    }

    setCardPosition({ left, top });
  }, [position.x, position.y, track]);

  return (
    <>
      {/* Desktop hover card */}
      <AnimatePresence>
        {track && (
          <motion.div
            ref={cardRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none fixed z-100 w-80 max-h-[calc(100vh-32px)] overflow-y-auto rounded-[12px] p-[20px] backdrop-blur-[25px] backdrop-filter bg-[rgba(251,251,251,0.7)] shadow-[-1px_-1px_8px_0px_rgba(255,255,255,0.7),1px_1px_8px_0px_rgba(54,60,83,0.25)] hidden md:block"
            style={cardPosition}
          >
            <CardContent track={track} />
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
              <CardContent track={mobileTrack} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function CardContent({ track }: { track: Track }) {
  const color = track.color || '#6366f1';
  const textColor = getContrastColor(color);
  const { lines, fontSize, lineHeight } = calculateTextLayout(track.title);
  const totalHeight = lines.length * lineHeight;
  const startY = 50 - totalHeight / 2 + lineHeight / 2;

  return (
    <>
      <div className="relative mb-2 aspect-square w-full overflow-hidden rounded-[4px] md:hidden">
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid slice"
        >
          <rect x="0" y="0" width="100" height="100" fill={color} />
          <text
            textAnchor="middle"
            fill={textColor}
            fontSize={fontSize}
            fontWeight="bold"
          >
            {lines.map((line, i) => (
              <tspan key={i} x="50" y={startY + i * lineHeight}>
                {line}
              </tspan>
            ))}
          </text>
        </svg>
      </div>

      <div className="py-2 flex w-full items-center justify-start gap-1 text-[16px] font-bold tracking-[-0.64px] text-black">
        <p>December {track.dayIndex + 1}</p>
      </div>

      <div className="py-2 flex items-start gap-3">
        <div className="flex min-w-0 flex-col">
          <h3 className="text-[32px] font-bold leading-[32px] tracking-[-1.28px] text-black line-clamp-2">
            {track.title || 'Title'}
          </h3>
          <p className="text-[16px] font-medium tracking-[-0.64px] text-black truncate">
            by {track.author}
          </p>
        </div>
      </div>

      <p className="py-2 text-[16px] leading-normal tracking-[-0.64px] text-black">
        {track.description}
      </p>
    </>
  );
}
