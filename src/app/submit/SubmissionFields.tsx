'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Check, Pencil } from 'lucide-react';
import { lookupTrackAction, uploadCoverAction } from './actions';
import { TrackPreview } from './TrackPreview';
import { COVER_TYPES, coverPath, coverProblem, resizeCover } from '@/lib/covers';
import type { ReleaseTrack } from '@/lib/media';
import type { SubmissionDraft, TrackDraft, Variant } from '@/lib/submissions';

/**
 * The fields of a Submission: who to credit, and one Track per Variant.
 *
 * Shared by the claim form and the edit form, which ask for exactly the same
 * things — the only difference between them is that one of them also picks a
 * Day.
 *
 * Every value starts as what came back from the server: a Contributor who loses
 * the race to a Day gets this rendered again with what they typed, and nothing
 * is retyped. That includes anything the lookup filled in, which goes back and
 * forth through the draft like every other field.
 */

export const field =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring';
export const button =
  'rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60';

const optional = <span className="text-muted-foreground">(optional)</span>;

/** How long after the last keystroke we go and look the URL up. */
const SETTLE_MS = 600;

/**
 * Whichever secret this form already holds, shown to the upload endpoint so it
 * only ever stores images for a Calendar the uploader can actually submit to.
 */
export type UploadAuth = { submit_slug: string } | { edit_token: string };

/**
 * Who to credit: the name, an optional link to themselves, an optional email.
 * Its own component because the claim wizard shows it as a step on its own,
 * after both Tracks rather than before them — the edit page still shows it
 * first, alongside everything else, since there is no wizard once a Day is
 * already yours.
 */
export function ContributorFields({ draft }: { draft: SubmissionDraft }) {
  return (
    <>
      <label htmlFor="credited_to" className="text-sm">
        Name to credit you under
      </label>
      <input
        id="credited_to"
        name="credited_to"
        required
        maxLength={200}
        defaultValue={draft.creditedTo}
        placeholder="However this lot know you"
        className={field}
      />

      <label htmlFor="link" className="text-sm">
        A link to you {optional}
      </label>
      <input
        id="link"
        name="link"
        defaultValue={draft.link}
        placeholder="your-band.bandcamp.com"
        className={field}
      />

      <label htmlFor="email" className="text-sm">
        Your email address {optional}
      </label>
      <input
        id="email"
        name="email"
        type="email"
        defaultValue={draft.email}
        placeholder="you@example.com"
        className={field}
      />
      <p className="-mt-1 text-xs text-muted-foreground">
        Only ever used to send you your edit link, so you don&apos;t lose it. Leave it empty and
        you&apos;ll get the link on screen instead.
      </p>
    </>
  );
}

export function SubmissionFields({
  variants,
  draft,
  auth,
}: {
  variants: Variant[];
  draft: SubmissionDraft;
  auth: UploadAuth;
}) {
  return (
    <>
      <ContributorFields draft={draft} />
      {variants.map(({ variant, label }) => (
        // Absent for a Variant nobody has filled in yet, which is the blank form.
        <TrackFields
          key={variant}
          variant={variant}
          label={label}
          track={draft.tracks[variant]}
          auth={auth}
        />
      ))}
    </>
  );
}

/**
 * The four things a lookup can offer to fill in. A Contributor can overwrite
 * all but the artwork, which only ever comes from the lookup.
 */
type Prefillable = { url: string; title: string; artist: string; coverUrl: string };
type Suggestion = Omit<Prefillable, 'url'>;

/**
 * One Track. Paste a link and the title, artist and artwork try to fill
 * themselves in, sliding open at the bottom of the Track once they have a link
 * to come from.
 *
 * The prefill is a suggestion and never the source of truth: what gets saved is
 * whatever is in these inputs when the form is submitted. Nothing is ever
 * disabled and nothing waits on the network, so a slow lookup — or one that
 * never answers — costs a Contributor nothing but the typing they were going to
 * do anyway. A source we don't recognise is silent, because it is a perfectly
 * normal thing to paste and not a failure to report.
 */
export function TrackFields({
  variant,
  label,
  track,
  auth,
}: {
  variant: string;
  label: string;
  track: TrackDraft | undefined;
  auth: UploadAuth;
}) {
  const [values, setValues] = useState<Prefillable>({
    url: track?.url ?? '',
    title: track?.title ?? '',
    artist: track?.artist ?? '',
    coverUrl: track?.coverUrl ?? '',
  });
  /**
   * What the last lookup put in these fields. A value still equal to its
   * suggestion has not been touched, so a new link may replace it; anything
   * else is the Contributor's own words and is left alone.
   */
  const suggestion = useRef<Suggestion | null>(null);
  // The URL this form was rendered with is already accounted for — on the edit
  // form it has been looked up once, months ago, and answered.
  const settled = useRef(values.url.trim());
  const [looking, setLooking] = useState(false);
  /**
   * Whether the looked-up artwork is showing. It opens once there is a link
   * settled enough to look up, whatever the lookup then says, and stays open.
   */
  const [open, setOpen] = useState(values.url.trim() !== '');
  const hasNames = Boolean(values.title.trim() && values.artist.trim());
  /**
   * Whether the name and artist are inputs rather than text in the player.
   * Sticky once on: it switches itself on when the lookup leaves them to be
   * typed, and an input must not vanish the moment its first letter lands.
   */
  const [editing, setEditing] = useState(open && !hasNames);
  const [problem, setProblem] = useState('');
  /** Bandcamp only: the release's tracks, and which one this Track is. */
  const [release, setRelease] = useState<ReleaseTrack[]>([]);
  const [trackId, setTrackId] = useState(track?.providerTrackId ?? '');

  /** Fill what is empty or still the last suggestion; leave the Contributor's own words alone. */
  function suggest(found: Suggestion) {
    const previous = suggestion.current;
    suggestion.current = found;
    setValues((current) => {
      const fill = (key: keyof Suggestion) =>
        current[key] && current[key] !== previous?.[key] ? current[key] : found[key];
      // The artwork isn't the Contributor's to edit, so it always follows the link.
      return { ...current, title: fill('title'), artist: fill('artist'), coverUrl: found.coverUrl };
    });
  }

  useEffect(() => {
    const url = values.url.trim();
    if (!url || url === settled.current) return;

    let live = true;
    const timer = setTimeout(async () => {
      settled.current = url;
      setOpen(true);
      setLooking(true);
      const found = await lookupTrackAction(url).catch(() => null);
      if (!live) return;
      setLooking(false);
      setProblem(found && 'problem' in found ? found.problem : '');
      const tracks = found && 'tracks' in found ? (found.tracks ?? []) : [];
      setRelease(tracks);
      if (!found || 'problem' in found) {
        setEditing(true);
        return setTrackId('');
      }

      // Keep the stored track if this is still its release; otherwise whichever
      // one Bandcamp's own page starts on.
      const stored = track?.providerTrackId;
      const id = tracks.some((t) => t.id === stored && t.playable) ? stored! : (found.trackId ?? '');
      setTrackId(id);
      const picked = tracks.find((t) => t.id === id);
      const title = picked?.title ?? found.title;
      const artist = picked?.artist ?? found.artist;
      if (!title || !artist) setEditing(true);
      suggest({ ...found, title, artist });
    }, SETTLE_MS);

    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [values.url, track?.providerTrackId]);

  // The picked track's stream, or — on the edit form, before any lookup — the stored one.
  const previewStream =
    release.find((t) => t.id === trackId)?.streamUrl ??
    (trackId && trackId === track?.providerTrackId ? track.streamUrl || null : null);

  const set = (key: keyof Prefillable) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  function chooseTrack(id: string) {
    setTrackId(id);
    const picked = release.find((t) => t.id === id);
    if (picked && suggestion.current) {
      suggest({ ...suggestion.current, title: picked.title, artist: picked.artist });
    }
  }

  /**
   * The uploaded cover: the key of an object already in the bucket, never the
   * file itself. Choosing an image shrinks and uploads it there and then, so by
   * the time the form is submitted there is nothing left to send — which is
   * what lets an upload survive the remount a lost race causes, exactly as a
   * typed field does.
   *
   * ponytail: submitting during the second or two an upload is in flight loses
   * that upload — the key isn't in the field yet. The Contributor is told the
   * upload is happening, and their edit link puts it right. Blocking the button
   * means threading this state up through two forms for a one-second window.
   */
  const [cover, setCover] = useState({ key: track?.coverKey ?? '', busy: false, error: '' });

  async function chooseCover(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Cleared straight away so choosing the same file again — after fixing a
    // refusal, say — still counts as a change.
    event.target.value = '';
    if (!file) return;

    const problem = coverProblem(file);
    if (problem) return setCover((current) => ({ ...current, error: problem }));

    setCover((current) => ({ ...current, busy: true, error: '' }));
    try {
      const body = new FormData();
      for (const [name, value] of Object.entries(auth)) body.set(name, value);
      // Shrunk here, on the device that took the photo. Nothing large is ever
      // sent and nothing is processed at the other end.
      body.set('cover', await resizeCover(file), 'cover');
      const result = await uploadCoverAction(body);
      // A failed replacement keeps whatever was already uploaded.
      setCover((current) =>
        'error' in result
          ? { ...current, busy: false, error: result.error }
          : { key: result.key, busy: false, error: '' },
      );
    } catch {
      setCover((current) => ({
        ...current,
        busy: false,
        error:
          "That image couldn't be read. Try another one, or export it as JPEG or PNG and upload that.",
      }));
    }
  }

  return (
    <fieldset className="mt-2 flex flex-col gap-3 rounded-md border border-border p-4">
      <legend className="font-title text-2xl">{label}</legend>

      <label htmlFor={`${variant}.url`} className="text-sm">
        Link to the track
      </label>
      <input
        id={`${variant}.url`}
        name={`${variant}.url`}
        required
        value={values.url}
        onChange={set('url')}
        placeholder="bandcamp.com/track/…, soundcloud.com/… or youtube.com/watch?v=…"
        className={field}
      />
      <p
        className={`-mt-1 text-xs ${problem ? 'text-destructive' : 'text-muted-foreground'}`}
        role={problem ? 'alert' : 'status'}
      >
        {looking
          ? 'Looking up the track…'
          : problem ||
            'Paste a Bandcamp, SoundCloud or YouTube link and the name, artist and artwork fill themselves in. Use the pen to correct the name or artist if they get it wrong.'}
      </p>

      {release.length > 1 ? (
        <>
          <label htmlFor={`${variant}.provider_track_id`} className="text-sm">
            Which track on the release
          </label>
          <select
            id={`${variant}.provider_track_id`}
            name={`${variant}.provider_track_id`}
            value={trackId}
            onChange={(event) => chooseTrack(event.target.value)}
            className={field}
          >
            {release.map((t, i) => (
              // A track you have to buy to hear can't be played in the Calendar.
              <option key={t.id} value={t.id} disabled={!t.playable}>
                {i + 1}. {t.title}
                {t.playable ? '' : ' (not streamable)'}
              </option>
            ))}
          </select>
        </>
      ) : (
        <input type="hidden" name={`${variant}.provider_track_id`} value={trackId} />
      )}

      {/*
        The name and artist ride in the player, as text with a pen to correct
        them, or as inputs when there is something to type. Either way they are
        the values the form sends.
      */}
      <TrackPreview url={values.url} streamUrl={previewStream}>
        {editing ? (
          <div className="flex items-end gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <label htmlFor={`${variant}.title`} className="text-sm">
                Track name
              </label>
              <input
                id={`${variant}.title`}
                name={`${variant}.title`}
                required
                maxLength={200}
                value={values.title}
                onChange={set('title')}
                className={field}
              />
              <label htmlFor={`${variant}.artist`} className="text-sm">
                Artist
              </label>
              <input
                id={`${variant}.artist`}
                name={`${variant}.artist`}
                required
                maxLength={200}
                value={values.artist}
                onChange={set('artist')}
                className={field}
              />
            </div>
            {hasNames && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                aria-label="Done editing the name and artist"
                className="shrink-0 rounded-md p-2 hover:bg-accent"
              >
                <Check className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        ) : hasNames ? (
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 break-words">
              <p className="font-medium leading-snug">{values.title}</p>
              <p className="text-sm leading-snug text-muted-foreground">{values.artist}</p>
            </div>
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Edit the name and artist"
              className="-m-1 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ) : null}
      </TrackPreview>
      {!editing && (
        <>
          <input type="hidden" name={`${variant}.title`} value={values.title} />
          <input type="hidden" name={`${variant}.artist`} value={values.artist} />
        </>
      )}

      <label htmlFor={`${variant}.description`} className="text-sm">
        Why you chose it
      </label>
      <textarea
        id={`${variant}.description`}
        name={`${variant}.description`}
        required
        rows={3}
        maxLength={2000}
        defaultValue={track?.description ?? ''}
        className={field}
      />

      <label htmlFor={`${variant}.buy_link`} className="text-sm">
        Link to buy it
      </label>
      <input
        id={`${variant}.buy_link`}
        name={`${variant}.buy_link`}
        defaultValue={track?.buyLink ?? ''}
        placeholder="https://artist.bandcamp.com/track/…"
        className={field}
      />
      {/*
        The artwork the lookup fills in, kept out of sight until there is a
        link to fill it from, and last so that sliding open never shoves the fields
        a Contributor is already typing into. Mounted the whole time, so its
        values are always part of the form.
      */}
      <div
        inert={!open}
        className={`grid transition-[grid-template-rows,margin] duration-300 ease-out motion-reduce:transition-none ${
          open ? 'grid-rows-[1fr]' : '-mt-3 grid-rows-[0fr]'
        }`}
      >
        {/* Padded sideways so the clip doesn't eat the inputs' focus rings. */}
        <div className="-mx-1 flex min-h-0 flex-col gap-3 overflow-hidden px-1">
          <span className="text-sm">Cover image {optional}</span>
          {/* Filled from the link only; there is nothing here to type into. */}
          <input type="hidden" name={`${variant}.cover_url`} value={values.coverUrl} />
          {values.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- somebody else's host, and only a preview.
            <img
              src={values.coverUrl}
              alt=""
              // Dimmed while an upload is in charge, because that is what shows.
              className={`h-16 w-16 shrink-0 rounded-md border border-border object-cover ${
                cover.key ? 'opacity-30' : ''
              }`}
            />
          )}

          <div className="flex items-start gap-3">
            <div className="flex min-w-0 flex-col gap-2">
              <input
                type="file"
                accept={Object.keys(COVER_TYPES).join(',')}
                onChange={chooseCover}
                aria-label={`Upload a cover image for the ${label.toLowerCase()} track`}
                className="max-w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-2 file:text-sm"
              />
              {cover.key && (
                <button
                  type="button"
                  onClick={() => setCover({ key: '', busy: false, error: '' })}
                  className="self-start text-xs underline"
                >
                  Remove this upload
                </button>
              )}
            </div>
            {cover.key && (
              // The preview is the stored object served back through `/cover/`, so
              // what is on screen is exactly what the Calendar will show.
              // eslint-disable-next-line @next/next/no-img-element -- an upload of unknown shape, and only a preview.
              <img
                src={coverPath(cover.key)}
                alt=""
                className="h-16 w-16 shrink-0 rounded-md border border-primary object-cover"
              />
            )}
          </div>
          <p
            className={`-mt-1 text-xs ${cover.error ? 'text-destructive' : 'text-muted-foreground'}`}
            role={cover.error ? 'alert' : 'status'}
          >
            {cover.error ||
              (cover.busy
                ? 'Shrinking and uploading your image…'
                : cover.key
                  ? 'Your upload is what the Calendar will show. Remove it and the image above comes back.'
                  : 'Or upload your own — JPEG, PNG or WebP under 5MB. It is shrunk on your device before it is sent, and it wins over the one above.')}
          </p>
          {/* The key of what was uploaded, carried with the rest of the answers. */}
          <input type="hidden" name={`${variant}.cover_key`} value={cover.key} />

        </div>
      </div>
    </fieldset>
  );
}
