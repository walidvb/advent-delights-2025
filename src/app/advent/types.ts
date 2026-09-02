export type TrackVariant = 'light' | 'heavy';

/**
 * Which Calendar the viewer is looking at: its Slug, and the year it belongs
 * to. The Slug keys the browser's record of which Days have been opened; the
 * year decides which Days have revealed.
 */
export interface CalendarIdentity {
  slug: string;
  year: number;
}

/**
 * One piece of music: where to hear it, who made it, what it's called, why the
 * Contributor chose it, and where to buy it. Always a link to somewhere else —
 * nothing is hosted here.
 */
export interface Track {
  url: string;
  trackName: string;
  artistName: string;
  description: string;
  buyLink: string;
  coverImage: string;
}

/**
 * A position from 1 to 25 in the Calendar, holding one Track per Variant.
 *
 * Tracks are keyed by Variant rather than kept in prefixed fields, so a
 * consumer reads `day.tracks[variant]` instead of branching field by field.
 * The map is partial and carries no count: a Day may hold one Track, two, or
 * none at all when nobody has claimed it.
 */
export interface Day {
  dayIndex: number;
  creditedTo: string;
  contributorLink: string;
  tracks: Partial<Record<TrackVariant, Track>>;
}

/**
 * Someone who made a Submission. Contributors have no accounts: the name is
 * free text they typed, and the link to themselves is optional.
 */
export interface Contributor {
  name: string;
  link: string;
}
