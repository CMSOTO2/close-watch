#!/usr/bin/env node
/**
 * The launch offer: three months of Solo free, for the first hundred people.
 *
 *   STRIPE_SECRET_KEY=sk_live_… node scripts/stripe-promo.mjs --live
 *   node scripts/stripe-promo.mjs                 # sandbox key from .env
 *
 * Three months free rather than a percentage off, because a discount on $19
 * puts Solo under the floor POSITIONING.md sets and never wants to see again:
 * "$9 reads as a toy, attracts the churniest users, and gives away the anchor."
 * A trial has no such problem. Solo was $19 before the offer, during it, and
 * after, so nobody is ever re-priced.
 *
 * The card is still collected. An offer that skips it buys a signup count and
 * nothing else, and the number worth having out of a launch is what share of
 * those hundred are still paying in month four.
 *
 * Restricted to customers who have never paid us, so an existing subscriber
 * cannot put the code in and take three months off their own bill.
 *
 * Idempotent, and it does not edit what it finds. A coupon's terms are frozen
 * at creation and a promotion code's cap cannot be raised later, so if either
 * exists with the wrong shape this says so and stops rather than pretending.
 * Fixing it means a new code, which is Stripe's design, not a limitation here.
 */

import { readFileSync } from 'node:fs'
import Stripe from 'stripe'

/** What the code is called. Typed by a human on a phone, so no lookalikes. */
const CODE = 'HUNTED'

/** Months of Solo at no charge before the first $19 lands. */
const FREE_MONTHS = 3

/** People who can claim it. The offer is scarce or it is not an offer. */
const MAX_REDEMPTIONS = 100

/**
 * How long the code stays claimable, from the moment this runs. A launch offer
 * that works six months later is not a launch offer, and an open-ended one
 * quietly becomes the price.
 */
const WINDOW_DAYS = 30

const TAG = { closewatch_promo: 'product_hunt_launch' }

function envFromFile(path = '.env') {
  try {
    return Object.fromEntries(
      readFileSync(path, 'utf8')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
        .map((line) => {
          const at = line.indexOf('=')
          return [line.slice(0, at), line.slice(at + 1)]
        }),
    )
  } catch {
    return {}
  }
}

const key = process.env.STRIPE_SECRET_KEY || envFromFile().STRIPE_SECRET_KEY
if (!key) {
  console.error('No STRIPE_SECRET_KEY.')
  process.exit(1)
}

const live = !key.includes('_test_')
const mode = live ? 'LIVE' : 'test'

/**
 * Live mode has to be asked for out loud.
 *
 * The trap this exists for runs the other way from the usual one. `.env` holds
 * the sandbox key, so the accident to worry about is not creating a live coupon
 * by mistake — it is creating a *test* one, announcing the code to the world,
 * and watching every real customer be told it does not exist. Hence the warning
 * at the end of a sandbox run, and the flag on a live one.
 */
if (live && !process.argv.includes('--live')) {
  console.error(
    'That is a live key. Rerun with --live if you mean it:\n' +
      '  STRIPE_SECRET_KEY=sk_live_… node scripts/stripe-promo.mjs --live',
  )
  process.exit(1)
}

const stripe = new Stripe(key)

// Solo has to exist before there is anything to discount, and its id goes in
// the coupon's metadata so a later reader can tell what this was cut for.
//
// It is *not* pinned with `applies_to`. That parameter is accepted and then
// silently discarded on this API version (v2442): a probe coupon created with
// `applies_to: { products: [id] }` reads back with the field undefined. Do not
// re-add it thinking it does something. What actually keeps this off Studio is
// src/lib/billing/checkout.ts, which only ever builds a session from
// STRIPE_PRICE_SOLO, so no other subscription can be created to discount.
//
// `list` and filter here rather than `products.search`, which the other Stripe
// scripts use. Search runs off an index that trails writes by up to a minute,
// so on an account where the product was just created it returns nothing and
// this would refuse to run for no reason. `list` reads the live objects.
const products = await stripe.products.list({ active: true, limit: 100 })
const product = products.data.find(
  (p) => p.metadata?.closewatch_plan === 'solo',
)
if (!product) {
  console.error(
    `${mode}: no Solo product. Run scripts/stripe-setup.mjs against this key first.`,
  )
  process.exit(1)
}

// ---------------------------------------------------------------------------
// The coupon: what the discount is
// ---------------------------------------------------------------------------

const existingCoupons = await stripe.coupons.list({ limit: 100 })
let coupon = existingCoupons.data.find(
  (c) => c.metadata?.closewatch_promo === TAG.closewatch_promo && c.valid,
)

if (coupon) {
  const wrong =
    coupon.percent_off !== 100 ||
    coupon.duration !== 'repeating' ||
    coupon.duration_in_months !== FREE_MONTHS
  if (wrong) {
    console.error(
      `${mode}: coupon ${coupon.id} exists with different terms ` +
        `(${coupon.percent_off}% off, ${coupon.duration} ${coupon.duration_in_months ?? ''}). ` +
        'Stripe cannot change a coupon after creation. Delete it in the dashboard ' +
        'or change the metadata tag in this file, then rerun.',
    )
    process.exit(1)
  }
  console.log(`${mode}: coupon exists, ${coupon.id}`)
} else {
  coupon = await stripe.coupons.create({
    name: `${FREE_MONTHS} months free (Product Hunt)`,
    percent_off: 100,
    duration: 'repeating',
    duration_in_months: FREE_MONTHS,
    metadata: { ...TAG, closewatch_product: product.id },
  })
  console.log(`${mode}: created coupon ${coupon.id}`)
}

// ---------------------------------------------------------------------------
// The promotion code: what the customer types
// ---------------------------------------------------------------------------

const existingCodes = await stripe.promotionCodes.list({
  code: CODE,
  limit: 10,
})
const promo = existingCodes.data.find((p) => p.active)

if (promo) {
  console.log(
    `${mode}: promotion code ${CODE} already exists (${promo.id}), ` +
      `${promo.times_redeemed}/${promo.max_redemptions ?? '∞'} claimed. Left alone.`,
  )
} else {
  const created = await stripe.promotionCodes.create({
    // Nested rather than a flat `coupon`, which this API version dropped.
    // The flat form fails with "unknown parameter: coupon", which reads like a
    // typo rather than the version difference it is.
    promotion: { type: 'coupon', coupon: coupon.id },
    code: CODE,
    max_redemptions: MAX_REDEMPTIONS,
    expires_at: Math.floor(Date.now() / 1000) + WINDOW_DAYS * 86_400,
    // No prior successful payment. Keeps the offer to new customers instead of
    // handing three free months to the people already paying.
    restrictions: { first_time_transaction: true },
    metadata: TAG,
  })
  console.log(`${mode}: created promotion code ${CODE} (${created.id})`)
}

const expiry = new Date(Date.now() + WINDOW_DAYS * 86_400_000)
console.log(
  `\n${CODE}: ${FREE_MONTHS} months of Solo free, first ${MAX_REDEMPTIONS} people, ` +
    `new customers only.\nClaimable until ${expiry.toDateString()}.\n`,
)

if (live) {
  console.log(
    'Live. Check it end to end before you publish the code: /settings -> Choose Solo ->\n' +
      `"Add promotion code" -> ${CODE}. The total should read $0.00 due today.`,
  )
} else {
  console.log(
    'SANDBOX. This code does not exist for real customers, and production runs on\n' +
      'live keys. Rerun with a live key and --live before the launch post goes up.',
  )
}
