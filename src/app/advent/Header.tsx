'use client';

import { VariantSwitch } from './VariantSwitch';
import { useAdventDay } from './AdventDayContext';
import { InfoIcon } from 'lucide-react';

interface HeaderProps {
  onAboutClick: () => void;
}

export function Header({ onAboutClick }: HeaderProps) {
  const { variant } = useAdventDay();

  return (
    <header className="flex items-center justify-between px-6 py-4 md:py-8">
      <h1
        className={`text-3xl md:text-6xl font-light italic font-title ${
          variant === 'light' ? 'text-zinc-900' : 'text-white'
        }`}
      >
        Advent Delights
      </h1>

      <VariantSwitch />

      <button
        onClick={onAboutClick}
        className={`text-sm font-medium transition-colors mr-4 cursor-pointer ${
          variant === 'light'
            ? 'text-zinc-600 hover:text-zinc-900'
            : 'text-zinc-400 hover:text-white'
        }`}
      >
        <InfoIcon className="w-6 h-6" />
      </button>
    </header>
  );
}
