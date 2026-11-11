import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurator, pendingCodeEmail } from '@/lib/auth';
import { passwordSignInAction, requestCodeAction, useAnotherEmailAction, verifyCodeAction } from './actions';
import { CodeInput } from './CodeInput';

const MESSAGES: Record<string, string> = {
  email: "That doesn't look like an email address. Check it and try again.",
  send: "We couldn't send your code just now. Try again in a minute.",
  invalid: "That code isn't right. Check it and try again.",
  expired: 'That code has expired. Ask for a new one.',
  locked: 'Too many wrong tries, so that code no longer works. Ask for a new one.',
  mismatch: "That email and password don't match. Check them, or ask for a code instead.",
  'password-locked':
    'Too many wrong passwords on this account. Sign in with a code — that unlocks your password again.',
};

const field =
  'w-full rounded-lg border border-zinc-300 px-3.5 py-3 text-base outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10';
const button =
  'w-full rounded-full bg-zinc-900 px-4 py-3.5 font-medium text-zinc-50 hover:opacity-90';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getCurator()) redirect('/dashboard');

  const [{ error }, awaitingCodeFor] = await Promise.all([searchParams, pendingCodeEmail()]);
  const message = error ? MESSAGES[error] : undefined;

  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-[url('/light.webp')] bg-cover bg-fixed bg-center px-4 py-10">
      <Link href="/" className="absolute left-6 top-6 font-title text-3xl italic font-light">
        Advent Delights
      </Link>

      <div className="w-full max-w-sm rounded-2xl border border-zinc-200/70 bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,.04),0_12px_40px_rgba(0,0,0,.10)]">
        <div className="flex flex-col gap-6">
          {message && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {message}
            </p>
          )}

          {awaitingCodeFor ? (
            <>
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-normal">Check your email</h1>
                <p className="text-sm text-zinc-500">
                  Six digits, sent to <strong className="text-zinc-900">{awaitingCodeFor}</strong>.
                </p>
              </div>
              <form action={verifyCodeAction} className="flex flex-col gap-4">
                <CodeInput invalid={error === 'invalid'} />
                <button type="submit" className={button}>
                  Sign in
                </button>
              </form>
              <form action={useAnotherEmailAction}>
                <button type="submit" className="text-sm text-zinc-500 underline">
                  Use a different email address
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-normal">Sign in</h1>
                <p className="text-sm text-zinc-500">
                  We&apos;ll email you a six-digit code. Set a password once you&apos;re in, if you&apos;d
                  rather use one.
                </p>
              </div>
              <form action={requestCodeAction} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Email
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
                </div>
                <button type="submit" className={button}>
                  Send me a code
                </button>
                <details className="flex flex-col gap-4" open={error === 'mismatch' || error === 'password-locked'}>
                  <summary className="cursor-pointer text-sm text-zinc-500 underline">
                    Sign in with a password instead
                  </summary>
                  <div className="mt-4 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="password"
                        className="text-xs font-medium uppercase tracking-wide text-zinc-500"
                      >
                        Password
                      </label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        className={field}
                      />
                    </div>
                    <button type="submit" formAction={passwordSignInAction} className={button}>
                      Sign in with password
                    </button>
                  </div>
                </details>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
