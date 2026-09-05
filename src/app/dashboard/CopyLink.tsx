'use client';

import { useRef, useState } from 'react';

/**
 * A shareable link, shown in full and copyable in one click.
 *
 * Where the clipboard API is unavailable or refused — an insecure origin, a
 * browser that denies it — the link is selected instead, so the copy is still
 * one keystroke away rather than a broken button.
 */
export function CopyLink({ label, url, hint }: { label: string; url: string; hint?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
        {hint && <span className="ml-2 normal-case tracking-normal opacity-80">{hint}</span>}
      </span>
      <div className="flex items-center gap-2">
        <input
          ref={input}
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
          className="w-full min-w-0 rounded-md border border-input bg-muted px-2 py-1 font-mono text-xs"
        />
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              input.current?.select();
            }
          }}
          className="shrink-0 rounded-md border border-input px-2 py-1 text-xs hover:bg-muted"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
