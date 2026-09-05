'use client';

import { useRef, useState } from 'react';

/**
 * Six digit boxes standing in for one code. `verifyCodeAction` still reads a
 * single `code` field — these boxes are a presentation over that, joined into
 * a hidden input on every change, so nothing on the server had to change.
 *
 * Needs JavaScript to combine the boxes; the single-field form this replaced
 * worked without it. Accepted here along with everything else in this
 * redesign that already assumes a script-capable browser (the cover upload,
 * the metadata lookup, the claim wizard).
 */
export function CodeInput({ invalid }: { invalid?: boolean }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  function setDigit(i: number, raw: string) {
    const value = raw.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = value;
    setDigits(next);
    if (value && i < 5) inputs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  }

  function onPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    event.preventDefault();
    setDigits(Array.from({ length: 6 }, (_, i) => pasted[i] ?? ''));
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {digits.map((value, i) => (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            value={value}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={onPaste}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            autoFocus={i === 0}
            className={`h-14 w-0 min-w-0 flex-1 rounded-lg border text-center text-xl font-medium outline-none ${
              invalid
                ? 'border-red-400 text-red-700'
                : 'border-zinc-300 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10'
            }`}
          />
        ))}
      </div>
      <input type="hidden" name="code" value={digits.join('')} />
    </div>
  );
}
