'use client';

import { useRef } from 'react';

/**
 * A delete button that asks first, in a native `<dialog>`. The form inside
 * posts to `action`, which arrives already bound to whatever it deletes.
 */
export function ConfirmDelete({
  action,
  label,
  ariaLabel,
  title,
  message,
  className,
}: {
  action: () => Promise<void>;
  label: string;
  ariaLabel?: string;
  title: string;
  message: string;
  className: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()}
        aria-label={ariaLabel}
        className={className}
      >
        {label}
      </button>
      <dialog
        ref={dialog}
        className="m-auto w-[min(92vw,420px)] rounded-2xl p-6 shadow-[0_12px_40px_rgba(0,0,0,.18)] backdrop:bg-black/40"
      >
        <form action={action} className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">{title}</h2>
          <p className="text-sm text-zinc-600">{message}</p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="rounded-full px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-red-700 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Delete
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
