import { Link } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { FREE_DRAFT_PROPOSALS, FREE_LIVE_PROPOSALS } from '#/constants'

/**
 * Shown when a free account is at its live cap and tries to send another.
 *
 * It leads with the way out that costs nothing. Someone with two proposals
 * being read who wants a third is usually one closed deal away from a free
 * slot, and a paywall that hides that is a paywall people resent.
 *
 * The headline says "being read" rather than "live" on purpose. A slot is spent
 * when a client opens the proposal, so this number can be lower than the number
 * of proposals actually out there, and calling it "live" would read as a
 * miscount to the one person looking closely enough to care.
 */
export function AtLimitPanel({ liveProposals }: { liveProposals: number }) {
  return (
    <div className="mt-6 rounded-lg border border-line bg-surface p-6 shadow-sm">
      <p className="kicker text-brand">Free plan</p>
      <h2 className="mt-3 font-display text-lg font-semibold tracking-tight">
        {liveProposals} of your proposals are being read right now.
      </h2>
      <p className="mt-2 max-w-[52ch] text-[13px] leading-relaxed text-ink-2">
        The free plan carries {FREE_LIVE_PROPOSALS} at a time, counted from when
        a client opens one: sending costs nothing until somebody reads it. Mark
        one won or lost and the slot comes straight back with its tracking
        history intact. If a deal is still in the air, archive it instead: it
        leaves the list without going on the record either way. Nothing is
        deleted and nothing is hidden. Drafts do not count, so you can keep
        preparing the next one.
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

/**
 * Shown in place of the upload form when a free account has stacked up too many
 * unsent drafts.
 *
 * This is a storage guard, not a sales pitch, and a working consultant should
 * never see it. The copy says so rather than pretending it is a plan boundary
 * worth paying to cross.
 */
export function DraftLimitPanel({
  draftProposals,
}: {
  draftProposals: number
}) {
  return (
    <div className="mt-6 rounded-lg border border-line bg-surface p-6 shadow-sm">
      <p className="kicker text-brand">Free plan</p>
      <h2 className="mt-3 font-display text-lg font-semibold tracking-tight">
        {draftProposals} drafts are waiting to be sent.
      </h2>
      <p className="mt-2 max-w-[52ch] text-[13px] leading-relaxed text-ink-2">
        The free plan holds {FREE_DRAFT_PROPOSALS} unsent drafts at a time. Send
        one to a client, or delete one you no longer need, and you can upload
        again.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button asChild variant="outline">
          <Link to="/dashboard">Back to proposals</Link>
        </Button>
      </div>
    </div>
  )
}
