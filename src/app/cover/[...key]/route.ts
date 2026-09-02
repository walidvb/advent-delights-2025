import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * Serves an uploaded cover image out of the bucket.
 *
 * The application serves these itself rather than pointing at the bucket's own
 * public development URL, which is rate-limited and documented as being for
 * development only. Nothing is processed here — the object goes out as it was
 * stored.
 *
 * The path after `/cover/` is the object's key, so `/cover/covers/x.webp`
 * serves `covers/x.webp`.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const object = await env.BUCKET.get(key.join('/'));
  if (!object) return new Response('Not found', { status: 404 });

  // The stored type and body are read as plain values rather than through
  // `writeHttpMetadata` and `object.body`: `next dev` reaches the bindings over
  // a bridge that only carries plain ones.
  return new Response(await object.arrayBuffer(), {
    headers: {
      'content-type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      etag: object.httpEtag,
      // A cover never changes under its key: a new image is a new upload.
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}
