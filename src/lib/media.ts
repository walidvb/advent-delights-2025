import { getCloudflareContext } from '@opennextjs/cloudflare';
import { detectProvider, normalizeUrl, parseUrl } from '@cucu/media/core';
import { readMedia, resolveBandcampStream } from '@cucu/media/client';
import { purgeCalendarPayload } from './calendar-payload';
import type { TrackDraft, Variant } from './submissions';

/**
 * Where a Track's music comes from, server side: the lookup that prefills the
 * form, what a submitted link is stored as, and fresh Bandcamp streams for the
 * Calendar when a stored one stops playing. This module is the part that knows
 * about D1 and Contributors.
 *
 * Bandcamp is the reason most of this exists. Its pages are not something a
 * player can load — the music is a signed stream read out of the release page —
 * so a Bandcamp Track stores which track of the release it is and the stream
 * last read for it. Every other source plays its own link and stores nothing
 * extra.
 *
 * **Links are read through the hosted `@cucu/media` API, never from here.**
 * Bandcamp answers requests from Cloudflare's network with a bot challenge
 * instead of the page, so the Worker can't read a release itself. The API runs
 * elsewhere, keeps Bandcamp requests spaced out, and caches what it read; it
 * never throws, and a failed call is an `unavailable` or `transient` outcome.
 */

async function db() {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
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

  const outcome = await readMedia(raw);
  if (outcome.kind === 'not-found') return { problem: RELEASE_GONE };
  if (outcome.kind === 'unplayable') return { problem: NOTHING_STREAMS };
  if (outcome.kind !== 'ok') return null;

  const { info } = outcome;
  const found = { title: info.title, artist: info.artist, coverUrl: info.artworkUrl ?? '' };
  if (!info.bandcamp) return found.title || found.artist || found.coverUrl ? found : null;

  const release = info.bandcamp;
  return {
    ...found,
    tracks: release.tracks.map((t) => ({
      id: t.trackId,
      title: t.title,
      // A compilation credits each track to its own artist.
      artist: t.artist ?? release.artist,
      playable: !!t.streamUrl,
    })),
    trackId: release.defaultTrackId ?? undefined,
  };
}

/**
 * Rewrites each Track's link to the form that is stored and played, and reads
 * a Bandcamp Track's stream off its release. Returns the one thing wrong, in
 * words a Contributor can act on, or null.
 *
 * The stream is read here, on the server, rather than carried over from the
 * lookup: the form is not a trust boundary, and a stream is a URL the Calendar
 * plays. A source that doesn't answer right now is not the Contributor's
 * problem — the Track is stored as typed, and a Bandcamp one without a stream
 * gets one the first time the Calendar plays it.
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

    const typedTrackId = track.providerTrackId;
    track.providerTrackId = '';
    track.streamUrl = '';
    track.url = normalizeUrl(track.url) ?? track.url;
    // Links from sources nobody reads (and the rest, when the API is down) are
    // stored as typed: the player plays more than we recognise.
    if (!detectProvider(track.url)) continue;

    const outcome = await readMedia(track.url);
    if (outcome.kind === 'not-found') return `The ${which} track: ${RELEASE_GONE}`;
    if (outcome.kind === 'unplayable') return `The ${which} track: ${NOTHING_STREAMS}`;
    if (outcome.kind !== 'ok') {
      if (detectProvider(track.url) === 'bandcamp') track.providerTrackId = typedTrackId;
      continue;
    }

    // Canonical, with a SoundCloud app share expanded to the track page it
    // points at — the player can't load the short link.
    const { info } = outcome;
    track.url = info.url;
    if (!info.bandcamp) continue;

    const release = info.bandcamp;
    const picked =
      release.tracks.find((t) => t.trackId === typedTrackId && t.streamUrl) ??
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
 * null. At most one read per Track every ten minutes — this is reachable by
 * anyone holding a Slug.
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
    const outcome = await resolveBandcampStream(track.url, trackId);
    if (outcome.kind === 'busy' || outcome.kind === 'transient') return null;
    streamUrl = outcome.kind === 'ok' ? outcome.streamUrl : null;
  } else {
    const outcome = await readMedia(track.url);
    if (outcome.kind === 'busy' || outcome.kind === 'unavailable') return null;
    if (outcome.kind === 'ok' && outcome.info.bandcamp) {
      const release = outcome.info.bandcamp;
      trackId = release.defaultTrackId;
      streamUrl = release.tracks.find((t) => t.trackId === trackId)?.streamUrl ?? null;
    }
  }

  // A pulled release is recorded too, so it isn't re-read on every play.
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
