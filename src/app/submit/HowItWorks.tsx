'use client';

import { useImperativeHandle, useLayoutEffect, useRef, type CSSProperties, type Ref } from 'react';
import type { Variant } from '@/lib/submissions';
import styles from './HowItWorks.module.css';

/**
 * The two things a Contributor is signing up for, as "Now" and "December".
 *
 * On a loop, focus moves from the asks to the Calendar: each Variant's icon
 * lifts off its ask and drops into a Day, the Days before it reveal in order,
 * then that Day opens with the icons inside. The Day is illustrative: nothing
 * is dealt until the Contributor presses Next.
 */
/**
 * The grid reads as a December month: seven columns, Day 1 in the second
 * (Monday-first, like 1 Dec 2026), only the first rows shown before it fades.
 * Day 10 stands in for "your day".
 */
const LEAD = 1;
const YOURS = 10;

/** The loop's length, and where focus leaves "Now" (the CSS module's 47%). */
const LOOP_MS = 8000;
const DECEMBER_AT_MS = LOOP_MS * 0.47;

export type HowItWorksHandle = {
  /**
   * Called by Next. While "Now" has focus, jumps the loop to December and
   * returns true, so Next doesn't leave before the Contributor has seen where
   * their tracks go. Returns false once December has focus, or when nothing
   * animates (reduced motion), and Next goes on.
   */
  showDecember(): boolean;
};

export function HowItWorks({
  variants,
  totalDays,
  asks,
  ref,
}: {
  variants: Variant[];
  totalDays: number;
  asks: Record<string, { icon: string; ask: string }>;
  ref?: Ref<HowItWorksHandle>;
}) {
  const box = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    showDecember() {
      const animations = box.current?.getAnimations({ subtree: true }) ?? [];
      // Every piece started together, so one clock speaks for all of them.
      const clock = Number(animations[0]?.currentTime ?? NaN);
      if (Number.isNaN(clock) || clock % LOOP_MS >= DECEMBER_AT_MS) return false;
      // Same time on every piece keeps each one's own delay relative to the rest.
      for (const animation of animations) animation.currentTime = DECEMBER_AT_MS;
      return true;
    },
  }));

  // Aim each flying icon from its ask to the Day. offsetLeft/Top ignore the
  // running transforms, so measuring mid-animation is safe.
  useLayoutEffect(() => {
    const root = box.current;
    if (!root) return;
    const within = (el: HTMLElement) => {
      let x = 0;
      let y = 0;
      let at: HTMLElement | null = el;
      while (at && at !== root) {
        x += at.offsetLeft;
        y += at.offsetTop;
        at = at.offsetParent as HTMLElement | null;
      }
      return [x, y];
    };
    const aim = () => {
      const day = root.querySelector<HTMLElement>('[data-yours]');
      const sources = root.querySelectorAll<HTMLElement>('[data-ask-icon]');
      const flyers = root.querySelectorAll<HTMLElement>('[data-fly]');
      if (!day) return;
      const [dx, dy] = within(day);
      const cx = dx + day.offsetWidth / 2 - 10;
      const cy = dy + day.offsetHeight / 2 - 10;
      flyers.forEach((fly, k) => {
        const source = sources[k];
        if (!source) return;
        const [sx, sy] = within(source);
        const spread = (k - (flyers.length - 1) / 2) * 14;
        fly.style.setProperty('--sx', `${sx + source.offsetWidth / 2 - 10}px`);
        fly.style.setProperty('--sy', `${sy + source.offsetHeight / 2 - 10}px`);
        fly.style.setProperty('--cx', `${cx}px`);
        fly.style.setProperty('--cy', `${cy}px`);
        fly.style.setProperty('--tx', `${cx + spread}px`);
        fly.style.setProperty('--ty', `${cy}px`);
      });
    };
    aim();
    const observer = new ResizeObserver(aim);
    observer.observe(root);
    document.fonts?.ready.then(aim);
    return () => observer.disconnect();
  }, [variants.length, totalDays]);

  return (
    <div
      ref={box}
      className="relative flex w-full min-w-0 flex-col rounded-2xl border border-white/90 bg-white/85 text-left text-zinc-900 shadow-[0_10px_30px_rgba(0,0,0,.08)] backdrop-blur"
    >
      {variants.map(({ variant }) => (
        <span key={variant} data-fly aria-hidden className={styles.fly}>
          {asks[variant]?.icon ?? '♪'}
        </span>
      ))}

      <div className={`${styles.now} flex flex-col gap-1 px-5 py-4`}>
        <span className="text-[11px] font-semibold uppercase tracking-[.16em] text-zinc-600">Now</span>
        <h2 className="text-xl font-medium leading-tight">
          {variants.length === 1 ? 'Choose 1 track you love' : `Choose ${variants.length} tracks you like`}
        </h2>
        <ul className="mt-1 flex flex-col gap-1 text-base">
          {variants.map(({ variant, label }) => (
            <li key={variant} className="flex items-center gap-2">
              <span data-ask-icon aria-hidden className={`${styles.askIcon} w-6 text-center text-lg text-zinc-500`}>
                {asks[variant]?.icon ?? '♪'}
              </span>
              1 {asks[variant]?.ask ?? label.toLowerCase()}
            </li>
          ))}
        </ul>
      </div>

      <div className={`${styles.december} flex items-center justify-between gap-4 border-t border-zinc-900/10 px-5 py-4`}>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[.16em] text-zinc-600">December</span>
          <p className="text-lg font-medium leading-tight">Wait until your day</p>
          <p className="text-sm text-zinc-600">Your {variants.length === 1 ? 'track' : 'tracks'} will be revealed for all to listen.</p>
        </div>
        <div aria-hidden className={styles.grid}>
          <i className={styles.blank} />
          {Array.from({ length: totalDays }, (_, i) => {
            const day = i + 1;
            const row = Math.floor((LEAD + i) / 7);
            const fade = row >= 2 ? (row === 2 ? styles.fade : styles.faint) : '';
            if (day === YOURS) return <i key={day} data-yours className={styles.yours} />;
            return (
              <i
                key={day}
                className={`${day < YOURS ? styles.before : ''} ${fade}`}
                style={day < YOURS ? ({ '--i': i } as CSSProperties) : undefined}
              >
                {day < YOURS ? day : null}
              </i>
            );
          })}
          <span className={`${styles.note} left-[82%]`}>♪</span>
          <span className={`${styles.note} left-[96%]`}>♫</span>
        </div>
      </div>
    </div>
  );
}
