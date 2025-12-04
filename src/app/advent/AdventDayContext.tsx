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

interface AdventDayContextValue {
  currentDayIndex: number;
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
  const [revealedIndices, setRevealedIndices] = useLocalStorage<number[]>(
    'advent-revealed',
    []
  );

  const normalizedIndices = useMemo(
    () => (Array.isArray(revealedIndices) ? revealedIndices : []),
    [revealedIndices]
  );

  const addRevealedIndex = useCallback(
    (index: number) => {
      if (!normalizedIndices.includes(index)) {
        setRevealedIndices([...normalizedIndices, index]);
      }
    },
    [normalizedIndices, setRevealedIndices]
  );

  const value = useMemo(
    () => ({
      currentDayIndex,
      revealedIndices: normalizedIndices,
      addRevealedIndex,
    }),
    [currentDayIndex, normalizedIndices, addRevealedIndex]
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
