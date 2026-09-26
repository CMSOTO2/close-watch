import { cn } from '#/lib/utils'

/**
 * The mark: an ink tile holding a brass ring that stops short of closing, with
 * a dot resting in the opening.
 *
 * It is a C for Closewatch, a lens, and a watch face mid-sweep, and the dot is
 * the thing the product exists to catch: the moment a proposal is opened. The
 * ring deliberately does not close, because an open deal has not either.
 *
 * Drawn as one SVG rather than nested bordered elements so the opening has a
 * clean round cap instead of a mitred corner, and so the whole thing scales to
 * a favicon or a hero without redrawing.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="Closewatch"
      className={cn('block size-[22px] shrink-0', className)}
    >
      <rect width="32" height="32" rx="8.5" className="fill-mark-tile" />
      <circle
        cx="16"
        cy="16"
        r="9"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        // Arc then gap, in path length. Starting at three o'clock and running
        // clockwise, this leaves the opening in the upper right.
        strokeDasharray="44.3 12.25"
        className="stroke-mark-ink"
      />
      <circle cx="22.99" cy="10.34" r="2.7" className="fill-mark-ink" />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <BrandMark />
      <b className="font-display text-[18px] font-normal">Closewatch</b>
    </span>
  )
}
