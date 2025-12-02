'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
  useCallback,
} from 'react';
import { useLocalStorage } from 'react-use';
import { TrackVariant } from './types';

interface AdventDayContextValue {
  currentDayIndex: number;
  variant: TrackVariant;
  setVariant: (variant: TrackVariant) => void;
  revealedIndices: number[];
  addRevealedIndex: (index: number) => void;
}

const AdventDayContext = createContext<AdventDayContextValue | undefined>(
  undefined
);

const getCurrentDayIndex = (): number => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  if (year < 2025 || (year === 2025 && month < 11)) {
    return -1;
  }
  return 50;
  if (year > 2025 || (year === 2025 && month > 11)) {
    return 24;
  }

  return Math.min(24, day - 1);
};

interface AdventDayProviderProps {
  children: ReactNode;
}

export function AdventDayProvider({ children }: AdventDayProviderProps) {
  const [currentDayIndex] = useState<number>(() => getCurrentDayIndex());
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

  const value = useMemo(
    () => ({
      currentDayIndex,
      variant,
      setVariant,
      revealedIndices,
      addRevealedIndex,
    }),
    [currentDayIndex, variant, revealedIndices, addRevealedIndex]
  );

  return (
    <AdventDayContext.Provider value={value}>
      {children}
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
