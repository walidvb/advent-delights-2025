'use client';

import { createContext, useContext, useMemo, useState, type ReactNode, useCallback } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useLocalStorage } from 'react-use';
import { TrackVariant } from './types';

interface AdventDayContextValue {
  currentDayIndex: number;
  setCurrentDayIndex: (index: number) => void;
  resetDayIndex: () => void;
  variant: TrackVariant;
  setVariant: (variant: TrackVariant) => void;
  revealedIndices: number[];
  addRevealedIndex: (index: number) => void;
  resetRevealedIndices: () => void;
}

const AdventDayContext = createContext<AdventDayContextValue | undefined>(
  undefined
);

const clampDayIndex = (index: number) =>
  Math.min(24, Math.max(0, Math.round(index)));
const getDefaultDayIndex = () => clampDayIndex(new Date().getDate() - 1);

interface AdventDayProviderProps {
  children: ReactNode;
}

export function AdventDayProvider({ children }: AdventDayProviderProps) {
  const [currentDayIndex, setCurrentDayIndexState] = useState<number>(0);
  const [variant, setVariant] = useState<TrackVariant>('light');
  const [revealedIndicesMap, setRevealedIndicesMap] = useLocalStorage<
    Record<TrackVariant, number[]>
  >('advent-revealed-map', {
    light: [],
    heavy: [],
  });

  // Ensure map structure exists (for backward compatibility or first run)
  const normalizedMap = useMemo(() => {
    return {
      light: Array.isArray(revealedIndicesMap?.light)
        ? revealedIndicesMap.light
        : [],
      heavy: Array.isArray(revealedIndicesMap?.heavy)
        ? revealedIndicesMap.heavy
        : [],
    };
  }, [revealedIndicesMap]);

  const revealedIndices = normalizedMap[variant];

  const setCurrentDayIndex = (index: number) => {
    setCurrentDayIndexState(clampDayIndex(index));
  };

  const resetDayIndex = () => {
    setCurrentDayIndexState(getDefaultDayIndex());
  };

  const addRevealedIndex = useCallback(
    (index: number) => {
      if (!revealedIndices.includes(index)) {
        setRevealedIndicesMap({
          ...normalizedMap,
          [variant]: [...revealedIndices, index],
        });
      }
    },
    [normalizedMap, revealedIndices, variant, setRevealedIndicesMap]
  );

  const resetRevealedIndices = useCallback(() => {
    setRevealedIndicesMap({
      ...normalizedMap,
      [variant]: [],
    });
  }, [normalizedMap, variant, setRevealedIndicesMap]);

  const value = useMemo(
    () => ({
      currentDayIndex,
      setCurrentDayIndex,
      resetDayIndex,
      variant,
      setVariant,
      revealedIndices,
      addRevealedIndex,
      resetRevealedIndices,
    }),
    [
      currentDayIndex,
      variant,
      revealedIndices,
      addRevealedIndex,
      resetRevealedIndices,
    ]
  );

  return (
    <AdventDayContext.Provider value={value}>
      {children}
      {/* <DevDayWidget /> */}
    </AdventDayContext.Provider>
  );
}

export function useAdventDay() {
  const context = useContext(AdventDayContext);
  if (!context) {
    throw new Error('useAdventDay must be used within AdventDayProvider');
  }
  return context;
}

function DevDayWidget() {
  const { currentDayIndex, setCurrentDayIndex, resetRevealedIndices } = useAdventDay();

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex items-center gap-4 rounded-full border border-zinc-200 bg-white/95 px-6 py-3 text-sm shadow-xl backdrop-blur-sm">
        <div className="flex flex-col gap-1">
          <span className="font-medium text-zinc-500 uppercase tracking-wider text-xs">Dev Mode</span>
          <button
            onClick={resetRevealedIndices}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset revealed
          </button>
        </div>

        <div className="h-8 w-px bg-zinc-200" />

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentDayIndex(currentDayIndex - 1)}
            disabled={currentDayIndex <= 0}
            className="flex h-12 w-12 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>

          <span className="w-8 text-center text-2xl font-bold text-zinc-900 tabular-nums">
            {currentDayIndex + 1}
          </span>

          <button
            onClick={() => setCurrentDayIndex(currentDayIndex + 1)}
            disabled={currentDayIndex >= 24}
            className="flex h-12 w-12 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next day"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        </div>
      </div>
    </div>
  );
}
