/**
 * Track metadata lookup: given a Track's URL, a guess at its title, artist and
 * artwork.
 *
 * Everything here is a *suggestion*. A Contributor's typing is the source of
 * truth — what gets stored is whatever is in the form when they submit, and a
 * lookup that fails, times out or has never heard of the source is a normal
 * outcome that leaves the form exactly as usable as it was. Nothing in this
 * module throws.
 *
 * Lookup goes through oEmbed, which YouTube and SoundCloud both publish with no
 * key, no quota and no signup. (The old CSV reader used noembed.com as a
 * one-endpoint-for-everything proxy; it is still up but now answers YouTube
 * with a Perl stack trace and SoundCloud with a 404, so it is gone.) Asking the
 * source itself is one fetch either way and has nobody in the middle to rot.
 *
 * Adding a source is meant to be a pure addition: an oEmbed provider is a line
 * in `OEMBED`, and a source with no oEmbed at all — Bandcamp is the one people
 * ask for, and is deliberately out of scope — is a `lookup` of its own picked
 * up by `sourceFor`, returning the same shape. No caller changes either way.
 */

/** What a lookup can offer. Any field may be empty; the Contributor fills the rest. */
export type TrackMetadata = { title: string; artist: string; coverUrl: string };

/** Sources that publish oEmbed, by the host they answer for. */
const OEMBED: Record<string, string> = {
  'youtube.com': 'https://www.youtube.com/oembed',
  'youtu.be': 'https://www.youtube.com/oembed',
  'soundcloud.com': 'https://soundcloud.com/oembed',
};

/** `www.` and `music.` are the same site for our purposes. */
const site = (host: string) => host.replace(/^(www|m|music|on)\./, '');

/** How long a Contributor waits before we give up and let them type it themselves. */
const TIMEOUT_MS = 6000;

/** The lookup for a URL, or null if nothing here recognises it. */
function sourceFor(url: URL): (() => Promise<TrackMetadata | null>) | null {
  const endpoint = OEMBED[site(url.hostname)];
  return endpoint ? () => oembed(endpoint, url) : null;
}

/**
 * Title, artist and artwork for a Track URL, or null when the source is not one
 * we know or the lookup did not come back with anything usable.
 */
export async function lookupTrackMetadata(raw: string): Promise<TrackMetadata | null> {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const lookup = sourceFor(url);
  if (!lookup) return null;

  try {
    return await lookup();
  } catch {
    // Unreachable host, timeout, nonsense response: not an error a Contributor
    // needs to see. They type the three fields themselves, as they always could.
    return null;
  }
}

type OembedResponse = { title?: string; author_name?: string; thumbnail_url?: string };

async function oembed(endpoint: string, url: URL): Promise<TrackMetadata | null> {
  const response = await fetch(
    `${endpoint}?format=json&url=${encodeURIComponent(url.toString())}`,
    { signal: AbortSignal.timeout(TIMEOUT_MS) },
  );
  // A private, deleted or mistyped link is a 401/403/404 here. Nothing to say.
  if (!response.ok) return null;

  const data = (await response.json()) as OembedResponse;
  const metadata = split(data);
  return metadata.title || metadata.artist || metadata.coverUrl ? metadata : null;
}

/**
 * oEmbed has no "artist" — it has the title the uploader typed and the account
 * that uploaded it, so the artist has to be read out of the title.
 *
 * SoundCloud writes "Awake by Tycho" and YouTube uploaders write
 * "Rick Astley - Never Gonna Give You Up (Official Video)", where the channel is
 * often a label rather than the artist. Both conventions are guesses and both
 * are wrong sometimes — which is why every field this fills is editable.
 */
function split({ title = '', author_name = '', thumbnail_url = '' }: OembedResponse): TrackMetadata {
  const author = author_name.trim();
  const coverUrl = thumbnail_url.trim();
  let name = title.trim();
  let artist = author;

  const suffix = ` by ${author}`;
  if (author && name.toLowerCase().endsWith(suffix.toLowerCase())) {
    name = name.slice(0, -suffix.length).trim();
  } else {
    // Exactly one dash: "Artist - Track". Two or more and we are guessing wrong
    // as often as right, so leave it whole and let them cut it up.
    const parts = name.split(/\s+[-–—]\s+/);
    if (parts.length === 2 && parts[0] && parts[1]) {
      artist = parts[0].trim();
      name = parts[1].trim();
    }
  }

  return { title: name, artist, coverUrl };
}
