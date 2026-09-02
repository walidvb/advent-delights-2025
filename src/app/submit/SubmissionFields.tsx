import type { SubmissionDraft, Variant } from '@/lib/submissions';

/**
 * The fields of a Submission: who to credit, and one Track per Variant.
 *
 * Shared by the claim form and the edit form, which ask for exactly the same
 * things — the only difference between them is that one of them also picks a
 * Day. No hooks, so it renders on either side of the client boundary.
 *
 * Every value is a `defaultValue`: a Contributor who loses the race to a Day
 * gets this rendered again with what they typed, and nothing is retyped.
 */

export const field =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring';
export const button =
  'rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60';

const optional = <span className="text-muted-foreground">(optional)</span>;

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

      {variants.map(({ variant, label }) => {
        // Absent for a Variant nobody has filled in yet, which is the blank form.
        const track = draft.tracks[variant];
        return (
          <fieldset key={variant} className="mt-2 flex flex-col gap-3 rounded-md border border-border p-4">
            <legend className="font-title text-2xl">{label}</legend>

            <label htmlFor={`${variant}.url`} className="text-sm">
              Link to the track
            </label>
            <input
              id={`${variant}.url`}
              name={`${variant}.url`}
              required
              defaultValue={track?.url ?? ''}
              placeholder="youtube.com/watch?v=… or soundcloud.com/…"
              className={field}
            />

            <label htmlFor={`${variant}.title`} className="text-sm">
              Track name
            </label>
            <input
              id={`${variant}.title`}
              name={`${variant}.title`}
              required
              maxLength={200}
              defaultValue={track?.title ?? ''}
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
              defaultValue={track?.artist ?? ''}
              className={field}
            />

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
      })}
    </>
  );
}
