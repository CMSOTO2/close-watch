#!/usr/bin/env node
/**
 * Creates the Stripe product and the Solo price, once.
 *
 * Idempotent: it looks for a product tagged `closewatch_plan=solo` and a live
 * $19/month recurring price on it before creating either, so running it twice
 * does not leave two products and a confused dashboard.
 *
 *   node scripts/stripe-setup.mjs          # uses STRIPE_SECRET_KEY from .env
 *
 * It prints the price id to put in STRIPE_PRICE_SOLO. Test-mode and live-mode
 * keys have separate objects, so this has to run once against each.
 */

import { readFileSync } from 'node:fs'
import Stripe from 'stripe'

const AMOUNT_CENTS = 1900
const CURRENCY = 'usd'
const TAG = { closewatch_plan: 'solo' }

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
  console.error(
    'No STRIPE_SECRET_KEY. Put a test-mode sk_test_… in .env first:\n' +
      '  https://dashboard.stripe.com/test/apikeys',
  )
  process.exit(1)
}

const stripe = new Stripe(key)
const mode = key.includes('_test_') ? 'test' : 'LIVE'

const products = await stripe.products.search({
  query: `metadata['closewatch_plan']:'solo'`,
})
let product = products.data.find((p) => p.active)
if (product) {
  console.log(`${mode}: product exists, ${product.id}`)
} else {
  product = await stripe.products.create({
    name: 'Closewatch Solo',
    description: 'Unlimited active proposals. Everything on the free plan, without the ceiling.',
    metadata: TAG,
  })
  console.log(`${mode}: created product ${product.id}`)
}

const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 })
let price = prices.data.find(
  (p) =>
    p.unit_amount === AMOUNT_CENTS &&
    p.currency === CURRENCY &&
    p.recurring?.interval === 'month',
)
if (price) {
  console.log(`${mode}: price exists, ${price.id}`)
} else {
  price = await stripe.prices.create({
    product: product.id,
    unit_amount: AMOUNT_CENTS,
    currency: CURRENCY,
    recurring: { interval: 'month' },
    metadata: TAG,
  })
  console.log(`${mode}: created price ${price.id}`)
}

console.log(`\nPut this in .env:\n\nSTRIPE_PRICE_SOLO=${price.id}\n`)
if (mode === 'LIVE') {
  console.log('That was a live key. The next card charged is a real one.')
}
