import { getCloudflareContext } from '@opennextjs/cloudflare';
import { detectProvider, normalizeUrl, type MediaRef } from '@cucu/media/core';
import { DAYS_IN_CALENDAR } from '@/app/advent/reveal';
import { coverPath } from './covers';
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
  /** Not Public: the page still loads for anyone holding the Slug, but is not indexed. */
  isPublic: boolean;
  /** The Calendar's Variants, in order: two to switch between, or one. */
  variants: TrackVariant[];
  days: Day[];
  /**
   * Null on a Self-filled Calendar, which credits nobody: one person filled
   * every Day, so the names are left out of the payload altogether rather than
   * shipped and hidden.
   */
  contributors: Contributor[] | null;
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
 * How the player plays a Track. The link is canonicalised here as well as on
 * the way in, so Tracks stored before that still play the video and not the
 * playlist it was linked from. A link from a source we don't recognise is
 * handed to the player as it is, which plays more than we detect.
 */
function media(row: TrackRow): MediaRef {
  const url = row.url ?? '';
  return {
    provider: detectProvider(url) ?? 'file',
    url: normalizeUrl(url) ?? url,
    providerTrackId: row.provider_track_id,
    streamUrl: row.stream_url,
  };
}

type TrackRow = {
  slug: string;
  year: number;
  is_public: number;
  self_filled: number;
  day: number | null;
  credited_to: string | null;
  link: string | null;
  created_at: number | null;
  variant: string | null;
  url: string | null;
  title: string | null;
  artist: string | null;
  description: string | null;
  buy_link: string | null;
  cover_key: string | null;
  cover_url: string | null;
  provider_track_id: string | null;
  stream_url: string | null;
};

/**
 * One round trip for the whole Calendar: its Days and Tracks, and its Variants.
 * In the first query the left joins mean an unknown Slug comes back empty, and
 * a Calendar whose Days are all empty comes back as one row with no Day — so
 * this distinguishes "no such Calendar" from "nothing in it".
 */
async function readCalendar(slug: string): Promise<CalendarPayload | null> {
  const { env } = await getCloudflareContext({ async: true });
  const [trackResult, variantResult] = await env.DB.batch([
    env.DB.prepare(
      `select c.slug, c.year, c.is_public, c.self_filled, s.day, s.credited_to, s.link, s.created_at,
              t.variant, t.url, t.title, t.artist, t.description, t.buy_link,
              t.cover_key, t.cover_url, t.provider_track_id, t.stream_url
         from calendars c
         left join submissions s on s.calendar_id = c.id
         left join tracks t on t.submission_id = s.id
        where c.slug = ?1
        order by s.day`,
    ).bind(slug),
    env.DB.prepare(
      `select v.variant
         from calendar_variants v
         join calendars c on c.id = v.calendar_id
        where c.slug = ?1
        order by v.position`,
    ).bind(slug),
  ]);
  // One batch, two row shapes: D1 types a batch by a single row type.
  const results = trackResult.results as TrackRow[];
  const variantRows = variantResult.results as { variant: TrackVariant }[];

  if (results.length === 0) return null;
  const selfFilled = results[0].self_filled === 1;

  // Every Day is present, claimed or not: an empty Day holds no Track at all,
  // and the interface renders it as empty rather than leaving a hole.
  const days: Day[] = Array.from({ length: DAYS_IN_CALENDAR }, (_, i) => ({
    dayIndex: i,
    creditedTo: '',
    contributorLink: '',
    tracks: {},
  }));
  // Each name once, stamped with the latest Submission made under it.
  const latestByName = new Map<string, { contributor: Contributor; at: number }>();

  for (const row of results) {
    if (row.day === null) continue;
    const day = days[row.day - 1];
    if (!selfFilled) {
      day.creditedTo = row.credited_to ?? '';
      day.contributorLink = row.link ?? '';
    }
    if (row.variant) {
      day.tracks[row.variant as TrackVariant] = {
        url: row.url ?? '',
        trackName: row.title ?? '',
        artistName: row.artist ?? '',
        description: row.description ?? '',
        buyLink: row.buy_link ?? '',
        coverImage: coverImage(row, row.day),
        media: media(row),
      };
    }
    const at = row.created_at ?? 0;
    const known = latestByName.get(day.creditedTo);
    if (day.creditedTo && (!known || at > known.at)) {
      latestByName.set(day.creditedTo, {
        contributor: { name: day.creditedTo, link: day.contributorLink },
        at,
      });
    }
  }

  // Most recently submitted first, never by Day: who joined is public, which
  // Day is theirs is the surprise. Rows arrive in Day order, so leaving them
  // as they come would spoil it.
  const contributors = [...latestByName.values()]
    .sort((a, b) => b.at - a.at)
    .map((entry) => entry.contributor);

  return {
    slug: results[0].slug,
    year: results[0].year,
    isPublic: results[0].is_public === 1,
    variants: variantRows.map((row) => row.variant),
    days,
    contributors: selfFilled ? null : contributors,
  };
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

/**
 * The cached payload's address. Not a real URL; nothing ever fetches it. The
 * version segment changes whenever the payload's shape does, so a payload
 * cached under the old shape is never read back as the new one.
 */
const cacheKey = (slug: string) =>
  new Request(`https://calendar-payload.invalid/v6/${encodeURIComponent(slug)}`);

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
