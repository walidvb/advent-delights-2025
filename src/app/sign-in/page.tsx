import { redirect } from 'next/navigation';
import { getCurator, pendingCodeEmail } from '@/lib/auth';
import { requestCodeAction, useAnotherEmailAction, verifyCodeAction } from './actions';

const MESSAGES: Record<string, string> = {
  email: "That doesn't look like an email address. Check it and try again.",
  invalid: "That code isn't right. Check it and try again.",
  expired: 'That code has expired. Ask for a new one.',
  locked: 'Too many wrong tries, so that code no longer works. Ask for a new one.',
};

const field =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring';
const button =
  'w-full rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground hover:opacity-90';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getCurator()) redirect('/dashboard');

  const [{ error }, awaitingCodeFor] = await Promise.all([searchParams, pendingCodeEmail()]);
  const message = error ? MESSAGES[error] : undefined;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="font-title text-4xl">Curator sign-in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          No password. We email you a six-digit code.
        </p>
      </div>

      {message && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {message}
        </p>
      )}

      {awaitingCodeFor ? (
        <>
          <form action={verifyCodeAction} className="flex flex-col gap-3">
            <label htmlFor="code" className="text-sm">
              We sent a code to <strong>{awaitingCodeFor}</strong>. It expires in ten minutes.
            </label>
            <input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
              placeholder="000000"
              className={`${field} text-center tracking-[0.5em]`}
            />
            <button type="submit" className={button}>
              Sign in
            </button>
          </form>
          <form action={useAnotherEmailAction}>
            <button type="submit" className="text-sm underline text-muted-foreground">
              Use a different email address
            </button>
          </form>
        </>
      ) : (
        <form action={requestCodeAction} className="flex flex-col gap-3">
          <label htmlFor="email" className="text-sm">
            Your email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            placeholder="you@example.com"
            className={field}
          />
          <button type="submit" className={button}>
            Email me a code
          </button>
        </form>
      )}
    </main>
  );
}
