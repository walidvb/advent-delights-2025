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

export type Curator = { id: string; email: string; isAdmin: boolean; hasPassword: boolean };

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
export async function requestSignInCode(rawEmail: string): Promise<'ok' | 'email' | 'send'> {
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

  // A refused send (a bad key, a quota hit) is reported back rather than thrown,
  // so the person sees a message instead of a server error page. The pending
  // cookie is not set, so they stay on the email step and can try again.
  try {
    await sendEmail({
      to: email,
      subject: `${code} is your Advent Delights sign-in code`,
      text: `Your sign-in code is ${code}.\n\nIt expires in 10 minutes. If you didn't ask to sign in, ignore this message.`,
    });
  } catch (error) {
    console.error('Sign-in code email failed', error);
    return 'send';
  }

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

  // A code proves the inbox, so it also lifts a password lockout.
  const curator = await database
    .prepare(
      `insert into curators (id, email, created_at) values (?1, ?2, ?3)
       on conflict (email) do update set password_failures = 0
       returning id`,
    )
    .bind(randomToken(), pending.email, Date.now())
    .first<{ id: string }>();
  if (!curator) throw new Error('curator upsert returned no row');

  // Session first: if it fails, the code is still unspent and can be retried.
  await startSession(curator.id);
  await database.prepare('delete from sign_in_codes where id = ?1').bind(id).run();
  jar.delete(PENDING_COOKIE);

  return 'ok';
}

async function startSession(curatorId: string) {
  const token = randomToken();
  await (await db())
    .prepare('insert into sessions (id, curator_id, expires_at) values (?1, ?2, ?3)')
    .bind(await sha256(token), curatorId, Date.now() + SESSION_TTL_MS)
    .run();

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
}

/**
 * ponytail: Cloudflare Workers caps PBKDF2 at 100,000 iterations, below current
 * guidance for SHA-256. Fine for an advent calendar; move hashing off the
 * Worker if these accounts ever guard anything worth more.
 */
const PBKDF2_ITERATIONS = 100_000;
/** Wrong passwords before only a code will get that account in again. */
const MAX_PASSWORD_FAILURES = 10;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 256;

export type PasswordSignInFailure = 'mismatch' | 'password-locked';

async function pbkdf2(password: string, salt: string, iterations: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations },
    key,
    256,
  );
  return hex(new Uint8Array(bits));
}

async function hashPassword(password: string) {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${await pbkdf2(password, salt, PBKDF2_ITERATIONS)}`;
}

async function passwordMatches(password: string, stored: string) {
  const [scheme, iterations, salt, hash] = stored.split('$');
  return scheme === 'pbkdf2' && (await pbkdf2(password, salt, Number(iterations))) === hash;
}

/** Sets or replaces the signed-in Curator's password. */
export async function setPassword(curatorId: string, password: string): Promise<'ok' | 'short' | 'long'> {
  if (password.length < MIN_PASSWORD_LENGTH) return 'short';
  if (password.length > MAX_PASSWORD_LENGTH) return 'long';

  await (await db())
    .prepare('update curators set password_hash = ?1, password_failures = 0 where id = ?2')
    .bind(await hashPassword(password), curatorId)
    .run();
  return 'ok';
}

/**
 * Signs in by email and password. An unknown address, an account with no
 * password and a wrong password all answer 'mismatch'.
 *
 * ponytail: guessing is capped per account, not per caller. Anyone can lock a
 * known address out of password sign-in (the owner signs in by code, which
 * lifts it); a burst of parallel guesses can overshoot the cap a little; and
 * response time shows which addresses have a password. Accepted for an advent
 * calendar. Add a per-IP limit if any of it gets abused.
 */
export async function signInWithPassword(rawEmail: string, password: string): Promise<'ok' | PasswordSignInFailure> {
  const email = normaliseEmail(rawEmail);
  if (!email || !password) return 'mismatch';

  const database = await db();
  const curator = await database
    .prepare('select id, password_hash, password_failures from curators where email = ?1')
    .bind(email)
    .first<{ id: string; password_hash: string | null; password_failures: number }>();

  if (!curator?.password_hash) return 'mismatch';
  if (curator.password_failures >= MAX_PASSWORD_FAILURES) return 'password-locked';

  if (!(await passwordMatches(password, curator.password_hash))) {
    await database
      .prepare('update curators set password_failures = password_failures + 1 where id = ?1')
      .bind(curator.id)
      .run();
    return curator.password_failures + 1 >= MAX_PASSWORD_FAILURES ? 'password-locked' : 'mismatch';
  }

  await database.prepare('update curators set password_failures = 0 where id = ?1').bind(curator.id).run();
  await startSession(curator.id);
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
      `select curators.id as id, curators.email as email, curators.admin as admin,
              curators.password_hash is not null as has_password
         from sessions join curators on curators.id = sessions.curator_id
        where sessions.id = ?1 and sessions.expires_at > ?2`,
    )
    .bind(await sha256(token), Date.now())
    .first<{ id: string; email: string; admin: number; has_password: number }>();

  return row
    ? { id: row.id, email: row.email, isAdmin: row.admin === 1, hasPassword: row.has_password === 1 }
    : null;
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
