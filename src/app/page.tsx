'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { PeekGrid } from './PeekGrid';
import type { TrackVariant } from './advent/types';
import { cn } from '@/lib/utils';

/**
 * The marketing landing page: the front door for someone who has never made a
 * Calendar, with the product one click away either direction.
 *
 * It is a client component and a static one — no data is read at request time.
 * The Days behind the peek grid are baked into the bundle at build time by
 * `scripts/build-peek-pool.mjs`, so this page is one prerendered file the
 * Worker serves without touching the database.
 */
export default function Home() {
  const [variant, setVariant] = useState<TrackVariant>('light');
  const light = variant === 'light';

  // The Variant is the whole page's mood, not the grid's: switching it swaps
  // the background and every piece of ink, exactly as it does on a Calendar.
  const ink = light ? 'text-zinc-900' : 'text-zinc-50';
  const body = light ? 'text-zinc-700' : 'text-zinc-300';
  const muted = light ? 'text-zinc-600' : 'text-zinc-400';
  const faint = light ? 'text-zinc-500' : 'text-zinc-400';
  const rule = light ? 'border-zinc-900/10' : 'border-white/15';
  const cta = light ? 'bg-zinc-900 text-zinc-50' : 'bg-zinc-50 text-zinc-900';

  return (
    <main className={cn('relative flex min-h-dvh flex-col', ink)}>
      <AnimatePresence>
        <motion.div
          key={variant}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${light ? '/light.webp' : '/dark.webp'})` }}
        />
      </AnimatePresence>

      <header className="flex flex-col items-center gap-1.5 px-5 pt-9 lg:flex-row lg:justify-between lg:px-10 lg:pt-7">
        <span
          className="font-title text-[44px] leading-none font-light italic select-none lg:text-[52px]"
          style={{ textShadow: '0px .5px 0px currentColor, 0.5px 0px 0px currentColor' }}
        >
          Advent Delights
        </span>
        <Link href="/sign-in" className={cn('hidden text-sm font-medium lg:block', muted)}>
          Sign in
        </Link>
      </header>

      <div className="grid flex-1 items-start px-6 pt-8 pb-8 lg:grid-cols-2 lg:gap-10 lg:px-10 lg:pt-[70px] lg:pb-12">
        <div className="flex flex-col gap-[18px] lg:col-start-1 lg:row-start-1 lg:gap-[26px] lg:pt-6">
          <h1 className="text-[38px] leading-[1.06] font-light tracking-[-0.02em] text-pretty lg:text-[56px]">
            An advent calendar <br className="hidden lg:inline" />
            your people fill <br className="hidden lg:inline" />
            with music.
          </h1>
          <p
            className={cn(
              'max-w-[440px] text-base leading-[1.5] text-pretty lg:text-[19px] lg:leading-[1.55]',
              body,
            )}
          >
            <span className="hidden lg:inline">Twenty-five days. </span>Each day belongs to one
            person, and they leave two tracks behind it
            <span className="hidden lg:inline"> — one to soothe your mind, one to get schwifty</span>
            . Nobody sees a thing until December opens it.
          </p>
        </div>

        {/* One instance, placed rather than duplicated: on a phone the grid
            comes between the pitch and the ask, because it is the only part of
            the page that shows what any of this actually is. */}
        <div className="flex justify-center py-2 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:py-0 lg:pt-[34px]">
          <PeekGrid variant={variant} onVariantChange={setVariant} />
        </div>

        <div className="flex flex-col gap-[18px] lg:col-start-1 lg:row-start-2 lg:gap-[26px]">
          <div className="flex flex-col items-center gap-2.5 lg:flex-row lg:gap-[18px] lg:pt-1.5">
            <Link
              href="/dashboard/new"
              className={cn(
                'rounded-full px-[30px] py-[15px] text-base font-medium shadow-[0_6px_20px_rgba(0,0,0,.18)] transition-opacity hover:opacity-90',
                cta,
              )}
            >
              Create a calendar
            </Link>
            <span className={cn('text-sm', muted)}>
              Free. Takes a minute.
              <Link href="/sign-in" className="underline lg:hidden">
                {' '}
                Sign in
              </Link>
            </span>
          </div>

          <div className={cn('mt-3.5 hidden gap-7 border-t pt-[34px] lg:flex', rule)}>
            {[
              ['01', 'Start a calendar and name it.'],
              ['02', 'Send the submit link to your people.'],
              ['03', 'December opens one day at a time.'],
            ].map(([n, copy]) => (
              <div key={n} className="flex max-w-[150px] flex-col gap-1.5">
                <span className={cn('font-mono text-[11px]', faint)}>{n}</span>
                <span className={cn('text-sm leading-[1.4]', body)}>{copy}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer
        className={cn(
          'mt-auto flex items-center justify-between border-t px-6 py-3.5 backdrop-blur-[6px] lg:px-10',
          light ? 'border-zinc-200 bg-white/95' : 'border-white/10 bg-zinc-900/75',
        )}
      >
        <span className={cn('text-[13px]', faint)}>
          Already running one?{' '}
          <Link href="/sign-in" className="text-teal-600 hover:text-teal-700">
            Sign in
          </Link>
        </span>
        <span className={cn('hidden text-xs sm:block', faint)}>
          Made in 2025, with <span className="text-red-500">🩶</span> by Aline &amp; Walid
        </span>
      </footer>
    </main>
  );
}
