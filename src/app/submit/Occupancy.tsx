/**
 * A grid of dots standing in for the 25 Days of a Calendar — how full it is,
 * never which Days are which. `opened` Days come first (they always are: Days
 * reveal in order from the 1st), then Days claimed but not yet revealed, then
 * whatever is still free. This is a texture, not a map: nothing here can be
 * clicked, and nothing here names a Day.
 */
export function Occupancy({
  total,
  opened,
  claimed,
  dark,
}: {
  total: number;
  opened: number;
  claimed: number;
  /** The muted, glassy dark treatment used against the night-sky background. */
  dark?: boolean;
}) {
  const free = Math.max(0, total - opened - claimed);
  const dots = [
    ...Array.from({ length: opened }, () => 'opened' as const),
    ...Array.from({ length: claimed }, () => 'claimed' as const),
    ...Array.from({ length: free }, () => 'free' as const),
  ];

  const styleFor = (state: (typeof dots)[number]) => {
    if (state === 'opened') {
      return dark
        ? 'bg-black/30 border border-white/10'
        : 'bg-zinc-900/25 border border-zinc-900/10';
    }
    if (state === 'claimed') {
      return dark ? 'bg-white/85 border border-white/50' : 'bg-zinc-900/90 border border-zinc-900';
    }
    return dark
      ? 'border border-dashed border-white/40 bg-white/10'
      : 'border border-dashed border-zinc-900/25 bg-white/40';
  };

  return (
    <div
      className="grid w-full grid-cols-[repeat(13,minmax(0,1fr))] gap-1.5"
      role="img"
      aria-label={`${claimed + opened} of ${total} Days taken`}
    >
      {dots.map((state, i) => (
        <span key={i} className={`aspect-square rounded-[3px] ${styleFor(state)}`} />
      ))}
    </div>
  );
}
