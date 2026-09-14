/**
 * Reveal rules: which of a Calendar's Days have revealed, and which may still
 * be claimed.
 *
 * Reveal is an honour system judged against the viewer's own device, so these
 * are plain functions of a Calendar's start date and a moment — no clock read,
 * no timezone handling, no date written in. Callers pass `new Date()`.
 *
 * A start date is a local calendar date, `YYYY-MM-DD`, and Day 1 reveals on it.
 * Whole days are counted by calendar date rather than by elapsed milliseconds,
 * so a Day turns over at local midnight and a DST change does not shift it.
 */
import { differenceInCalendarDays, parseISO } from 'date-fns';

/** A Calendar is twenty-five Days. */
export const DAYS_IN_CALENDAR = 25;

/** Where a Calendar starts unless it is told otherwise: the 1st of December. */
export const defaultStartsOn = (year: number) => `${year}-12-01`;

/** The year a start date falls in — what the Calendar is labelled with. */
export const startYear = (startsOn: string) => Number(startsOn.slice(0, 4));

/**
 * How many of a Calendar's Days have revealed at `now`: none before its start
 * date, one more per elapsed date from then, all of them once the twenty-five
 * are past. Days are numbered 1–25, so the count is also the highest Day that
 * has revealed.
 */
export function revealedDayCount(startsOn: string, now: Date): number {
  const elapsed = differenceInCalendarDays(now, parseISO(startsOn)) + 1;
  return Math.max(0, Math.min(DAYS_IN_CALENDAR, elapsed));
}

/**
 * The Days a Contributor may still claim: only the ones that have not revealed.
 * A Day nobody claimed before it revealed stays empty for good.
 */
export function claimableDays(startsOn: string, now: Date): number[] {
  const revealed = revealedDayCount(startsOn, now);
  return Array.from(
    { length: DAYS_IN_CALENDAR - revealed },
    (_, i) => revealed + 1 + i
  );
}

/**
 * Whether a Calendar has become an Archive: the last Day is over, so every Day
 * is open, nothing more can be added, and nothing already there can be changed.
 *
 * Deliberately a day later than the point where `claimableDays` runs out. That
 * one is about claiming, and a Day cannot be claimed once it has opened; this
 * one is about the Calendar being finished. On the last Day itself that Day is
 * still opening, and a Contributor should still be able to fix a broken link in
 * it.
 */
export function isArchived(startsOn: string, now: Date): boolean {
  return differenceInCalendarDays(now, parseISO(startsOn)) >= DAYS_IN_CALENDAR;
}
