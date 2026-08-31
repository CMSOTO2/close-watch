import { cn } from '#/lib/utils'

/**
 * The wordmark: an ink square with a brass ring broken at one side — a watch
 * face mid-sweep. The one place the two brand colours meet.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative block size-[22px] shrink-0 rounded-[6px] bg-primary',
        className,
      )}
    >
      <span className="absolute inset-[6px] rounded-full border-2 border-brand-2 border-r-transparent" />
    </span>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <BrandMark />
      <b className="font-display text-[15px] font-semibold tracking-[-0.015em]">
        Closewatch
      </b>
    </span>
  )
}
