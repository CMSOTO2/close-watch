import Stripe from 'stripe'
import { serverEnv } from '#/env'
import type { BillingPlan } from '#/lib/supabase/types'

/**
 * The Stripe client, built per request.
 *
 * `createFetchHttpClient` is not optional on Workers: the SDK's default client
 * is Node's http module, which does not exist here. The API version is left to
 * the SDK's own pin, so upgrading the package is the single deliberate act that
 * moves it.
 */
export function getStripe(): Stripe {
  return new Stripe(serverEnv().STRIPE_SECRET_KEY ?? '', {
    httpClient: Stripe.createFetchHttpClient(),
  })
}

/** False until the keys are on the Worker. Every billing path checks this first. */
export function billingConfigured(): boolean {
  const env = serverEnv()
  return !!env.STRIPE_SECRET_KEY && !!env.STRIPE_PRICE_SOLO
}

/**
 * Which plan a price belongs to.
 *
 * An unrecognised price still counts as Solo rather than free. A price id that
 * changed under us is a configuration mistake; billing someone and then leaving
 * them on the free plan is a much worse one.
 */
export function planForPrice(priceId: string | null | undefined): BillingPlan {
  const env = serverEnv()
  if (priceId && priceId === env.STRIPE_PRICE_STUDIO) return 'studio'
  if (priceId && priceId === env.STRIPE_PRICE_SOLO) return 'solo'
  console.warn(`Unknown Stripe price ${priceId}; treating it as Solo`)
  return 'solo'
}

/**
 * When the paid period runs out, as an ISO string.
 *
 * Stripe moved this off the subscription and onto its items, so both places are
 * checked: the old field is still what older API versions send.
 */
export function periodEnd(subscription: Stripe.Subscription): string | null {
  // `.at()` rather than `[0]`: a subscription with no items is not supposed to
  // exist, and indexing types it as though that were guaranteed.
  const seconds =
    subscription.items.data.at(0)?.current_period_end ??
    (subscription as unknown as { current_period_end?: number }).current_period_end
  return typeof seconds === 'number' ? new Date(seconds * 1000).toISOString() : null
}
