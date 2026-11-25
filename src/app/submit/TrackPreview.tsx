'use client';

import { useState, type ReactNode } from 'react';
import { detectProvider, normalizeUrl, type MediaRef } from '@cucu/media/core';
import { MediaEngine, type Progress } from '@cucu/media/react';

/**
 * A play button and a progress line, so a Contributor can hear what they are
 * about to submit — the link they pasted, through the same engine the Calendar
 * plays it with. Shows only for a source the Calendar knows how to play, and
 * for Bandcamp only once the lookup has handed back a stream.
 *
 * The cover, when there is one, is the button: the play icon sits on top of
 * it. Whatever else it is given to show — the name and artist — sits beside
 * it, and both still show on their own for a link there is nothing to play
 * from.
 */
export function TrackPreview({
  url,
  streamUrl,
  cover,
  children,
}: {
  url: string;
  streamUrl: string | null;
  cover?: string;
  children?: ReactNode;
}) {
  const provider = detectProvider(url);
  const media: MediaRef | null =
    !provider || (provider === 'bandcamp' && !streamUrl)
      ? null
      : { provider, url: normalizeUrl(url) ?? url, streamUrl };
  const key = media ? `${media.url}|${media.streamUrl ?? ''}` : null;

  const [state, setState] = useState({ key, playing: false, played: 0, failed: false });
  // A new link stops the old one rather than playing on into it.
  if (state.key !== key) setState({ key, playing: false, played: 0, failed: false });

  const artwork = cover ? (
    // eslint-disable-next-line @next/next/no-img-element -- somebody else's host or an upload, and only a preview.
    <img src={cover} alt="" className="absolute inset-0 h-full w-full rounded-md object-cover" />
  ) : null;

  if (!media) {
    if (!children && !artwork) return null;
    return (
      <div className="flex items-start gap-3 rounded-md border border-border px-3 py-2">
        {artwork && <span className="relative h-16 w-16 shrink-0">{artwork}</span>}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-md border border-border px-3 py-2">
      <MediaEngine
        media={media}
        playing={state.playing}
        onProgress={(p: Progress) => setState((s) => ({ ...s, played: p.played }))}
        onEnded={() => setState((s) => ({ ...s, playing: false, played: 0 }))}
        onError={() => setState((s) => ({ ...s, playing: false, failed: true }))}
      />
      <button
        type="button"
        onClick={() => setState((s) => ({ ...s, playing: !s.playing, failed: false }))}
        aria-label={state.playing ? 'Pause the preview' : 'Play a preview'}
        className={`relative flex shrink-0 items-center justify-center ${artwork ? 'h-16 w-16' : 'h-8 w-8'}`}
      >
        {artwork}
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d={state.playing ? 'M6 19h4V5H6v14zm8-14v14h4V5h-4z' : 'M8 5v14l11-7z'} />
          </svg>
        </span>
      </button>
      <div className="flex min-h-8 min-w-0 flex-1 flex-col justify-center gap-2">
        {children}
        {state.failed ? (
          <span className="text-xs text-destructive">That link wouldn&apos;t play here.</span>
        ) : (
          <span className="h-1 overflow-hidden rounded-full bg-zinc-900/10">
            <span
              className="block h-full bg-zinc-900 transition-[width]"
              style={{ width: `${state.played * 100}%` }}
            />
          </span>
        )}
      </div>
    </div>
  );
}
