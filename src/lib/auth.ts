import { getCloudflareContext } from '@opennextjs/cloudflare';
import { cookies } from 'next/headers';
import { sendEmail } from '@/lib/email';

/** A code is good for ten minutes — long enough to switch to a mail app. */
const CODE_TTL_MS = 10 * 60 * 1000;
/** Wrong guesses before the code is burned and a new one must be requested. */
const MAX_ATTEMPTS = 5;
/** Long enough that a Curator who set up in November is still signed in on the 25th. */
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

/** Holds the id of the pending sign_in_codes row, so the code form needs no email. */
export const PENDING_COOKIE = 'curator_sign_in';
const SESSION_COOKIE = 'curator_session';

export type SignInFailure = 'email' | 'invalid' | 'expired' | 'locked';

export type Curator = { id: string; email: string };

async function db() {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function randomToken() {
  return hex(crypto.getRandomValues(new Uint8Array(32)));
}

async function sha256(value: string) {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))));
}

/** Six digits, uniformly. Rejection sampling because 2^32 is not a multiple of 1e6. */
function sixDigitCode() {
  const limit = Math.floor(2 ** 32 / 1e6) * 1e6;
  let n = limit;
  while (n >= limit) n = crypto.getRandomValues(new Uint32Array(1))[0];
  return String(n % 1e6).padStart(6, '0');
}

/**
 * In local development `000000` always signs you in, so getting to the
 * dashboard doesn't mean fishing a code out of the server log every time.
 *
 * `process.env.NODE_ENV` is inlined at build time, so this branch is not
 * present in a production bundle at all: it cannot be switched back on by an
 * environment variable, a secret, or a misconfigured deploy. `npm run preview`
 * builds in production mode too, so the shortcut is `next dev` only.
 *
 * It skips the code, not the flow — a pending, unexpired, unlocked request is
 * still required, and the account is still created and the session still
 * written exactly as they are for a real code.
 */
const DEV_CODE = '000000';

function devCodeAccepted(typed: string) {
  return process.env.NODE_ENV !== 'production' && typed.trim() === DEV_CODE;
}

function normaliseEmail(raw: string) {
  const email = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

/**
 * Mails a fresh six-digit code and remembers which one we are waiting for.
 * Any previous code for the same address stops working.
 *
 * ponytail: no rate limit on how often an address may be asked for a code.
 * One live code per address is the only brake. Add a per-address cooldown if
 * anyone ever uses this to spam an inbox or burn the provider's daily quota.
 *
 * Never branches on whether email is configured — `sendEmail` decides, and with
 * no key it prints the code to the server console.
 */
export async function requestSignInCode(rawEmail: string): Promise<'ok' | 'email'> {
  const email = normaliseEmail(rawEmail);
  if (!email) return 'email';

  const id = randomToken();
  const code = sixDigitCode();
  const database = await db();

  await database.batch([
    database.prepare('delete from sign_in_codes where email = ?1 or expires_at < ?2').bind(email, Date.now()),
    database
      .prepare('insert into sign_in_codes (id, email, code_hash, expires_at) values (?1, ?2, ?3, ?4)')
      .bind(id, email, await sha256(`${id}:${code}`), Date.now() + CODE_TTL_MS),
  ]);

  await sendEmail({
    to: email,
    subject: `${code} is your Advent Delights sign-in code`,
    text: `Your sign-in code is ${code}.\n\nIt expires in 10 minutes. If you didn't ask to sign in, ignore this message.`,
  });

  (await cookies()).set(PENDING_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: CODE_TTL_MS / 1000,
  });

  return 'ok';
}

/**
 * Checks the typed code against the pending request and, if it matches, signs
 * the person in — creating their account the first time they ever do this, so
 * the same address on a second device reaches the same account.
 */
export async function verifySignInCode(typed: string): Promise<'ok' | SignInFailure> {
  const jar = await cookies();
  const id = jar.get(PENDING_COOKIE)?.value;
  if (!id) return 'expired';

  const database = await db();
  const pending = await database
    .prepare('select email, code_hash, expires_at, attempts from sign_in_codes where id = ?1')
    .bind(id)
    .first<{ email: string; code_hash: string; expires_at: number; attempts: number }>();

  const forget = async (reason: SignInFailure) => {
    await database.prepare('delete from sign_in_codes where id = ?1').bind(id).run();
    jar.delete(PENDING_COOKIE);
    return reason;
  };

  if (!pending || pending.expires_at < Date.now()) return forget('expired');
  if (pending.attempts >= MAX_ATTEMPTS) return forget('locked');

  if (!devCodeAccepted(typed) && (await sha256(`${id}:${typed.trim()}`)) !== pending.code_hash) {
    await database.prepare('update sign_in_codes set attempts = attempts + 1 where id = ?1').bind(id).run();
    return pending.attempts + 1 >= MAX_ATTEMPTS ? forget('locked') : 'invalid';
  }

  const curator = await database
    .prepare(
      `insert into curators (id, email, created_at) values (?1, ?2, ?3)
       on conflict (email) do update set email = excluded.email
       returning id`,
    )
    .bind(randomToken(), pending.email, Date.now())
    .first<{ id: string }>();
  if (!curator) throw new Error('curator upsert returned no row');

  const token = randomToken();
  await database.batch([
    database.prepare('delete from sign_in_codes where id = ?1').bind(id),
    database
      .prepare('insert into sessions (id, curator_id, expires_at) values (?1, ?2, ?3)')
      .bind(await sha256(token), curator.id, Date.now() + SESSION_TTL_MS),
  ]);

  jar.delete(PENDING_COOKIE);
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });

  return 'ok';
}

/** The address the pending code went to, for the "we sent it to…" line. */
export async function pendingCodeEmail(): Promise<string | null> {
  const id = (await cookies()).get(PENDING_COOKIE)?.value;
  if (!id) return null;

  const row = await (await db())
    .prepare('select email from sign_in_codes where id = ?1 and expires_at > ?2')
    .bind(id, Date.now())
    .first<{ email: string }>();

  return row?.email ?? null;
}

/**
 * The signed-in Curator, or null. Safe to call from any server component.
 *
 * ponytail: expired session rows are rejected here but never deleted. Add a
 * sweep if the table ever gets big enough to notice.
 */
export async function getCurator(): Promise<Curator | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const row = await (await db())
    .prepare(
      `select curators.id as id, curators.email as email
         from sessions join curators on curators.id = sessions.curator_id
        where sessions.id = ?1 and sessions.expires_at > ?2`,
    )
    .bind(await sha256(token), Date.now())
    .first<Curator>();

  return row ?? null;
}

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await (await db()).prepare('delete from sessions where id = ?1').bind(await sha256(token)).run();
  }
  jar.delete(SESSION_COOKIE);
  jar.delete(PENDING_COOKIE);
}

/** Abandons a pending code so the sign-in page offers the email form again. */
export async function forgetPendingCode() {
  const jar = await cookies();
  const id = jar.get(PENDING_COOKIE)?.value;
  if (id) await (await db()).prepare('delete from sign_in_codes where id = ?1').bind(id).run();
  jar.delete(PENDING_COOKIE);
}
