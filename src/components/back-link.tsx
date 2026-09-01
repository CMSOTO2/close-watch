import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { cn } from '#/lib/utils'

/**
 * The way out of a sub-page, back to the list.
 *
 * Every authed page below the dashboard used to hand-roll its own "← Proposals"
 * — the detail page in a row beside Delete, settings above the heading, the
 * upload form not at all. The bar above them never changed, so the only thing
 * that moved between pages was the one control you reach for when you are
 * lost. One component, one position: first thing in the page, above the
 * heading.
 */
export function BackLink({ className }: { className?: string }) {
  return (
    <Link
      to="/dashboard"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md text-[13px] text-ink-2 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className,
      )}
    >
      <ArrowLeft aria-hidden className="size-3.5" />
      Proposals
    </Link>
  )
}
