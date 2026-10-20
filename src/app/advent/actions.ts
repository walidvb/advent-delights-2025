'use server';

import { refreshStream } from '@/lib/media';

/**
 * A fresh stream for a Bandcamp Track whose stored one stopped playing, or null
 * when there is none to be had right now. `day` is the Day's position, 1 to 25.
 */
export async function refreshStreamAction(
  slug: string,
  day: number,
  variant: string,
): Promise<string | null> {
  return refreshStream(slug, day, variant).catch(() => null);
}
