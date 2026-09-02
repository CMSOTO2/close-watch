import { Link } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { FREE_ACTIVE_PROPOSALS } from '#/constants'

/**
 * Shown in place of the upload form when a free account is at its cap.
 *
 * It leads with the way out that costs nothing. Someone who has two live
 * proposals and wants a third is usually one closed deal away from a free slot,
 * and a paywall that hides that is a paywall people resent.
 */
export function AtLimitPanel({ activeProposals }: { activeProposals: number }) {
  return (
    <div className="mt-6 rounded-lg border border-line bg-surface p-6 shadow-sm">
      <p className="kicker text-brand">Free plan</p>
      <h2 className="mt-3 font-display text-lg font-semibold tracking-tight">
        You have {activeProposals} proposals in flight.
      </h2>
      <p className="mt-2 max-w-[52ch] text-[13px] leading-relaxed text-ink-2">
        The free plan holds {FREE_ACTIVE_PROPOSALS} at a time. Mark one won or
        lost, or archive it, and the slot comes straight back with its tracking
        history intact. Nothing is deleted and nothing is hidden.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button asChild variant="outline">
          <Link to="/dashboard">Close one out</Link>
        </Button>
        <Button asChild>
          <Link to="/settings">Go Solo for unlimited</Link>
        </Button>
      </div>
    </div>
  )
}
