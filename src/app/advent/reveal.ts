/**
 * Reveal rules: which of a Calendar's Days have revealed, and which may still
 * be claimed.
 *
 * Reveal is an honour system judged against the viewer's own device, so these
 * are plain functions of a Calendar's year and a moment — no clock read, no
 * timezone handling, no year written in. Callers pass `new Date()`.
 */

/** A Calendar is twenty-five Days, in December. */
export const DAYS_IN_CALENDAR = 25;

const DECEMBER = 11;

/**
 * How many of a Calendar's Days have revealed at `now`: none before December of
 * its year, one more per elapsed December date, all of them once that December
 * is past. Days are numbered 1–25, so the count is also the highest Day that
 * has revealed.
 */
export function revealedDayCount(year: number, now: Date): number {
  if (now.getFullYear() !== year) {
    return now.getFullYear() < year ? 0 : DAYS_IN_CALENDAR;
  }
  if (now.getMonth() < DECEMBER) {
    return 0;
  }
  return Math.min(DAYS_IN_CALENDAR, now.getDate());
}

/**
 * The Days a Contributor may still claim: only the ones that have not revealed.
 * A Day nobody claimed before it revealed stays empty for good.
 */
export function claimableDays(year: number, now: Date): number[] {
  const revealed = revealedDayCount(year, now);
  return Array.from(
    { length: DAYS_IN_CALENDAR - revealed },
    (_, i) => revealed + 1 + i
  );
}

/**
 * Whether a Calendar has become an Archive: the 25th is over, so every Day is
 * open, nothing more can be added, and nothing already there can be changed.
 *
 * Deliberately a day later than the point where `claimableDays` runs out. That
 * one is about claiming, and a Day cannot be claimed once it has opened; this
 * one is about the Calendar being finished. On the 25th itself the last Day is
 * still opening, and a Contributor should still be able to fix a broken link in
 * it.
 */
export function isArchived(year: number, now: Date): boolean {
  return now >= new Date(year, DECEMBER, 26);
}
