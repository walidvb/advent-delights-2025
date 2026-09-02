import { getCloudflareContext } from '@opennextjs/cloudflare';
import { DAYS_IN_CALENDAR } from '@/app/advent/reveal';
import type { Contributor, Day, TrackVariant } from '@/app/advent/types';

/**
 * The Calendar read API: everything a viewer needs for one Calendar, in one
 * payload, fetched with one query and then cached.
 *
 * A visit that hits the cache costs no database work at all, and a write to the
 * Calendar purges the payload so the change shows on the very next load. That
 * is the whole point of the shape: `purgeCalendarPayload` is what a Submission,
 * an edit or a deletion calls instead of rebuilding and redeploying the site.
 */

/** Everything the Calendar interface renders, for every Day. */
export type CalendarPayload = {
  slug: string;
  year: number;
  days: Day[];
  contributors: Contributor[];
};

/** The cache holds the payload for a year; writes purge it long before that. */
const PAYLOAD_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * A Track with no cover of its own falls back to the placeholder the original
 * Calendar has always used: a stable picture per Day.
 */
function placeholderCover(day: number) {
  return `https://picsum.photos/seed/advent${day}/400/400`;
}

/** Where a cover is read from: uploaded image, then looked-up image, then the placeholder. */
function coverImage(row: TrackRow, day: number) {
  if (row.cover_key) return coverPath(row.cover_key);
  return row.cover_url || placeholderCover(day);
}

/**
 * Uploaded covers are served by the application from R2, never from the
 * bucket's own URL. The key becomes the path after `/cover/`, a segment at a
 * time, so a filename carrying a `#` or a space still addresses its object.
 */
export const coverPath = (key: string) =>
  `/cover/${key.split('/').map(encodeURIComponent).join('/')}`;

type TrackRow = {
  slug: string;
  year: number;
  day: number | null;
  credited_to: string | null;
  link: string | null;
  variant: string | null;
  url: string | null;
  title: string | null;
  artist: string | null;
  description: string | null;
  buy_link: string | null;
  cover_key: string | null;
  cover_url: string | null;
};

/**
 * One query for the whole Calendar. The left joins mean an unknown Slug comes
 * back empty, and a Calendar whose Days are all empty comes back as one row
 * with no Day — so this distinguishes "no such Calendar" from "nothing in it".
 */
async function readCalendar(slug: string): Promise<CalendarPayload | null> {
  const { env } = await getCloudflareContext({ async: true });
  const { results } = await env.DB.prepare(
    `select c.slug, c.year, s.day, s.credited_to, s.link,
            t.variant, t.url, t.title, t.artist, t.description, t.buy_link,
            t.cover_key, t.cover_url
       from calendars c
       left join submissions s on s.calendar_id = c.id
       left join tracks t on t.submission_id = s.id
      where c.slug = ?1
      order by s.day`,
  )
    .bind(slug)
    .all<TrackRow>();

  if (results.length === 0) return null;

  // Every Day is present, claimed or not: an empty Day holds no Track at all,
  // and the interface renders it as empty rather than leaving a hole.
  const days: Day[] = Array.from({ length: DAYS_IN_CALENDAR }, (_, i) => ({
    dayIndex: i,
    creditedTo: '',
    contributorLink: '',
    tracks: {},
  }));
  const contributors: Contributor[] = [];
  const seen = new Set<string>();

  for (const row of results) {
    if (row.day === null) continue;
    const day = days[row.day - 1];
    day.creditedTo = row.credited_to ?? '';
    day.contributorLink = row.link ?? '';
    if (row.variant) {
      day.tracks[row.variant as TrackVariant] = {
        url: row.url ?? '',
        trackName: row.title ?? '',
        artistName: row.artist ?? '',
        description: row.description ?? '',
        buyLink: row.buy_link ?? '',
        coverImage: coverImage(row, row.day),
      };
    }
    if (day.creditedTo && !seen.has(day.creditedTo)) {
      seen.add(day.creditedTo);
      contributors.push({ name: day.creditedTo, link: day.contributorLink });
    }
  }

  return { slug: results[0].slug, year: results[0].year, days, contributors };
}

/**
 * `caches.default` exists in the Worker and nowhere else — `next dev` runs the
 * application in Node, which has no cache, and simply reads the database every
 * time.
 */
function edgeCache(): Cache | null {
  if (typeof caches === 'undefined') return null;
  // The Worker's own cache. The DOM's `CacheStorage` type has no `default`.
  return (caches as unknown as { default: Cache }).default;
}

/** The cached payload's address. Not a real URL; nothing ever fetches it. */
const cacheKey = (slug: string) =>
  new Request(`https://calendar-payload.invalid/${encodeURIComponent(slug)}`);

/**
 * The Calendar at `slug`, from the cache when it is there and from the database
 * when it is not. Null for a Slug no Calendar has.
 *
 * A missing Calendar is deliberately not cached: caching it would let a typo
 * outlive the Calendar that fixes it, and an unknown Slug is nobody's normal
 * visit.
 */
export async function getCalendarPayload(
  slug: string,
): Promise<CalendarPayload | null> {
  const cache = edgeCache();
  const key = cacheKey(slug);

  const cached = await cache?.match(key);
  if (cached) return (await cached.json()) as CalendarPayload;

  const payload = await readCalendar(slug);
  if (!payload) return null;

  await cache?.put(
    key,
    new Response(JSON.stringify(payload), {
      headers: {
        'content-type': 'application/json',
        'cache-control': `public, max-age=${PAYLOAD_MAX_AGE}`,
      },
    }),
  );
  return payload;
}

/**
 * Drops a Calendar's cached payload, so the next visit rebuilds it from the
 * database. Every write to a Calendar — a Submission, an edit, a deletion —
 * calls this.
 *
 * ponytail: `caches.default` is per data centre, so a purge clears the cache in
 * the data centre that handled the write and leaves the others to expire. The
 * Contributor who just submitted sees their Day immediately; a viewer on
 * another continent may not. Purge by URL through the zone API if that ever
 * matters.
 */
export async function purgeCalendarPayload(slug: string): Promise<void> {
  await edgeCache()?.delete(cacheKey(slug));
}
