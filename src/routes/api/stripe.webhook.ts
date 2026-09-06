import { createFileRoute } from '@tanstack/react-router'
import { getSupabaseAdminClient } from '#/lib/supabase/server'
import { serverEnv } from '#/env'
import {
  cancellation,
  getStripe,
  periodEnd,
  planForPrice,
} from '#/lib/billing/stripe'
import Stripe from 'stripe'
import type { BillingPlan } from '#/lib/supabase/types'

/**
 * Stripe's side of the conversation. Everything the paywall reads is written
 * here and nowhere else.
 *
 * Two rules this depends on:
 *
 *  - The signature is verified against the raw body. Not the parsed one: JSON
 *    round-tripping changes bytes and the HMAC stops matching. Without this
 *    check the endpoint is an open door to "make me a subscriber".
 *  - Writes go through the secret key, because the caller is Stripe and there
 *    is no session to scope RLS to.
 *
 * Stripe retries anything that is not a 2xx, so a failed write answers 500 and
 * lets it come back rather than swallowing the event.
 */

/** Statuses that mean the subscription is over and the plan goes back to free. */
const DEAD = new Set(['canceled', 'incomplete_expired'])

/**
 * Stripe types metadata as a plain string map, so a key that was never set
 * reads as a string as far as the types are concerned. This is the one place
 * that admits it can be missing.
 */
function metadataUserId(
  metadata: Stripe.Metadata | null | undefined,
): string | null {
  const value: string | undefined = metadata?.supabase_user_id
  return value ?? null
}

async function syncSubscription(
  subscription: Stripe.Subscription,
): Promise<void> {
  const admin = getSupabaseAdminClient()
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id

  // Who is this? The row written when checkout started is the fast path. The
  // metadata is the fallback for a subscription created from the Stripe
  // dashboard, where our checkout never ran.
  const { data: existing } = await admin
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  let userId = existing?.user_id ?? metadataUserId(subscription.metadata)
  if (!userId) {
    const customer = await getStripe().customers.retrieve(customerId)
    if (!customer.deleted) userId = metadataUserId(customer.metadata)
  }
  if (!userId) {
    // Nothing to attach it to. Answer 200 anyway: retrying will not conjure a
    // user, and a permanently failing event blocks the endpoint's whole queue.
    console.warn(`Stripe customer ${customerId} has no supabase_user_id`)
    return
  }

  const status = subscription.status
  const plan: BillingPlan = DEAD.has(status)
    ? 'free'
    : planForPrice(subscription.items.data[0]?.price.id)

  const ending = cancellation(subscription)

  const { error } = await admin.from('subscriptions').upsert(
    {
      user_id: userId,
      plan,
      status,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      current_period_end: periodEnd(subscription),
      cancel_at_period_end: ending.ending,
      cancel_at: ending.at,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (error) throw new Error(`Could not save subscription: ${error.message}`)
}

export const Route = createFileRoute('/api/stripe/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const env = serverEnv()
        if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
          return new Response('Billing is not configured', { status: 503 })
        }

        const signature = request.headers.get('stripe-signature')
        if (!signature)
          return new Response('Missing signature', { status: 400 })

        const body = await request.text()

        let event: Stripe.Event
        try {
          event = await getStripe().webhooks.constructEventAsync(
            body,
            signature,
            env.STRIPE_WEBHOOK_SECRET,
            undefined,
            // Workers have no Node crypto, so verification runs on SubtleCrypto.
            Stripe.createSubtleCryptoProvider(),
          )
        } catch (cause) {
          console.warn('Stripe signature check failed', cause)
          return new Response('Invalid signature', { status: 400 })
        }

        try {
          switch (event.type) {
            case 'checkout.session.completed': {
              const session = event.data.object
              // Only subscription checkouts carry one, and only a paid session
              // is worth acting on.
              if (session.mode !== 'subscription' || !session.subscription)
                break
              const id =
                typeof session.subscription === 'string'
                  ? session.subscription
                  : session.subscription.id
              await syncSubscription(
                await getStripe().subscriptions.retrieve(id),
              )
              break
            }
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
            case 'customer.subscription.paused':
            case 'customer.subscription.resumed':
              await syncSubscription(event.data.object)
              break
            default:
              // Everything else is noise here. Answer 200 so Stripe stops
              // resending it.
              break
          }
        } catch (cause) {
          console.error(`Stripe webhook ${event.type} failed`, cause)
          return new Response('Handler failed', { status: 500 })
        }

        return new Response(null, { status: 204 })
      },
    },
  },
})
