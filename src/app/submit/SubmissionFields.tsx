'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { lookupTrackAction, uploadCoverAction } from './actions';
import { COVER_TYPES, coverPath, coverProblem, resizeCover } from '@/lib/covers';
import type { SubmissionDraft, TrackDraft, Variant } from '@/lib/submissions';
import type { TrackMetadata } from '@/lib/track-metadata';

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

/** The four things a lookup can offer to fill in, and a Contributor can overwrite. */
type Prefillable = { url: string; title: string; artist: string; coverUrl: string };

/**
 * One Track. Paste a link and the title, artist and artwork try to fill
 * themselves in.
 *
 * The prefill is a suggestion and never the source of truth: what gets saved is
 * whatever is in these inputs when the form is submitted. Nothing is ever
 * disabled and nothing waits on the network, so a slow lookup — or one that
 * never answers — costs a Contributor nothing but the typing they were going to
 * do anyway. A source we don't recognise is silent, because it is a perfectly
 * normal thing to paste and not a failure to report.
 */
function TrackFields({
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
  const suggestion = useRef<TrackMetadata | null>(null);
  // The URL this form was rendered with is already accounted for — on the edit
  // form it has been looked up once, months ago, and answered.
  const settled = useRef(values.url.trim());
  const [looking, setLooking] = useState(false);

  useEffect(() => {
    const url = values.url.trim();
    if (!url || url === settled.current) return;

    let live = true;
    const timer = setTimeout(async () => {
      settled.current = url;
      setLooking(true);
      const found = await lookupTrackAction(url).catch(() => null);
      if (!live) return;
      setLooking(false);
      if (!found) return;

      const previous = suggestion.current;
      suggestion.current = found;
      setValues((current) => {
        const fill = (key: keyof TrackMetadata) =>
          current[key] && current[key] !== previous?.[key] ? current[key] : found[key];
        return { ...current, title: fill('title'), artist: fill('artist'), coverUrl: fill('coverUrl') };
      });
    }, SETTLE_MS);

    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [values.url]);

  const set = (key: keyof Prefillable) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

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
        placeholder="youtube.com/watch?v=… or soundcloud.com/…"
        className={field}
      />
      <p className="-mt-1 text-xs text-muted-foreground" role="status">
        {looking
          ? 'Looking up the track…'
          : 'Paste a YouTube or SoundCloud link and the next three fill themselves in. Correct anything they get wrong.'}
      </p>

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

      <label htmlFor={`${variant}.cover_url`} className="text-sm">
        Cover image {optional}
      </label>
      <div className="flex items-start gap-3">
        <input
          id={`${variant}.cover_url`}
          name={`${variant}.cover_url`}
          value={values.coverUrl}
          onChange={set('coverUrl')}
          placeholder="filled in from the link, when we recognise it"
          className={field}
        />
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
      </div>

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
        Where to buy it {optional}
      </label>
      <input
        id={`${variant}.buy_link`}
        name={`${variant}.buy_link`}
        defaultValue={track?.buyLink ?? ''}
        placeholder="the artist's Bandcamp, ideally"
        className={field}
      />
    </fieldset>
  );
}
