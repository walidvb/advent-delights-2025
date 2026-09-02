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
