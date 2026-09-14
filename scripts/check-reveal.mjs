#!/usr/bin/env node --experimental-strip-types
/**
 * The reveal rules, checked against a few dates. They are the only arithmetic
 * in the platform that decides what a viewer may see, and a Calendar no longer
 * starts on a date the code knows — so the start date is worth one assertion
 * per boundary.
 *
 *   node --experimental-strip-types scripts/check-reveal.mjs
 */
import assert from 'node:assert/strict';
import {
  DAYS_IN_CALENDAR,
  claimableDays,
  defaultStartsOn,
  isArchived,
  revealedDayCount,
  startYear,
} from '../src/app/advent/reveal.ts';

/** Local midnight, like the dates the rules are judged against. */
const at = (year, month, day) => new Date(year, month - 1, day);

const december = defaultStartsOn(2025);
assert.equal(december, '2025-12-01');
assert.equal(startYear(december), 2025);

// A December Calendar behaves exactly as it always has.
assert.equal(revealedDayCount(december, at(2025, 11, 30)), 0);
assert.equal(revealedDayCount(december, at(2025, 12, 1)), 1);
assert.equal(revealedDayCount(december, at(2025, 12, 7)), 7);
assert.equal(revealedDayCount(december, at(2025, 12, 25)), DAYS_IN_CALENDAR);
assert.equal(revealedDayCount(december, at(2026, 6, 1)), DAYS_IN_CALENDAR);
assert.equal(revealedDayCount(december, at(2024, 12, 5)), 0);

// A Calendar starting on any other date counts from that date instead.
const june = '2026-06-10';
assert.equal(revealedDayCount(june, at(2026, 6, 9)), 0);
assert.equal(revealedDayCount(june, at(2026, 6, 10)), 1);
assert.equal(revealedDayCount(june, at(2026, 6, 14)), 5);

// Only unrevealed Days can be claimed, and the last one is dealt on the day
// before it opens.
assert.deepEqual(claimableDays(december, at(2025, 11, 30)).length, DAYS_IN_CALENDAR);
assert.deepEqual(claimableDays(december, at(2025, 12, 7))[0], 8);
assert.deepEqual(claimableDays(december, at(2025, 12, 25)), []);

// The Archive is a day after claiming stops: the last Day is still editable
// while it opens.
assert.equal(isArchived(december, at(2025, 12, 25)), false);
assert.equal(isArchived(december, at(2025, 12, 26)), true);
assert.equal(isArchived(june, at(2026, 7, 4)), false);
assert.equal(isArchived(june, at(2026, 7, 5)), true);

console.log('reveal rules ok');
