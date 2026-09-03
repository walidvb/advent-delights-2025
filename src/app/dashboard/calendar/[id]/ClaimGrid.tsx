'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { CuratedDay } from '@/lib/curation';

/**
 * The Curator's 25-Day grid. Claim state and credited names only — nothing
 * about what was submitted, by construction of the data this receives.
 *
 * **Names are hidden by default**, behind a switch the Curator flips
 * themselves. A Curator only needs a name to chase the people who haven't
 * submitted, so showing them is the occasional case, not the resting one —
 * and the switch is purely a display choice: the names are already in this
 * component's props either way, never fetched on demand.
 */
export function ClaimGrid({ calendarId, days }: { calendarId: string; days: CuratedDay[] }) {
  const [showNames, setShowNames] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowNames((v) => !v)}
          className={`flex items-center gap-2.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
            showNames
              ? 'border-transparent bg-zinc-900 text-zinc-50'
              : 'border-white/70 bg-white/80 text-zinc-700'
          }`}
        >
          Show names
          <span
            className={`flex h-[22px] w-[38px] items-center rounded-full p-[3px] transition-colors ${
              showNames ? 'justify-end bg-white/35' : 'justify-start bg-zinc-300'
            }`}
          >
            <span className="size-4 rounded-full bg-white shadow" />
          </span>
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {days.map((day) => {
          const claimed = Boolean(day.claimedBy);
          const label = claimed ? (showNames ? day.claimedBy : 'claimed') : day.claimable ? 'free' : 'unclaimed';
          const tone = claimed
            ? 'border border-white/70 bg-white/90 shadow-[0_1px_2px_rgba(0,0,0,.04)]'
            : day.claimable
              ? 'border border-dashed border-zinc-900/25 bg-white/45'
              : 'border border-zinc-900/10 bg-zinc-900/25 text-white/70';

          const cell = (
            <div
              className={`relative flex aspect-square flex-col items-center justify-center rounded-lg p-1 text-center ${tone}`}
            >
              <span className="absolute left-1.5 top-1 font-mono text-[10px] text-zinc-400">
                {day.day}
              </span>
              <span className="line-clamp-2 px-1 text-[11px] font-medium leading-tight">{label}</span>
            </div>
          );

          return (
            <div key={day.day}>
              {claimed ? (
                <Link href={`/dashboard/calendar/${calendarId}/day/${day.day}`}>{cell}</Link>
              ) : (
                cell
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border border-zinc-900/15 bg-white" /> claimed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border border-dashed border-zinc-900/30" /> free
        </span>
      </div>
    </div>
  );
}
