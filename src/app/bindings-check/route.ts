import { getCloudflareContext } from '@opennextjs/cloudflare';

// Throwaway: proves the D1 and R2 bindings are reachable from a server route.
// Delete once real routes use them (ticket 01).
export const dynamic = 'force-dynamic';

export async function GET() {
  const { env } = await getCloudflareContext({ async: true });

  const db = await env.DB.prepare('select 1 as ok').first<{ ok: number }>();

  const key = 'bindings-check.txt';
  await env.BUCKET.put(key, `ok ${new Date().toISOString()}`);
  const object = await env.BUCKET.get(key);

  return Response.json({
    d1: db?.ok === 1 ? 'ok' : 'unexpected',
    r2: object ? await object.text() : 'missing',
  });
}
