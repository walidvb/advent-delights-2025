'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
  useCallback,
  useSyncExternalStore,
} from 'react';
import { useLocalStorage } from 'react-use';
import { revealedDayCount } from './reveal';
import { CalendarIdentity, Mood, TrackVariant } from './types';

interface AdventDayContextValue {
  slug: string;
  currentDayIndex: number;
  variants: TrackVariant[];
  variant: TrackVariant;
  setVariant: (variant: TrackVariant) => void;
  mood: Mood;
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
  const { variants } = calendar;
  const [variant, setVariant] = useState<TrackVariant>(variants[0] ?? 'light');
  const prefersDark = usePrefersDark();
  const mood: Mood =
    variant === 'heavy' || (variant === 'track' && prefersDark) ? 'dark' : 'light';
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  // Keyed by Slug so that following two Calendars keeps two sets of progress,
  // and within that by Variant, since each Variant's Days are opened apart.
  const [openedIndicesMap, setOpenedIndicesMap] = useLocalStorage<
    Record<string, number[]>
  >(`advent-opened:${calendar.slug}`, {});

  // Whatever was stored, every Variant of this Calendar gets a list.
  const normalizedMap = useMemo(
    () =>
      Object.fromEntries(
        variants.map((v) => [
          v,
          Array.isArray(openedIndicesMap?.[v]) ? openedIndicesMap[v] : [],
        ])
      ),
    [openedIndicesMap, variants]
  );

  const openedIndices = normalizedMap[variant] ?? [];

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
      slug: calendar.slug,
      currentDayIndex,
      variants,
      variant,
      setVariant,
      mood,
      openedIndices,
      addOpenedIndex,
      shuffleEnabled,
      setShuffleEnabled,
    }),
    [
      calendar.slug,
      currentDayIndex,
      variants,
      variant,
      mood,
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

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribePrefersDark(onChange: () => void) {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/** The viewer's colour scheme. Light on the server and when they state none. */
function usePrefersDark() {
  return useSyncExternalStore(
    subscribePrefersDark,
    () => window.matchMedia(DARK_QUERY).matches,
    () => false
  );
}
