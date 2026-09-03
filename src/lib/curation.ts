import { getCloudflareContext } from '@opennextjs/cloudflare';
import { claimableDays, DAYS_IN_CALENDAR } from '@/app/advent/reveal';
import { purgeCalendarPayload } from './calendar-payload';
import { coverPath } from './covers';
import { getOwnedCalendar } from './calendars';

/**
 * The Curator's view of their own Calendar: how full it is, who has claimed
 * which Day, and nothing whatsoever about what those people submitted.
 *
 * **`getClaims` never touches `tracks`.** That is the whole ticket: a leak here
 * renders as a perfectly working page, so the only defence is that the query
 * behind the dashboard cannot return Track content at all. `revealDay` is the
 * one function in this module that reads a Track, it is called from one place,
 * and that place is reached only by a Curator who clicked past a warning.
 *
 * Ownership is a property of this module, not of the pages: every entry point
 * takes a `curatorId` and starts by asking `getOwnedCalendar`, so a Calendar
 * that is not yours is indistinguishable from one that does not exist.
 */

/** One Day of the Curator's grid. No Track content, by construction. */
export type CuratedDay = { day: number; claimedBy: string | null; claimable: boolean };

/** The claim state of a whole Calendar: the grid, and how many Days are in. */
export type CalendarClaims = { days: CuratedDay[]; claimedCount: number };

/** What is behind one door. Only ever built by `revealDay`. */
export type RevealedTrack = {
  variant: string;
  label: string;
  url: string;
  title: string;
  artist: string;
  description: string;
  buyLink: string;
  cover: string;
};

export type RevealedDay = { link: string; tracks: RevealedTrack[] };

async function db() {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

/**
 * Which Days are claimed, by whom, and which are still up for grabs. Null when
 * the Calendar is not this Curator's.
 *
 * Day and credited name only. Adding a `tracks` column or a join to this query
 * is exactly the spoiler this module exists to prevent.
 */
export async function getClaims(
  calendarId: string,
  curatorId: string,
): Promise<CalendarClaims | null> {
  const calendar = await getOwnedCalendar(calendarId, curatorId);
  if (!calendar) return null;

  const { results } = await (await db())
    .prepare('select day, credited_to from submissions where calendar_id = ?1')
    .bind(calendarId)
    .all<{ day: number; credited_to: string }>();

  const claimedBy = new Map(results.map((row) => [row.day, row.credited_to]));
  const claimable = new Set(claimableDays(calendar.year, new Date()));

  return {
    claimedCount: claimedBy.size,
    days: Array.from({ length: DAYS_IN_CALENDAR }, (_, i) => ({
      day: i + 1,
      claimedBy: claimedBy.get(i + 1) ?? null,
      claimable: claimable.has(i + 1),
    })),
  };
}

/** Who claimed one Day, without saying what they put there. Null if nobody did. */
export async function getClaim(
  calendarId: string,
  curatorId: string,
  day: number,
): Promise<{ claimedBy: string } | null> {
  if (!(await getOwnedCalendar(calendarId, curatorId))) return null;
  const row = await (await db())
    .prepare('select credited_to from submissions where calendar_id = ?1 and day = ?2')
    .bind(calendarId, day)
    .first<{ credited_to: string }>();
  return row ? { claimedBy: row.credited_to } : null;
}

/**
 * Spoils one Day, deliberately. The only read in this module that reaches
 * `tracks`, and it is scoped to the single Day asked for — revealing Day 7
 * tells the Curator nothing at all about Day 8.
 *
 * One click, immediate, no separate confirmation step — the click that reaches
 * this function is the whole of the "are you sure". Nothing about having
 * looked is written down anywhere: this is a Curator overriding their own
 * blindness for a moment, not a fact about the Day worth remembering.
 */
export async function revealDay(
  calendarId: string,
  curatorId: string,
  day: number,
): Promise<RevealedDay | null> {
  if (!(await getOwnedCalendar(calendarId, curatorId))) return null;

  const { results } = await (await db())
    .prepare(
      `select s.link, v.variant, v.label, t.url, t.title, t.artist, t.description,
              t.buy_link, t.cover_key, t.cover_url
         from submissions s
         join calendar_variants v on v.calendar_id = s.calendar_id
         left join tracks t on t.submission_id = s.id and t.variant = v.variant
        where s.calendar_id = ?1 and s.day = ?2
        order by v.position`,
    )
    .bind(calendarId, day)
    .all<{
      link: string;
      variant: string;
      label: string;
      url: string | null;
      title: string | null;
      artist: string | null;
      description: string | null;
      buy_link: string | null;
      cover_key: string | null;
      cover_url: string | null;
    }>();

  if (results.length === 0) return null;

  return {
    link: results[0].link,
    tracks: results.map((row) => ({
      variant: row.variant,
      label: row.label,
      url: row.url ?? '',
      title: row.title ?? '',
      artist: row.artist ?? '',
      description: row.description ?? '',
      buyLink: row.buy_link ?? '',
      // No placeholder: the Curator is here to see what is actually stored.
      cover: row.cover_key ? coverPath(row.cover_key) : (row.cover_url ?? ''),
    })),
  };
}

/**
 * Removes the Submission on one Day, content unseen. The Day goes back to being
 * empty, and so becomes claimable again under the usual rule — `claimableDays`
 * still refuses a Day that has revealed, so this cannot reopen a door people
 * have already looked behind.
 *
 * False when the Calendar is not theirs or the Day was already empty.
 */
export async function deleteSubmission(
  calendarId: string,
  curatorId: string,
  day: number,
): Promise<boolean> {
  const calendar = await getOwnedCalendar(calendarId, curatorId);
  if (!calendar) return false;

  const database = await db();
  const submission = await database
    .prepare('select id from submissions where calendar_id = ?1 and day = ?2')
    .bind(calendarId, day)
    .first<{ id: string }>();
  if (!submission) return false;

  // Tracks first: they reference the Submission.
  await database.batch([
    database.prepare('delete from tracks where submission_id = ?1').bind(submission.id),
    database.prepare('delete from submissions where id = ?1').bind(submission.id),
  ]);

  // The Calendar has been written to, so the viewer's cached payload is stale.
  await purgeCalendarPayload(calendar.slug);
  return true;
}
