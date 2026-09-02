import { getCloudflareContext } from '@opennextjs/cloudflare';
import { claimableDays, DAYS_IN_CALENDAR } from '@/app/advent/reveal';
import { purgeCalendarPayload } from './calendar-payload';

/**
 * Submission intake: what a Contributor sees at the Submit slug, the claim
 * itself, and editing a Submission afterwards.
 *
 * Two rules run through everything here.
 *
 * **No Contributor ever sees another's content.** Every read in this module
 * selects Day and credited name and nothing else — helping build the Calendar
 * must not spoil it. There is deliberately no query here that joins `tracks`
 * for anybody but the holder of a Submission's own edit token.
 *
 * **Claiming happens on submit.** The unique index on
 * `submissions (calendar_id, day)` decides who got the Day; this module inserts
 * and handles the constraint violation rather than looking first and inserting
 * after, because anything else has a gap between the two.
 */

/** Readable words, not single letters — a Contributor is emailed this. */
export const editPath = (editToken: string) => `/edit/${editToken}`;

/** Longest a credited name, a title or a link is allowed to be. */
const SHORT = 200;
const LINK = 500;
const PROSE = 2000;

export type Variant = { variant: string; label: string };

/** One Day of the grid: claimed by whom, if anyone, and whether it is still up for grabs. */
export type DayState = { day: number; claimedBy: string | null; claimable: boolean };

/** Everything the Submit slug's page renders. Carries no Track content at all. */
export type SubmitView = {
  calendarName: string;
  calendarSlug: string;
  submitSlug: string;
  days: DayState[];
  variants: Variant[];
};

/** One Contributor's typed answers, normalised but not yet claimed. */
export type SubmissionDraft = {
  creditedTo: string;
  link: string;
  email: string;
  tracks: Record<string, TrackDraft>;
};

export type TrackDraft = {
  url: string;
  title: string;
  artist: string;
  description: string;
  buyLink: string;
  /** The looked-up cover, and only ever that. An uploaded one is `cover_key`. */
  coverUrl: string;
};

async function db() {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

const text = (value: FormDataEntryValue | null, max: number) =>
  String(value ?? '')
    .trim()
    .slice(0, max);

/**
 * A link we are willing to render as an `href`, or null if it is not one.
 * http(s) only: a Contributor is anonymous and unverified, so a pasted
 * `javascript:` URL would otherwise become stored XSS on the Calendar. A
 * missing scheme is assumed to be https rather than rejected — people paste
 * `example.com/thing`.
 */
export function safeLink(raw: string): string | null {
  if (!raw) return '';
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? candidate.slice(0, LINK) : null;
  } catch {
    return null;
  }
}

/** Whatever they typed, trimmed and clamped. Rejects nothing — `draftProblem` does that. */
export function readDraft(formData: FormData, variants: Variant[]): SubmissionDraft {
  return {
    creditedTo: text(formData.get('credited_to'), SHORT),
    link: text(formData.get('link'), LINK),
    email: text(formData.get('email'), SHORT),
    tracks: Object.fromEntries(
      variants.map(({ variant }) => [
        variant,
        {
          url: text(formData.get(`${variant}.url`), LINK),
          title: text(formData.get(`${variant}.title`), SHORT),
          artist: text(formData.get(`${variant}.artist`), SHORT),
          description: text(formData.get(`${variant}.description`), PROSE),
          buyLink: text(formData.get(`${variant}.buy_link`), LINK),
          coverUrl: text(formData.get(`${variant}.cover_url`), LINK),
        },
      ]),
    ),
  };
}

/**
 * The one thing wrong with a draft, in words a Contributor can act on, or null.
 * Links are rewritten in place to the form that will be stored.
 *
 * An email address is optional throughout: submitting without one works, and
 * only a nonsensical one is refused.
 */
export function draftProblem(draft: SubmissionDraft, variants: Variant[]): string | null {
  if (!draft.creditedTo) return 'Tell us the name you want to be credited under.';
  if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) {
    return "That doesn't look like an email address. Leave it empty if you'd rather not give one.";
  }

  const link = safeLink(draft.link);
  if (link === null) return "That link to yourself doesn't look like a web address.";
  draft.link = link;

  for (const { variant, label } of variants) {
    const track = draft.tracks[variant];
    const which = label.toLowerCase();
    if (!track?.url) return `Give a link to the ${which} track.`;
    if (!track.title) return `Name the ${which} track.`;
    if (!track.artist) return `Say who made the ${which} track.`;
    if (!track.description) return `Say why you chose the ${which} track.`;
    const url = safeLink(track.url);
    if (url === null) return `The ${which} track's link doesn't look like a web address.`;
    track.url = url;
    const buyLink = safeLink(track.buyLink);
    if (buyLink === null) return `The ${which} track's buy link doesn't look like a web address.`;
    track.buyLink = buyLink;
    const coverUrl = safeLink(track.coverUrl);
    if (coverUrl === null) return `The ${which} track's cover image isn't a web address.`;
    track.coverUrl = coverUrl;
  }
  return null;
}

async function readVariants(calendarId: string): Promise<Variant[]> {
  const { results } = await (await db())
    .prepare('select variant, label from calendar_variants where calendar_id = ?1 order by position')
    .bind(calendarId)
    .all<Variant>();
  return results;
}

/**
 * What the Submit slug shows: which Days are free, which are claimed and by
 * whom, and which have already opened and so can never be claimed.
 *
 * Null for a Submit slug no Calendar has. The Submit slug is a secret, so an
 * unknown one is a 404 and says nothing more.
 */
export async function getSubmitView(submitSlug: string): Promise<SubmitView | null> {
  // Day and credited name only. Adding a Track column here is the whole of the
  // spoiler leak this ticket exists to avoid.
  const { results } = await (await db())
    .prepare(
      `select c.id, c.name, c.slug, c.year, s.day, s.credited_to
         from calendars c
         left join submissions s on s.calendar_id = c.id
        where c.submit_slug = ?1`,
    )
    .bind(submitSlug)
    .all<{
      id: string;
      name: string;
      slug: string;
      year: number;
      day: number | null;
      credited_to: string | null;
    }>();

  if (results.length === 0) return null;

  const calendar = results[0];
  const claimable = new Set(claimableDays(calendar.year, new Date()));
  const claimedBy = new Map(
    results.filter((row) => row.day !== null).map((row) => [row.day, row.credited_to ?? '']),
  );

  return {
    calendarName: calendar.name,
    calendarSlug: calendar.slug,
    submitSlug,
    variants: await readVariants(calendar.id),
    days: Array.from({ length: DAYS_IN_CALENDAR }, (_, i) => ({
      day: i + 1,
      claimedBy: claimedBy.get(i + 1) ?? null,
      claimable: claimable.has(i + 1),
    })),
  };
}

/** A losing insert is a unique-constraint failure on `(calendar_id, day)`. */
function isDayTaken(error: unknown) {
  const cause = (error as { cause?: unknown })?.cause;
  return [error, cause]
    .map((e) => (e instanceof Error ? e.message : ''))
    .some((message) => /unique constraint failed/i.test(message));
}

function trackUpsert(
  database: D1Database,
  submissionId: string,
  variant: string,
  track: TrackDraft,
) {
  // `cover_url` is the looked-up cover and is written from the form, because a
  // Contributor can edit or clear it like any other field. `cover_key` — the
  // uploaded image, ticket 12's — is never named here, so an edit cannot wipe
  // an upload it knows nothing about.
  return database
    .prepare(
      `insert into tracks (submission_id, variant, url, title, artist, description, buy_link, cover_url)
       values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
       on conflict (submission_id, variant) do update set
         url = excluded.url, title = excluded.title, artist = excluded.artist,
         description = excluded.description, buy_link = excluded.buy_link,
         cover_url = excluded.cover_url`,
    )
    .bind(
      submissionId,
      variant,
      track.url,
      track.title,
      track.artist,
      track.description,
      track.buyLink,
      track.coverUrl || null,
    );
}

export type ClaimResult =
  | { editToken: string; calendarSlug: string }
  | 'not-found'
  | 'not-claimable'
  | 'taken';

/**
 * Claims a Day and stores the Tracks, in one transaction, first come first
 * served. `'taken'` means somebody else's Submission landed first and nothing
 * at all was written — the caller hands the Contributor their draft back.
 */
export async function createSubmission(
  submitSlug: string,
  day: number,
  draft: SubmissionDraft,
): Promise<ClaimResult> {
  const database = await db();
  const calendar = await database
    .prepare('select id, slug, year from calendars where submit_slug = ?1')
    .bind(submitSlug)
    .first<{ id: string; slug: string; year: number }>();
  if (!calendar) return 'not-found';

  // A Day that has revealed can never be claimed, whatever the form posted.
  if (!claimableDays(calendar.year, new Date()).includes(day)) return 'not-claimable';

  const id = crypto.randomUUID().replaceAll('-', '');
  const editToken = crypto.randomUUID().replaceAll('-', '');
  const variants = await readVariants(calendar.id);

  try {
    await database.batch([
      database
        .prepare(
          `insert into submissions (id, calendar_id, day, credited_to, link, email, edit_token, created_at)
           values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
        )
        .bind(id, calendar.id, day, draft.creditedTo, draft.link, draft.email, editToken, Date.now()),
      ...variants.map(({ variant }) =>
        trackUpsert(database, id, variant, draft.tracks[variant] ?? emptyTrack()),
      ),
    ]);
  } catch (error) {
    if (isDayTaken(error)) return 'taken';
    throw error;
  }

  await purgeCalendarPayload(calendar.slug);
  return { editToken, calendarSlug: calendar.slug };
}

/** A Track nobody has filled in yet: what a missing row reads as. */
const emptyTrack = (): TrackDraft => ({
  url: '',
  title: '',
  artist: '',
  description: '',
  buyLink: '',
  coverUrl: '',
});

export type OwnSubmission = {
  day: number;
  calendarName: string;
  calendarSlug: string;
  variants: Variant[];
  draft: SubmissionDraft;
};

/**
 * The Submission the edit token belongs to, and only that one. Holding the
 * token is the whole of a Contributor's authority: there is no account, so the
 * token is looked up directly and everything returned hangs off the row it
 * found.
 */
export async function getSubmission(editToken: string): Promise<OwnSubmission | null> {
  const database = await db();
  const submission = await database
    .prepare(
      `select s.id, s.calendar_id, s.day, s.credited_to, s.link, s.email,
              c.name as calendar_name, c.slug as calendar_slug
         from submissions s join calendars c on c.id = s.calendar_id
        where s.edit_token = ?1`,
    )
    .bind(editToken)
    .first<{
      id: string;
      calendar_id: string;
      day: number;
      credited_to: string;
      link: string;
      email: string;
      calendar_name: string;
      calendar_slug: string;
    }>();
  if (!submission) return null;

  const [variants, { results: tracks }] = await Promise.all([
    readVariants(submission.calendar_id),
    database
      .prepare(
        `select variant, url, title, artist, description, buy_link, cover_url
           from tracks where submission_id = ?1`,
      )
      .bind(submission.id)
      .all<{
        variant: string;
        url: string;
        title: string;
        artist: string;
        description: string;
        buy_link: string;
        cover_url: string | null;
      }>(),
  ]);

  return {
    day: submission.day,
    calendarName: submission.calendar_name,
    calendarSlug: submission.calendar_slug,
    variants,
    draft: {
      creditedTo: submission.credited_to,
      link: submission.link,
      email: submission.email,
      tracks: Object.fromEntries(
        variants.map(({ variant }) => {
          const track = tracks.find((row) => row.variant === variant);
          return [
            variant,
            track
              ? {
                  url: track.url,
                  title: track.title,
                  artist: track.artist,
                  description: track.description,
                  buyLink: track.buy_link,
                  coverUrl: track.cover_url ?? '',
                }
              : emptyTrack(),
          ];
        }),
      ),
    },
  };
}

/**
 * Saves changes to the Submission the token names. The Day and the Calendar are
 * not editable: changing the Day would be a second claim, which is a new
 * Submission and not an edit.
 */
export async function updateSubmission(
  editToken: string,
  draft: SubmissionDraft,
): Promise<{ calendarSlug: string } | null> {
  const database = await db();
  const submission = await database
    .prepare(
      `select s.id, c.slug as calendar_slug from submissions s
         join calendars c on c.id = s.calendar_id
        where s.edit_token = ?1`,
    )
    .bind(editToken)
    .first<{ id: string; calendar_slug: string }>();
  if (!submission) return null;

  const variants = Object.keys(draft.tracks);
  await database.batch([
    database
      .prepare('update submissions set credited_to = ?2, link = ?3, email = ?4 where id = ?1')
      .bind(submission.id, draft.creditedTo, draft.link, draft.email),
    ...variants.map((variant) =>
      trackUpsert(database, submission.id, variant, draft.tracks[variant]),
    ),
  ]);

  await purgeCalendarPayload(submission.calendar_slug);
  return { calendarSlug: submission.calendar_slug };
}
