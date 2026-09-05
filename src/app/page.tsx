import Link from 'next/link';

/**
 * The marketing landing page. Calendars live at their own Slug now, so this is
 * no longer a redirect to `/dashboard` — it is the front door for someone who
 * has never made a Calendar, with the actual product one click away either
 * direction: "Create a calendar" for a new Curator, "Sign in" for a returning
 * one (which already bounces a signed-in visitor straight to their dashboard).
 */
export default function Home() {
  return (
    <main className="min-h-dvh bg-[url('/light.webp')] bg-cover bg-fixed bg-center">
      <div className="mx-auto flex max-w-5xl flex-col gap-14 px-6 py-10 sm:px-10 sm:py-16">
        <div className="flex items-center justify-between">
          <span className="font-title text-3xl italic font-light sm:text-4xl">Advent Delights</span>
          <Link href="/sign-in" className="text-sm font-medium text-zinc-700">
            Sign in
          </Link>
        </div>

        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div className="flex flex-col gap-6">
            <h1 className="font-title text-4xl font-light leading-[1.05] tracking-tight sm:text-5xl">
              An advent calendar
              <br />
              your people fill
              <br />
              with music.
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-zinc-700">
              Twenty-five days. Each day belongs to one person, and they leave two tracks behind it
              — one to soothe your mind, one to get schwifty. Nobody sees a thing until December
              opens it.
            </p>
            <div className="flex items-center gap-4 pt-1">
              <Link
                href="/dashboard/new"
                className="rounded-full bg-zinc-900 px-7 py-3.5 text-base font-medium text-zinc-50 shadow-[0_6px_20px_rgba(0,0,0,.18)] hover:opacity-90"
              >
                Create a calendar
              </Link>
              <span className="text-sm text-zinc-600">Free. Takes a minute.</span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-6 border-t border-zinc-900/10 pt-8">
              {[
                ['01', 'Start a calendar and name it.'],
                ['02', 'Send the submit link to your people.'],
                ['03', 'December opens one day at a time.'],
              ].map(([n, copy]) => (
                <div key={n} className="flex flex-col gap-1.5">
                  <span className="font-mono text-xs text-zinc-500">{n}</span>
                  <span className="text-sm leading-snug text-zinc-700">{copy}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative hidden h-[420px] lg:block">
            <Tile src="/covers/Rafael_Light.webp" n={4} className="left-4 top-2 h-48 w-48 -rotate-6" />
            <Tile src="/covers/alicia.webp" n={9} className="right-2 top-16 h-56 w-56 rotate-3" />
            <Tile src="/covers/Wassyl_heavy.webp" n={22} className="bottom-2 right-14 h-36 w-36 -rotate-6" />
          </div>
        </div>
      </div>

      <div className="border-t border-black/5 bg-white/70 px-6 py-4 text-center backdrop-blur sm:px-10">
        <span className="text-xs text-zinc-500">
          Made with <span className="text-red-500">🩶</span> for the communities running one of
          these.
        </span>
      </div>
    </main>
  );
}

function Tile({ src, n, className }: { src: string; n: number; className: string }) {
  return (
    <div
      className={`absolute overflow-hidden rounded-xl shadow-[0_18px_40px_rgba(0,0,0,.22)] ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative only, not user content. */}
      <img src={src} alt="" className="size-full object-cover" />
      <span className="absolute bottom-1 right-2 text-2xl font-bold text-white/90 [text-shadow:1px_1px_0_rgb(0,0,0)]">
        {n}
      </span>
    </div>
  );
}
