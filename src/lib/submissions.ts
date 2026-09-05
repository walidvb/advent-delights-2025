import { getCloudflareContext } from '@opennextjs/cloudflare';
import { claimableDays, DAYS_IN_CALENDAR, isArchived, revealedDayCount } from '@/app/advent/reveal';
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
 *
 * **The Day is dealt, not chosen.** A Contributor never sees which Days are
 * free, only how full the Calendar is. `createSubmission` picks a random
 * still-claimable Day itself, at the moment of insert — reserving one earlier,
 * when the claim form is first opened, would let an abandoned form squat a Day
 * forever with nothing behind it.
 */

/** Readable words, not single letters — a Contributor is emailed this. */
export const editPath = (editToken: string) => `/edit/${editToken}`;

/** Longest a credited name, a title or a link is allowed to be. */
const SHORT = 200;
const LINK = 500;
const PROSE = 2000;

export type Variant = { variant: string; label: string };

/**
 * Everything the Submit slug's page renders. Carries no Track content, and no
 * Day identity either — a Contributor is dealt a Day, never shown one to pick,
 * so all this reports is how full the deck is.
 */
export type SubmitView = {
  calendarName: string;
  calendarSlug: string;
  submitSlug: string;
  variants: Variant[];
  totalDays: number;
  /** Submissions that exist, whether or not their Day has since revealed. */
  claimedCount: number;
  /** Days nobody has claimed and that have not yet revealed — what a deal can still land on. */
  claimableCount: number;
  /** Days that have opened for good and can never be dealt again. */
  revealedCount: number;
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
  /** The looked-up cover: a URL on somebody else's host. */
  coverUrl: string;
  /**
   * The uploaded cover's object key, empty for none. Carried as a form field
   * like every other answer, so it survives a lost race the same way — the
   * image is already in the bucket by the time the form is submitted, and this
   * is only the note of where it went.
   */
  coverKey: string;
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
          // Deliberately unchecked. A forged key can only point a Contributor's
          // own Day at another cover — every object under `/cover/` is public to
          // anyone holding a Slug — or at nothing, giving them a broken tile
          // rather than the fallback, which is their own doing and their own
          // edit link to fix. `coverPath` encodes it a segment at a time, so it
          // cannot escape the route or become markup. Requiring the `uploads/`
          // prefix was the alternative and was rejected: it would silently wipe
          // the seeded `covers/…` keys the moment one of those is ever edited.
          coverKey: text(formData.get(`${variant}.cover_key`), SHORT),
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
 * What the Submit slug shows: how full the Calendar is. Never which Days —
 * a Contributor is dealt one, not shown the deck.
 *
 * Null for a Submit slug no Calendar has. The Submit slug is a secret, so an
 * unknown one is a 404 and says nothing more.
 */
export async function getSubmitView(submitSlug: string): Promise<SubmitView | null> {
  const calendar = await (await db())
    .prepare('select id, name, slug, year from calendars where submit_slug = ?1')
    .bind(submitSlug)
    .first<{ id: string; name: string; slug: string; year: number }>();
  if (!calendar) return null;

  // Day only — never credited_to, and nothing from `tracks`. This page has no
  // use for who claimed what, only how many.
  const { results: claimed } = await (await db())
    .prepare('select day from submissions where calendar_id = ?1')
    .bind(calendar.id)
    .all<{ day: number }>();
  const claimedDays = new Set(claimed.map((row) => row.day));
  const claimable = claimableDays(calendar.year, new Date());

  return {
    calendarName: calendar.name,
    calendarSlug: calendar.slug,
    submitSlug,
    variants: await readVariants(calendar.id),
    totalDays: DAYS_IN_CALENDAR,
    claimedCount: claimedDays.size,
    claimableCount: claimable.filter((day) => !claimedDays.has(day)).length,
    revealedCount: revealedDayCount(calendar.year, new Date()),
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
  // Both covers are written from the form, and the form carries both: the
  // looked-up URL as a field a Contributor can edit, the uploaded key as a
  // hidden one they set by uploading and clear by removing. The form is
  // therefore the whole truth about a Track's cover — which is what makes
  // removing an upload fall back to the looked-up image rather than to nothing.
  // The two are stored side by side and never overwrite each other;
  // `coverImage` decides which one is shown.
  return database
    .prepare(
      `insert into tracks (submission_id, variant, url, title, artist, description, buy_link, cover_url, cover_key)
       values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
       on conflict (submission_id, variant) do update set
         url = excluded.url, title = excluded.title, artist = excluded.artist,
         description = excluded.description, buy_link = excluded.buy_link,
         cover_url = excluded.cover_url, cover_key = excluded.cover_key`,
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
      track.coverKey || null,
    );
}

export type ClaimResult =
  | { editToken: string; calendarSlug: string }
  | 'not-found'
  | 'full'
  | 'taken';

/** How many random deals to try before admitting the deck is effectively full. */
const DEAL_ATTEMPTS = 8;

/**
 * A Day nobody has claimed yet and that has not revealed, or null once there
 * is nothing left to deal. Read fresh on every attempt: a Day another
 * Contributor just took is not offered a second time within the same call.
 */
async function dealADay(
  database: D1Database,
  calendarId: string,
  year: number,
): Promise<number | null> {
  const claimable = claimableDays(year, new Date());
  if (claimable.length === 0) return null;

  const { results } = await database
    .prepare('select day from submissions where calendar_id = ?1')
    .bind(calendarId)
    .all<{ day: number }>();
  const taken = new Set(results.map((row) => row.day));
  const free = claimable.filter((day) => !taken.has(day));
  if (free.length === 0) return null;

  return free[Math.floor(Math.random() * free.length)];
}

/**
 * Deals a Day and stores the Tracks, in one transaction, first come first
 * served against whoever else is dealt the same one. `'taken'` on the last
 * attempt means the deck emptied out from under a very unlucky run of
 * collisions — indistinguishable from `'full'` to the Contributor, who is told
 * the same thing either way and keeps everything they typed.
 */
export async function createSubmission(
  submitSlug: string,
  draft: SubmissionDraft,
): Promise<ClaimResult> {
  const database = await db();
  const calendar = await database
    .prepare('select id, slug, year from calendars where submit_slug = ?1')
    .bind(submitSlug)
    .first<{ id: string; slug: string; year: number }>();
  if (!calendar) return 'not-found';

  const variants = await readVariants(calendar.id);

  for (let attempt = 0; attempt < DEAL_ATTEMPTS; attempt++) {
    const day = await dealADay(database, calendar.id, calendar.year);
    if (day === null) return 'full';

    const id = crypto.randomUUID().replaceAll('-', '');
    const editToken = crypto.randomUUID().replaceAll('-', '');

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
      if (isDayTaken(error)) continue;
      throw error;
    }

    await purgeCalendarPayload(calendar.slug);
    return { editToken, calendarSlug: calendar.slug };
  }

  return 'taken';
}

/** A Track nobody has filled in yet: what a missing row reads as. */
const emptyTrack = (): TrackDraft => ({
  url: '',
  title: '',
  artist: '',
  description: '',
  buyLink: '',
  coverUrl: '',
  coverKey: '',
});

export type OwnSubmission = {
  day: number;
  calendarName: string;
  calendarSlug: string;
  variants: Variant[];
  draft: SubmissionDraft;
  /** An Archive is a permanent record: readable here, not editable. */
  archived: boolean;
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
              c.name as calendar_name, c.slug as calendar_slug, c.year as calendar_year
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
      calendar_year: number;
    }>();
  if (!submission) return null;

  const [variants, { results: tracks }] = await Promise.all([
    readVariants(submission.calendar_id),
    database
      .prepare(
        `select variant, url, title, artist, description, buy_link, cover_url, cover_key
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
        cover_key: string | null;
      }>(),
  ]);

  return {
    day: submission.day,
    calendarName: submission.calendar_name,
    calendarSlug: submission.calendar_slug,
    variants,
    archived: isArchived(submission.calendar_year, new Date()),
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
                  coverKey: track.cover_key ?? '',
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
 *
 * `'archived'` means the Calendar's December is over. An Archive is a permanent
 * record, so a still-valid edit token stops being a licence to rewrite it — and
 * the refusal lives here, in front of the only write, rather than in the page
 * that hides the form. Posting the action directly hits this.
 */
export async function updateSubmission(
  editToken: string,
  draft: SubmissionDraft,
): Promise<{ calendarSlug: string } | 'archived' | null> {
  const database = await db();
  const submission = await database
    .prepare(
      `select s.id, c.slug as calendar_slug, c.year as calendar_year from submissions s
         join calendars c on c.id = s.calendar_id
        where s.edit_token = ?1`,
    )
    .bind(editToken)
    .first<{ id: string; calendar_slug: string; calendar_year: number }>();
  if (!submission) return null;
  if (isArchived(submission.calendar_year, new Date())) return 'archived';

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
