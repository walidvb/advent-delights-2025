'use client';

import { useEffect, useRef, useState } from 'react';
import { lookupTrackAction } from './actions';
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

export function SubmissionFields({
  variants,
  draft,
}: {
  variants: Variant[];
  draft: SubmissionDraft;
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
        <TrackFields key={variant} variant={variant} label={label} track={draft.tracks[variant]} />
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
}: {
  variant: string;
  label: string;
  track: TrackDraft | undefined;
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
            className="h-16 w-16 shrink-0 rounded-md border border-border object-cover"
          />
        )}
      </div>

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
