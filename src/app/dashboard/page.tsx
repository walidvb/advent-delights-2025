import { redirect } from 'next/navigation';
import { getCurator } from '@/lib/auth';
import { signOutAction } from '@/app/sign-in/actions';

export default async function DashboardPage() {
  const curator = await getCurator();
  if (!curator) redirect('/sign-in');

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 p-6">
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="font-title text-4xl">Your Calendars</h1>
        <form action={signOutAction}>
          <button type="submit" className="text-sm underline text-muted-foreground">
            Sign out
          </button>
        </form>
      </header>

      <p className="text-sm text-muted-foreground">Signed in as {curator.email}.</p>

      {/* Ticket 07 replaces this with the list and a "create a Calendar" control. */}
      <p className="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">
        You haven&apos;t made a Calendar yet.
      </p>
    </main>
  );
}
