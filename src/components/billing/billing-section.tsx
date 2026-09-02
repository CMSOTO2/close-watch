import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Button } from '#/components/ui/button'
import { entitlementsQuery } from '#/lib/billing/entitlements'
import { openBillingPortal, startSoloCheckout } from '#/lib/billing/checkout'
import { FREE_LIVE_PROPOSALS } from '#/constants'

const PLAN_NAMES: Record<string, string> = {
  free: 'Free',
  solo: 'Solo',
  studio: 'Studio',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Plan, usage, and the one button that changes either.
 *
 * Both buttons hand off to a Stripe-hosted page. We never see a card number and
 * there is no card form here to see one with, which is the entire reason the
 * upgrade path is a redirect rather than a form.
 */
export function BillingSection({
  justPaid,
  justManaged,
}: {
  justPaid: boolean
  justManaged: boolean
}) {
  const { data: entitlements } = useSuspenseQuery(entitlementsQuery)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const paid = entitlements.plan !== 'free'
  // Comped accounts have no Stripe customer, so there is nothing for the portal
  // to open and nothing to buy. Offering either would be a button that throws.
  const comped = entitlements.comped
  // A scheduled cancellation carries its own date, which is not always the end
  // of the current period.
  const endsOn = entitlements.cancelAt ?? entitlements.currentPeriodEnd

  async function go(start: () => Promise<{ url: string }>) {
    setBusy(true)
    setError(null)
    try {
      const { url } = await start()
      window.location.href = url
    } catch (err) {
      setBusy(false)
      setError(err instanceof Error ? err.message : 'Could not reach Stripe')
    }
  }

  return (
    <section className="mt-10 border-t border-line pt-8">
      <h2 className="font-display text-lg font-semibold tracking-tight">
        Plan
      </h2>

      {justManaged && (
        <p className="mt-3 rounded-md border border-line bg-surface-2 px-3 py-2 text-[13px] text-ink-2">
          Back from Stripe. If you changed something there, it can take a few
          seconds to show here — reload if this still looks stale.
        </p>
      )}

      {justPaid && !paid && (
        // The webhook is usually faster than the redirect, but not always, and
        // "you are still on Free" is an alarming thing to read straight after
        // paying.
        <p className="mt-3 rounded-md border border-line bg-brand-soft px-3 py-2 text-[13px] text-ink">
          Payment received. Stripe is confirming it now — reload in a few
          seconds and your plan will say Solo.
        </p>
      )}

      <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
        You are on{' '}
        <strong className="font-semibold text-ink">
          {PLAN_NAMES[entitlements.plan]}
        </strong>
        {entitlements.liveProposalLimit === null
          ? ', with no limit on how many proposals are live at once. '
          : `, which keeps ${entitlements.liveProposalLimit} proposals live at a time. `}
        {entitlements.liveProposals}{' '}
        {entitlements.liveProposals === 1 ? 'is' : 'are'} live right now
        {entitlements.draftProposals > 0
          ? `, and ${entitlements.draftProposals} unsent ${entitlements.draftProposals === 1 ? 'draft' : 'drafts'} that cost nothing`
          : ''}
        .
      </p>

      {comped && (
        <p className="mt-2 text-[13px] text-ink-2">
          This one is on the house
          {entitlements.compedUntil
            ? `, until ${formatDate(entitlements.compedUntil)}`
            : ''}
          . There is nothing to pay and no card on file.
        </p>
      )}

      {paid && !comped && entitlements.cancelAtPeriodEnd && endsOn && (
        <p className="mt-2 text-[13px] text-ink-2">
          Cancelled. It stays on until {formatDate(endsOn)}, then drops to Free.
          Nothing is deleted: proposals over the free limit stay readable, you
          just cannot send a new one until you are back under{' '}
          {FREE_LIVE_PROPOSALS}.
        </p>
      )}

      {paid &&
        !comped &&
        !entitlements.cancelAtPeriodEnd &&
        entitlements.currentPeriodEnd && (
          <p className="mt-2 text-[13px] text-ink-2">
            Renews {formatDate(entitlements.currentPeriodEnd)}.
          </p>
        )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {comped ? null : paid ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void go(() => openBillingPortal())}
          >
            {busy ? 'Opening…' : 'Manage billing'}
          </Button>
        ) : (
          <Button
            type="button"
            disabled={busy || !entitlements.billingEnabled}
            title={
              entitlements.billingEnabled
                ? undefined
                : 'Card payments are not switched on yet'
            }
            onClick={() => void go(() => startSoloCheckout())}
          >
            {busy ? 'Opening Stripe…' : 'Go Solo — $19/mo'}
          </Button>
        )}
        {error && <span className="text-[13px] text-danger">{error}</span>}
      </div>

      {!paid && !comped && !entitlements.billingEnabled && (
        <p className="mt-3 text-[13px] text-ink-3">
          Card payments are not switched on yet. The free plan is fully working
          in the meantime.
        </p>
      )}
    </section>
  )
}
