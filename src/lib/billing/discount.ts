import { createServerFn } from '@tanstack/react-start'
import { queryOptions } from '@tanstack/react-query'
import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
} from '#/lib/supabase/server'
import { billingConfigured, getStripe } from '#/lib/billing/stripe'
import { queryKeys } from '#/constants'
import type Stripe from 'stripe'

export type ActiveDiscount = {
  /** The coupon's own name, e.g. "3 months free (Product Hunt)". */
  name: string | null
  /** The code typed at checkout, when one was used rather than a bare coupon. */
  code: string | null
  /** 100 means the subscription costs nothing while the discount runs. */
  percentOff: number | null
  /** Set instead of percentOff on a fixed-amount coupon. */
  amountOffCents: number | null
  /** When it stops applying. Null means it never does. */
  endsAt: string | null
}

/**
 * The discount on this account's subscription, read live from Stripe.
 *
 * Not stored on the subscriptions row, and not folded into getEntitlements,
 * for two different reasons.
 *
 * Live rather than stored, because a discount can end or be removed without an
 * event we listen for, and a stale "3 months free" on a settings page is the
 * kind of wrong that turns into a support email about an unexpected charge.
 * Stripe is the only thing that knows the answer, so ask it.
 *
 * Separate from getEntitlements because entitlements load on the dashboard as
 * well, and putting a Stripe round trip in that path would tax the page people
 * open all day to answer a question only the settings page asks.
 */
export const getActiveDiscount = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ActiveDiscount | null> => {
    if (!billingConfigured()) return null

    const supabase = getSupabaseServerClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return null

    const { data: row } = await getSupabaseAdminClient()
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', auth.user.id)
      .maybeSingle()

    if (!row?.stripe_subscription_id) return null

    // Never fatal. This decorates the billing section; a Stripe hiccup should
    // cost the sentence about the promo, not the plan and the buttons under it.
    const subscription = await getStripe()
      .subscriptions.retrieve(row.stripe_subscription_id, {
        expand: ['discounts.source.coupon', 'discounts.promotion_code'],
      })
      .catch(() => null)

    const discount = subscription?.discounts[0]
    // An unexpanded discount comes back as a bare id string, which carries none
    // of what this needs. Treating that as "no discount" is the safe read.
    if (!discount || typeof discount === 'string') return null

    // The coupon moved to `source.coupon` in this API version; it is not on the
    // discount itself, and `discount.coupon` is undefined rather than an error.
    const source = discount.source as { coupon?: Stripe.Coupon } | undefined
    const coupon = source?.coupon
    if (!coupon || typeof coupon === 'string') return null

    const promo = discount.promotion_code

    return {
      name: coupon.name ?? null,
      code: typeof promo === 'string' ? null : (promo?.code ?? null),
      percentOff: coupon.percent_off ?? null,
      amountOffCents: coupon.amount_off ?? null,
      endsAt:
        typeof discount.end === 'number'
          ? new Date(discount.end * 1000).toISOString()
          : null,
    }
  },
)

export const discountQuery = queryOptions({
  queryKey: queryKeys.activeDiscount,
  queryFn: () => getActiveDiscount(),
})
