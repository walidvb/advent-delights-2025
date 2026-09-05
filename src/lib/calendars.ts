import { getCloudflareContext } from '@opennextjs/cloudflare';
import { purgeCalendarPayload } from './calendar-payload';

/**
 * Calendar management: create, list and configure a Curator's Calendars.
 *
 * Every read and write here is scoped by `curator_id`, so a Curator can neither
 * see nor edit a Calendar they do not own — there is no unscoped lookup by id
 * in this module to reach for by accident.
 */

/** The Slug a write settled on, and whether the one asked for was already taken. */
export type ChosenSlug = { slug: string; taken: boolean };

export type Calendar = {
  id: string;
  name: string;
  description: string;
  year: number;
  slug: string;
  submit_slug: string;
  is_public: number;
};

/** A Calendar plus how many Days have a Submission, for the list's dot-grid. */
export type CalendarWithCount = Calendar & { claimedCount: number };

/**
 * The interface supports exactly these two, with its copy frozen; the labels
 * are stored per Calendar but unused for now.
 */
const VARIANTS = [
  { variant: 'light', label: 'Light' },
  { variant: 'heavy', label: 'Heavy' },
];

/** Longest a derived Slug gets before a numeric suffix is even considered. */
const MAX_SLUG_LENGTH = 60;

/**
 * The Submit slug's own small vocabulary — musical, so `mellow-tempo` reads as
 * belonging here rather than as a password. Picked from the codebase's own
 * domain, not a general-purpose word list: no library does "musical" for you,
 * and two short arrays are the whole of what a trivial one would buy.
 */
const SUBMIT_ADJECTIVES = [
  'mellow', 'moody', 'dreamy', 'groovy', 'hazy', 'velvet', 'electric', 'acoustic',
  'analog', 'muted', 'distant', 'golden', 'midnight', 'vintage', 'cosmic', 'lofi',
  'humming', 'echoing', 'faded', 'silver', 'amber', 'sonic', 'tender', 'wistful',
  'restless', 'gentle', 'wandering', 'glowing', 'hollow', 'hushed', 'radiant',
  'tangled', 'drifting', 'smoky', 'quiet', 'tidal', 'warped', 'crimson', 'azure',
  'looping', 'staticky', 'dusty', 'shimmering', 'brassy', 'wintry',
];
const SUBMIT_NOUNS = [
  'tempo', 'chorus', 'cassette', 'vinyl', 'reverb', 'echo', 'melody', 'rhythm',
  'harmony', 'cadence', 'refrain', 'bassline', 'groove', 'riff', 'bridge', 'verse',
  'hook', 'drone', 'static', 'hum', 'tremolo', 'feedback', 'mixtape', 'playlist',
  'encore', 'crescendo', 'coda', 'sonata', 'ballad', 'anthem', 'lullaby', 'waltz',
  'sample', 'remix', 'session', 'jukebox', 'turntable', 'speaker', 'amplifier',
  'interlude', 'fadeout', 'downbeat', 'overtone',
];

const pick = (words: string[]) => words[Math.floor(Math.random() * words.length)];

/** Two musical words, e.g. `mellow-tempo` — readable, but still the secret half. */
function submitSlugCandidate() {
  return `${pick(SUBMIT_ADJECTIVES)}-${pick(SUBMIT_NOUNS)}`;
}

/**
 * A submit_slug nothing else already holds. Collisions are for real here, not
 * theoretical — this vocabulary is small on purpose, so a plain random pick can
 * repeat far sooner than 122 random bits ever would. A numeral is appended
 * after a run of bad luck rather than trying forever.
 */
async function freeSubmitSlug(): Promise<string> {
  const database = await db();
  for (let attempt = 1; attempt <= 20; attempt++) {
    const candidate = attempt <= 15 ? submitSlugCandidate() : `${submitSlugCandidate()}-${attempt}`;
    const taken = await database
      .prepare('select 1 from calendars where submit_slug = ?1')
      .bind(candidate)
      .first();
    if (!taken) return candidate;
  }
  // Bounded above only to guarantee this returns; a Calendar can be created
  // without ever actually exhausting a few-thousand-word space.
  return `${submitSlugCandidate()}-${crypto.randomUUID().slice(0, 4)}`;
}

/** Readable words, not single letters — the Slug is shared with humans. */
export const calendarPath = (slug: string) => `/calendar/${slug}`;
export const submitPath = (submitSlug: string) => `/submit/${submitSlug}`;

async function db() {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

/**
 * A readable address from whatever was typed: accents folded, everything else
 * collapsed to single hyphens. Never empty, so a name of pure punctuation still
 * gets an address.
 */
export function slugify(raw: string) {
  const slug = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/^-+|-+$/g, '');
  return slug || 'calendar';
}

/**
 * `base`, or `base-2`, `base-3`… — a taken Slug gets a suffix rather than a
 * rejection. `exceptId` lets a Calendar keep the Slug it already holds.
 *
 * `taken` says whether the base had to be given up, so the Curator can be told
 * they got a variation rather than left to notice it.
 *
 * ponytail: checks candidates one query at a time, and a Slug taken between the
 * check and the insert would fail on the unique constraint. Communities are not
 * created concurrently in the thousands; retry the insert if that ever changes.
 */
async function freeSlug(base: string, exceptId: string | null): Promise<ChosenSlug> {
  const database = await db();
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const taken = await database
      .prepare('select 1 from calendars where slug = ?1 and id is not ?2')
      .bind(candidate, exceptId)
      .first();
    if (!taken) return { slug: candidate, taken: n > 1 };
  }
}

/**
 * Creates a Calendar for the current year and returns the Slug it got, or
 * `'name'` if there was no name to derive an address from.
 *
 * The Submit slug is two musical words, generated here and never derived from
 * the name — it is the secret half of the pair, just a readable one now
 * rather than a hex blob.
 */
export async function createCalendar(
  curatorId: string,
  rawName: string,
  rawDescription: string,
): Promise<ChosenSlug | 'name'> {
  const name = rawName.trim();
  if (!name) return 'name';

  const id = crypto.randomUUID();
  const [slug, submitSlug] = await Promise.all([freeSlug(slugify(name), null), freeSubmitSlug()]);
  const database = await db();

  await database.batch([
    database
      .prepare(
        `insert into calendars (id, curator_id, name, description, year, slug, submit_slug, created_at)
         values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
      )
      .bind(
        id,
        curatorId,
        name,
        rawDescription.trim(),
        new Date().getFullYear(),
        slug.slug,
        submitSlug,
        Date.now(),
      ),
    ...VARIANTS.map((v, position) =>
      database
        .prepare('insert into calendar_variants (calendar_id, variant, label, position) values (?1, ?2, ?3, ?4)')
        .bind(id, v.variant, v.label, position),
    ),
  ]);

  return slug;
}

export async function listCalendars(curatorId: string): Promise<CalendarWithCount[]> {
  const { results } = await (await db())
    .prepare(
      `select c.id, c.name, c.description, c.year, c.slug, c.submit_slug, c.is_public,
              count(s.id) as claimedCount
         from calendars c
         left join submissions s on s.calendar_id = c.id
        where c.curator_id = ?1
        group by c.id
        order by c.created_at`,
    )
    .bind(curatorId)
    .all<CalendarWithCount>();
  return results;
}

/** The Calendar, or null if it does not exist or is somebody else's. */
export async function getOwnedCalendar(id: string, curatorId: string) {
  return await (await db())
    .prepare(
      `select id, name, description, year, slug, submit_slug, is_public
         from calendars where id = ?1 and curator_id = ?2`,
    )
    .bind(id, curatorId)
    .first<Calendar>();
}

/**
 * Saves the editable fields of a Calendar the Curator owns. The Slug is put
 * through the same derivation and the same collision handling as at creation,
 * so an edited Slug is readable too and an already-taken one gets a suffix.
 * An emptied Slug falls back to the (possibly new) name.
 *
 * Returns the Slug it settled on, or null when the Calendar is not theirs — in
 * which case nothing is written.
 */
export async function updateCalendar(
  id: string,
  curatorId: string,
  fields: { name: string; description: string; slug: string; isPublic: boolean },
): Promise<ChosenSlug | null> {
  const existing = await getOwnedCalendar(id, curatorId);
  if (!existing) return null;

  const name = fields.name.trim() || existing.name;
  const slug = await freeSlug(slugify(fields.slug.trim() || name), id);

  await (await db())
    .prepare(
      `update calendars set name = ?3, description = ?4, slug = ?5, is_public = ?6
         where id = ?1 and curator_id = ?2`,
    )
    .bind(id, curatorId, name, fields.description.trim(), slug.slug, fields.isPublic ? 1 : 0)
    .run();

  // The Calendar has been written to, so its cached payload is stale. Both
  // Slugs are purged because an edited Slug leaves the old one cached.
  await purgeCalendarPayload(existing.slug);
  if (slug.slug !== existing.slug) await purgeCalendarPayload(slug.slug);

  return slug;
}
