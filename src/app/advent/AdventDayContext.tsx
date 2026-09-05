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
import { revealedDayCount } from './reveal';
import { CalendarIdentity, TrackVariant } from './types';

interface AdventDayContextValue {
  currentDayIndex: number;
  variant: TrackVariant;
  setVariant: (variant: TrackVariant) => void;
  openedIndices: number[];
  addOpenedIndex: (index: number) => void;
  shuffleEnabled: boolean;
  setShuffleEnabled: (enabled: boolean) => void;
}

const AdventDayContext = createContext<AdventDayContextValue | undefined>(
  undefined
);

interface AdventDayProviderProps {
  calendar: CalendarIdentity;
  children: ReactNode;
}

export function AdventDayProvider({
  calendar,
  children,
}: AdventDayProviderProps) {
  // The clock is read here, once, and never inside the reveal rules. Days are
  // numbered 1-25 there and 0-based here, hence the -1: -1 means nothing has
  // revealed yet.
  const [currentDayIndex] = useState<number>(
    () => revealedDayCount(calendar.year, new Date()) - 1
  );
  const [variant, setVariant] = useState<TrackVariant>('light');
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  // Keyed by Slug so that following two Calendars keeps two sets of progress.
  const [openedIndicesMap, setOpenedIndicesMap] = useLocalStorage<
    Record<TrackVariant, number[]>
  >(`advent-opened:${calendar.slug}`, {
    light: [],
    heavy: [],
  });

  // Ensure map structure exists (for backward compatibility or first run)
  const normalizedMap = useMemo(() => {
    return {
      light: Array.isArray(openedIndicesMap?.light)
        ? openedIndicesMap.light
        : [],
      heavy: Array.isArray(openedIndicesMap?.heavy)
        ? openedIndicesMap.heavy
        : [],
    };
  }, [openedIndicesMap]);

  const openedIndices = normalizedMap[variant];

  const addOpenedIndex = useCallback(
    (index: number) => {
      if (!openedIndices.includes(index)) {
        setOpenedIndicesMap({
          ...normalizedMap,
          [variant]: [...openedIndices, index],
        });
      }
    },
    [normalizedMap, openedIndices, variant, setOpenedIndicesMap]
  );

  const value = useMemo(
    () => ({
      currentDayIndex,
      variant,
      setVariant,
      openedIndices,
      addOpenedIndex,
      shuffleEnabled,
      setShuffleEnabled,
    }),
    [
      currentDayIndex,
      variant,
      openedIndices,
      addOpenedIndex,
      shuffleEnabled,
    ]
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
