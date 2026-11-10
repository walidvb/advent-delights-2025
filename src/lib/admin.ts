import { getCloudflareContext } from '@opennextjs/cloudflare';
import { notFound } from 'next/navigation';
import { isArchived } from '@/app/advent/reveal';
import { getCurator } from './auth';
import { purgeCalendarPayload } from './calendar-payload';

/**
 * Platform staff: every Calendar, whoever curates it, and the power to remove
 * them. The one module that reads Calendars without a `curator_id` scope —
 * every entry point starts with `requireAdmin`, so the unscoped queries are
 * only ever reached by an Admin.
 *
 * Like the Curator's view, this never touches Track content: an Admin sees who
 * claimed a Day, not what they put there.
 */

export type AdminCalendar = {
  id: string;
  name: string;
  year: number;
  slug: string;
  curatorEmail: string;
  claims: { day: number; claimedBy: string }[];
};

async function db() {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

/** The signed-in Admin. Anyone else gets a 404, so the page doesn't advertise itself. */
export async function requireAdmin() {
  const curator = await getCurator();
  if (!curator?.isAdmin) notFound();
  return curator;
}

export async function listAllCalendars(): Promise<AdminCalendar[]> {
  await requireAdmin();
  const database = await db();
  const [calendars, claims] = await Promise.all([
    database
      .prepare(
        `select c.id, c.name, c.year, c.slug, cu.email as curatorEmail
           from calendars c join curators cu on cu.id = c.curator_id
          order by c.year desc, c.created_at desc`,
      )
      .all<Omit<AdminCalendar, 'claims'>>(),
    database
      .prepare('select calendar_id, day, credited_to from submissions order by day')
      .all<{ calendar_id: string; day: number; credited_to: string }>(),
  ]);

  const byCalendar = Map.groupBy(claims.results, (row) => row.calendar_id);
  return calendars.results.map((calendar) => ({
    ...calendar,
    claims: (byCalendar.get(calendar.id) ?? []).map((row) => ({ day: row.day, claimedBy: row.credited_to })),
  }));
}

/**
 * Removes a Calendar and everything hanging off it. Children first, in one
 * batch, because nothing in the schema cascades on its own.
 *
 * Uploaded covers stay in the bucket, as they do for every other deletion —
 * see the sweep note in `src/app/submit/actions.ts`.
 */
export async function deleteCalendar(id: string): Promise<void> {
  await requireAdmin();
  const database = await db();
  const calendar = await database
    .prepare('select slug from calendars where id = ?1')
    .bind(id)
    .first<{ slug: string }>();
  if (!calendar) return;

  await database.batch([
    database
      .prepare('delete from tracks where submission_id in (select id from submissions where calendar_id = ?1)')
      .bind(id),
    database.prepare('delete from submissions where calendar_id = ?1').bind(id),
    database.prepare('delete from calendar_variants where calendar_id = ?1').bind(id),
    database.prepare('delete from calendars where id = ?1').bind(id),
  ]);

  await purgeCalendarPayload(calendar.slug);
}

/**
 * Drops a Calendar's cached payload so the next visit reads the database
 * again. For when the database was changed by hand and nothing purged it.
 */
export async function refreshCalendar(id: string): Promise<void> {
  await requireAdmin();
  const calendar = await (await db())
    .prepare('select slug from calendars where id = ?1')
    .bind(id)
    .first<{ slug: string }>();
  if (calendar) await purgeCalendarPayload(calendar.slug);
}

/**
 * Removes the Submission on one Day of a Calendar that is not yet an Archive.
 * Archived Days are left alone — the Calendar is finished.
 */
export async function deleteSubmission(calendarId: string, day: number): Promise<void> {
  await requireAdmin();
  const database = await db();
  const calendar = await database
    .prepare('select slug, year from calendars where id = ?1')
    .bind(calendarId)
    .first<{ slug: string; year: number }>();
  if (!calendar || isArchived(calendar.year, new Date())) return;

  await database.batch([
    database
      .prepare(
        'delete from tracks where submission_id in (select id from submissions where calendar_id = ?1 and day = ?2)',
      )
      .bind(calendarId, day),
    database.prepare('delete from submissions where calendar_id = ?1 and day = ?2').bind(calendarId, day),
  ]);

  await purgeCalendarPayload(calendar.slug);
}
