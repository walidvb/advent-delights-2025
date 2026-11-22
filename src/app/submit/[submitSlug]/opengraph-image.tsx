import { getCloudflareContext } from '@opennextjs/cloudflare';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { ImageResponse } from 'next/og';
import { getSubmitView } from '@/lib/submissions';

/**
 * The link preview image for a Submit slug: a call for selectors, drawn per
 * Calendar so it states that Calendar's year and how many Tracks a Day holds.
 *
 * Both are fixed once a Calendar exists, so the image can be cached as long as
 * a browser or chat app likes. It says nothing about which Days are claimed.
 */
export const alt = 'Be a selector for this advent calendar';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ submitSlug: string }> }) {
  const view = await getSubmitView((await params).submitSlug);
  if (!view) notFound();
  const tracks = view.variants.length;

  const [script, light, bold, backdrop, disk] = await Promise.all([
    asset('/font/luthon-southard-script.ttf'),
    asset('/og/nunito-sans-300.ttf'),
    asset('/og/nunito-sans-700.ttf'),
    asset('/og/backdrop.jpg'),
    asset('/og/disk.png'),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          backgroundColor: '#0d2a33',
          color: '#fafafa',
          fontFamily: 'Nunito Sans',
        }}
      >
        <img src={dataUri(backdrop, 'image/jpeg')} width={1200} height={630} style={{ position: 'absolute', inset: 0 }} alt="" />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(90deg, rgba(6,20,26,0.62) 0%, rgba(6,20,26,0.35) 50%, rgba(6,20,26,0) 74%)',
          }}
        />
        <img
          src={dataUri(disk, 'image/png')}
          width={560}
          height={560}
          alt=""
          style={{
            position: 'absolute',
            right: -120,
            top: 35,
            transform: 'rotate(-14deg)',
            borderRadius: 9999,
            boxShadow: '0 30px 50px rgba(0,0,0,0.45)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 72,
            top: 60,
            bottom: 60,
            width: 660,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* The logo: the app's title face, slanted as the site's header draws it. */}
          <div
            style={{
              display: 'flex',
              fontFamily: 'Luthon Southard Script',
              fontSize: 54,
              lineHeight: 1,
              textShadow: '0 1px 0 #fafafa, 1px 0 0 #fafafa',
              transform: 'skewX(-12deg)',
              transformOrigin: 'left bottom',
            }}
          >
            Advent Delights
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 100, lineHeight: 1, fontWeight: 700, letterSpacing: -3.5 }}>Be a selector</div>
            <div style={{ fontSize: 46, lineHeight: 1.15, fontWeight: 300, letterSpacing: -0.9 }}>
              {`for ${view.year}’s advent calendar!`}
            </div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 300, color: 'rgba(250,250,250,0.8)' }}>
            {`25 days · ${tracks === 1 ? '1 track' : `${tracks} tracks`} each`}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Luthon Southard Script', data: script, weight: 400, style: 'normal' },
        { name: 'Nunito Sans', data: light, weight: 300, style: 'normal' },
        { name: 'Nunito Sans', data: bold, weight: 700, style: 'normal' },
      ],
    },
  );
}

/**
 * A file from `public/`. Deployed, it comes from the Workers static assets
 * binding — a Worker cannot fetch its own hostname. Under `next dev` that
 * binding has no fresh build behind it, so it comes from the dev server.
 */
async function asset(path: string): Promise<ArrayBuffer> {
  const response =
    process.env.NODE_ENV === 'development'
      ? await fetch(new URL(path, `http://${(await headers()).get('host')}`))
      : await (await getCloudflareContext({ async: true })).env.ASSETS?.fetch(
          new URL(path, 'https://assets.local'),
        );
  if (!response?.ok) throw new Error(`Missing share image asset ${path}: ${response?.status}`);
  return response.arrayBuffer();
}

function dataUri(data: ArrayBuffer, type: string) {
  return `data:${type};base64,${Buffer.from(data).toString('base64')}`;
}
