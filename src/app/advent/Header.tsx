'use client';

import { VariantSwitch } from './VariantSwitch';
import { useAdventDay } from './AdventDayContext';

export function Header() {
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

      <p className="text-sm text-zinc-500">
        Made with <span className="text-red-500">♥</span> by Walid & Aline
      </p>
    </header>
  );
}
