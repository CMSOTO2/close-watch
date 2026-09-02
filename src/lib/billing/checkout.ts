import { createServerFn } from '@tanstack/react-start'
import { getSupabaseAdminClient, getSupabaseServerClient } from '#/lib/supabase/server'
import { publicEnv, serverEnv } from '#/env'
import { billingConfigured, getStripe } from '#/lib/billing/stripe'

/**
 * Starts a Stripe Checkout session for Solo and hands back its URL.
 *
 * The price comes from the server's own env, never from the client: a price id
 * accepted over the wire is a request to charge whatever the caller fancies.
 * The customer is created once and cached on the subscriptions row, so a
 * second upgrade attempt does not leave a second customer behind.
 */
export const startSoloCheckout = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ url: string }> => {
    if (!billingConfigured()) throw new Error('Card payments are not switched on yet')

    const supabase = getSupabaseServerClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) throw new Error('Not signed in')

    const stripe = getStripe()
    const admin = getSupabaseAdminClient()

    const { data: existing } = await admin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', auth.user.id)
      .maybeSingle()

    let customerId = existing?.stripe_customer_id ?? null

    // A cached id can outlive the customer it names: deleting one in the Stripe
    // dashboard leaves the row pointing at nothing, and Checkout refuses a
    // deleted customer. Better to notice here than to hand the user a dead
    // upgrade button forever.
    if (customerId) {
      const customer = await stripe.customers.retrieve(customerId).catch(() => null)
      if (!customer || customer.deleted) customerId = null
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: auth.user.email ?? undefined,
        // The webhook reads this when a subscription event arrives before the
        // row linking customer to user exists.
        metadata: { supabase_user_id: auth.user.id },
      })
      customerId = customer.id

      // Written with the secret key: the user cannot write this table, which is
      // the point of it.
      const { error } = await admin
        .from('subscriptions')
        .upsert({ user_id: auth.user.id, stripe_customer_id: customerId }, { onConflict: 'user_id' })
      if (error) throw new Error(`Could not start checkout: ${error.message}`)
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: serverEnv().STRIPE_PRICE_SOLO!, quantity: 1 }],
      // Belt and braces on top of the customer metadata: whichever of the two
      // events lands first can find the user.
      client_reference_id: auth.user.id,
      subscription_data: { metadata: { supabase_user_id: auth.user.id } },
      success_url: `${publicEnv.VITE_PUBLIC_URL}/settings?billing=done`,
      cancel_url: `${publicEnv.VITE_PUBLIC_URL}/settings?billing=cancelled`,
      allow_promotion_codes: true,
    })

    if (!session.url) throw new Error('Stripe did not return a checkout URL')
    return { url: session.url }
  },
)

/**
 * The Stripe-hosted billing portal: change card, see invoices, cancel.
 *
 * Cancelling lives here rather than in our own UI on purpose. Stripe's portal
 * is the one place a subscription can be ended that cannot get out of step with
 * what Stripe thinks, and a cancel button of our own that half-works is worse
 * than none.
 */
export const openBillingPortal = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ url: string }> => {
    if (!billingConfigured()) throw new Error('Card payments are not switched on yet')

    const supabase = getSupabaseServerClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) throw new Error('Not signed in')

    const { data: row } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .maybeSingle()
    if (!row?.stripe_customer_id) throw new Error('No billing account yet')

    const session = await getStripe().billingPortal.sessions.create({
      customer: row.stripe_customer_id,
      return_url: `${publicEnv.VITE_PUBLIC_URL}/settings`,
    })
    return { url: session.url }
  },
)
