'use client';

import { VariantSwitch } from './VariantSwitch';

export function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4">
      <h1
        className="text-3xl md:text-4xl font-light italic"
        style={{ fontFamily: 'Georgia, serif' }}
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
