import { redirect } from 'next/navigation';

/**
 * The root is no longer one community's Calendar — Calendars live at their own
 * Slug now. Nothing lists Calendars (a browse page is deliberately out of
 * scope), so the only thing anyone can do from the bare root is make one:
 * `/dashboard` shows a Curator theirs and sends everybody else to sign in.
 *
 * Whenever a browse page for public Calendars does exist, it replaces this.
 */
export default function Home() {
  redirect('/dashboard');
}
