import { getCloudflareContext } from '@opennextjs/cloudflare';
import { detectProvider, normalizeUrl, parseUrl } from '@cucu/media/core';
import { expandShortLink, fetchRelease, readMedia, resolveBandcampStream } from '@cucu/media/server';
import { purgeCalendarPayload } from './calendar-payload';
import type { TrackDraft, Variant } from './submissions';

/**
 * Where a Track's music comes from, server side: the lookup that prefills the
 * form, what a submitted link is stored as, and fresh Bandcamp streams for the
 * Calendar when a stored one stops playing. The reading itself lives in
 * `@cucu/media`; this module is the part that knows about D1 and Contributors.
 *
 * Bandcamp is the reason most of this exists. Its pages are not something a
 * player can load — the music is a signed stream read out of the release page —
 * so a Bandcamp Track stores which track of the release it is and the stream
 * last read for it. Every other source plays its own link and stores nothing
 * extra.
 */

async function db() {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

/**
 * Claims `key` if no isolate has claimed it in the last `intervalMs`. One
 * statement: the upsert only updates, and only returns a row, when the previous
 * claim is old enough.
 */
async function claim(key: string, intervalMs: number): Promise<boolean> {
  const now = Date.now();
  const row = await (await db())
    .prepare(
      `insert into throttles (key, last_at) values (?1, ?2)
       on conflict (key) do update set last_at = excluded.last_at
       where throttles.last_at < ?2 - ?3
       returning key`,
    )
    .bind(key, now, intervalMs)
    .first();
  return row !== null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * At most one Bandcamp page fetch every two seconds, across the whole Worker.
 * Bandcamp starts failing requests spaced closer than that, and a flagged IP
 * range would break every Bandcamp Track at once. Waits up to six seconds for a
 * turn, then gives up — the caller treats that as Bandcamp being busy.
 */
async function bandcampThrottle(): Promise<boolean> {
  const deadline = Date.now() + 6000;
  for (;;) {
    if (await claim('bandcamp', 2000)) return true;
    const pause = 1000 + Math.random() * 250;
    if (Date.now() + pause > deadline) return false;
    await sleep(pause);
  }
}

/** One track of a Bandcamp release, as the form's picker offers it. */
export type ReleaseTrack = { id: string; title: string; artist: string; playable: boolean };

/**
 * What a lookup can offer the form. Any text field may be empty; the
 * Contributor fills the rest.
 */
export type TrackLookup =
  | {
      title: string;
      artist: string;
      coverUrl: string;
      /** Bandcamp only: the release's tracks, so an album link can be narrowed to one. */
      tracks?: ReleaseTrack[];
      /** Bandcamp only: the track Bandcamp's own page starts on. */
      trackId?: string;
    }
  /** A link we recognise but can't use, in words that say what to do instead. */
  | { problem: string };

/** A Bandcamp address that isn't a release page — an artist's front page, say. */
const isBandcampButNotRelease = (raw: string) =>
  !!parseUrl(raw)?.hostname.toLowerCase().endsWith('bandcamp.com') && !detectProvider(raw);

const NOT_A_RELEASE =
  "That's a Bandcamp page but not a release. Open the track or album itself and copy that link.";
const RELEASE_GONE = 'That Bandcamp release is gone. Link the track from somewhere else.';
const NOTHING_STREAMS =
  "Nothing on that Bandcamp release can be listened to without buying it, so the Calendar can't play it. Link the track from somewhere else.";

/**
 * Title, artist and artwork for a Track URL — and for Bandcamp, its tracklist.
 * Null means "nothing to suggest": an unrecognised source, an unreachable one
 * and a private link all look like that from here, and the Contributor types
 * the fields themselves. Never throws.
 */
export async function lookupTrack(raw: string): Promise<TrackLookup | null> {
  if (isBandcampButNotRelease(raw)) return { problem: NOT_A_RELEASE };

  const outcome = await readMedia(raw, { throttle: bandcampThrottle }).catch(() => null);
  if (!outcome) return null;
  if (outcome.kind === 'not-found') return { problem: RELEASE_GONE };
  if (outcome.kind === 'unplayable') return { problem: NOTHING_STREAMS };
  if (outcome.kind !== 'ok') return null;

  const { info } = outcome;
  const found = { title: info.title, artist: info.artist, coverUrl: info.artworkUrl ?? '' };
  if (!info.bandcamp) return found.title || found.artist || found.coverUrl ? found : null;

  return {
    ...found,
    tracks: info.bandcamp.tracks.map((t) => ({
      id: t.trackId,
      title: t.title,
      // A compilation credits each track to its own artist.
      artist: t.artist ?? info.bandcamp!.artist,
      playable: !!t.streamUrl,
    })),
    trackId: info.bandcamp.defaultTrackId ?? undefined,
  };
}

/**
 * Rewrites each Track's link to the form that is stored and played, and reads
 * a Bandcamp Track's stream off its release. Returns the one thing wrong, in
 * words a Contributor can act on, or null.
 *
 * The stream is read here, on the server, rather than carried over from the
 * lookup: the form is not a trust boundary, and a stream is a URL the Calendar
 * plays. A Bandcamp that doesn't answer right now is not the Contributor's
 * problem — the Track is stored without a stream and the Calendar asks for one
 * the first time it is played.
 */
export async function resolveTracks(
  tracks: Record<string, TrackDraft>,
  variants: Variant[],
): Promise<string | null> {
  for (const { variant, label } of variants) {
    const track = tracks[variant];
    if (!track) continue;
    const which = label.toLowerCase();

    if (isBandcampButNotRelease(track.url)) return `The ${which} track: ${NOT_A_RELEASE}`;
    // A SoundCloud app share is a short link the player can't load; store the
    // track page it points at. A short link that doesn't answer stays as typed.
    const expanded = (await expandShortLink(track.url).catch(() => null)) ?? track.url;
    track.url = normalizeUrl(expanded) ?? track.url;

    if (detectProvider(track.url) !== 'bandcamp') {
      track.providerTrackId = '';
      track.streamUrl = '';
      continue;
    }

    const outcome = await fetchRelease(track.url, { throttle: bandcampThrottle });
    if (outcome.kind === 'not-found') return `The ${which} track: ${RELEASE_GONE}`;
    if (outcome.kind === 'no-tracklist') return `The ${which} track: ${NOTHING_STREAMS}`;
    if (outcome.kind !== 'ok') {
      track.streamUrl = '';
      continue;
    }

    const { release } = outcome;
    const picked =
      release.tracks.find((t) => t.trackId === track.providerTrackId && t.streamUrl) ??
      release.tracks.find((t) => t.trackId === release.defaultTrackId);
    if (!picked?.streamUrl) return `The ${which} track: ${NOTHING_STREAMS}`;
    // The track's own page, not the album it was picked off: a link that
    // names this one piece of music wherever it is opened.
    track.url = picked.url ?? track.url;
    track.providerTrackId = picked.trackId;
    track.streamUrl = picked.streamUrl;
  }
  return null;
}

/** A refreshed stream is good for weeks; inside this window, hand back the one we have. */
const REFRESH_COOLDOWN_MS = 10 * 60 * 1000;

/**
 * A fresh stream for a Bandcamp Track whose stored one stopped playing, or
 * null. At most one page fetch per Track every ten minutes, and through the
 * throttle — this is reachable by anyone holding a Slug.
 *
 * A Track stored without a track id (an old row, or one saved while Bandcamp
 * wasn't answering) gets the one Bandcamp's own page starts on, and keeps it.
 */
export async function refreshStream(slug: string, day: number, variant: string): Promise<string | null> {
  const database = await db();
  const track = await database
    .prepare(
      `select t.submission_id, t.url, t.provider_track_id, t.stream_url, t.stream_refreshed_at
         from tracks t
         join submissions s on s.id = t.submission_id
         join calendars c on c.id = s.calendar_id
        where c.slug = ?1 and s.day = ?2 and t.variant = ?3`,
    )
    .bind(slug, day, variant)
    .first<{
      submission_id: string;
      url: string;
      provider_track_id: string | null;
      stream_url: string | null;
      stream_refreshed_at: number | null;
    }>();
  if (!track || detectProvider(track.url) !== 'bandcamp') return null;
  if (track.stream_refreshed_at && Date.now() - track.stream_refreshed_at < REFRESH_COOLDOWN_MS) {
    return track.stream_url;
  }

  let trackId = track.provider_track_id;
  let streamUrl: string | null = null;
  if (trackId) {
    const outcome = await resolveBandcampStream(track.url, trackId, { throttle: bandcampThrottle });
    if (outcome.kind === 'busy' || outcome.kind === 'transient') return null;
    streamUrl = outcome.kind === 'ok' ? outcome.streamUrl : null;
  } else {
    const outcome = await fetchRelease(track.url, { throttle: bandcampThrottle });
    if (outcome.kind === 'busy' || outcome.kind === 'transient') return null;
    if (outcome.kind === 'ok') {
      const { release } = outcome;
      trackId = release.defaultTrackId;
      streamUrl = release.tracks.find((t) => t.trackId === trackId)?.streamUrl ?? null;
    }
  }

  // A pulled release is recorded too, so it isn't re-fetched on every play.
  await database
    .prepare(
      `update tracks set provider_track_id = ?3, stream_url = ?4, stream_refreshed_at = ?5
        where submission_id = ?1 and variant = ?2`,
    )
    .bind(track.submission_id, variant, trackId, streamUrl, Date.now())
    .run();
  await purgeCalendarPayload(slug);
  return streamUrl;
}
