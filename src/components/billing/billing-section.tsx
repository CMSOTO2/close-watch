import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Button } from '#/components/ui/button'
import { entitlementsQuery } from '#/lib/billing/entitlements'
import { openBillingPortal, startSoloCheckout } from '#/lib/billing/checkout'
import { FREE_ACTIVE_PROPOSALS } from '#/constants'

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
export function BillingSection({ justPaid }: { justPaid: boolean }) {
  const { data: entitlements } = useSuspenseQuery(entitlementsQuery)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const paid = entitlements.plan !== 'free'

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
        {entitlements.activeProposalLimit === null
          ? ', with no limit on how many proposals are open at once. '
          : `, which holds ${entitlements.activeProposalLimit} active proposals at a time. `}
        {entitlements.activeProposals}{' '}
        {entitlements.activeProposals === 1 ? 'is' : 'are'} open right now.
      </p>

      {paid &&
        entitlements.cancelAtPeriodEnd &&
        entitlements.currentPeriodEnd && (
          <p className="mt-2 text-[13px] text-ink-2">
            Cancelled. It stays on until{' '}
            {formatDate(entitlements.currentPeriodEnd)}, then drops to Free.
            Nothing is deleted: proposals over the free limit stay readable, you
            just cannot start a new one until you are back under{' '}
            {FREE_ACTIVE_PROPOSALS}.
          </p>
        )}

      {paid &&
        !entitlements.cancelAtPeriodEnd &&
        entitlements.currentPeriodEnd && (
          <p className="mt-2 text-[13px] text-ink-2">
            Renews {formatDate(entitlements.currentPeriodEnd)}.
          </p>
        )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {paid ? (
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

      {!paid && !entitlements.billingEnabled && (
        <p className="mt-3 text-[13px] text-ink-3">
          Card payments are not switched on yet. The free plan is fully working
          in the meantime.
        </p>
      )}
    </section>
  )
}
