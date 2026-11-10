/**
 * How a cover swaps when the Variant changes, shared by the Calendar and the
 * landing page's peek grid: the old cover fades as the new one pops in with a
 * small overshoot. `step` is the cell's place in a corner-to-corner sweep —
 * its row plus its column — so the swap travels diagonally across the grid.
 */
export function swapPop(step: number) {
  return {
    initial: { opacity: 0, scale: 0.6 },
    animate: { opacity: 1, scale: [0.6, 1.14, 1] },
    exit: { opacity: 0, scale: 0.9 },
    transition: { duration: 0.45, ease: 'easeOut' as const, delay: step * 0.06 },
  };
}

/** A cell's place in the sweep, for the `index`-th cell of a seven-column grid. */
export const sweepStep = (index: number) => Math.floor(index / 7) + (index % 7);
