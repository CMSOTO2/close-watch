#!/usr/bin/env node
/**
 * Points production at a Stripe account, in one pass.
 *
 *   STRIPE_SECRET_KEY=sk_live_… node scripts/stripe-go-live.mjs
 *
 * It creates the product and price if they are missing, creates the webhook
 * endpoint if it is missing, and pushes all three values to the Worker with
 * `wrangler secret put`. Nothing is written to .env: local development stays on
 * whatever key is in that file, which should be the sandbox one.
 *
 * The three secrets move together on purpose. A Worker holding a live key and a
 * sandbox price id fails every upgrade with "no such price", and the way to be
 * sure that never happens is to never set one without the others.
 *
 * Safe to rerun. The only thing it cannot do twice is read a webhook signing
 * secret: Stripe returns it once, at creation. If the endpoint already exists
 * this leaves the Worker's existing STRIPE_WEBHOOK_SECRET alone, so recreating
 * the endpoint (--recreate-webhook) is the way to get a fresh one.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import Stripe from 'stripe'

const WEBHOOK_URL = 'https://getclosewatch.com/api/stripe/webhook'
const EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
]
const AMOUNT_CENTS = 1900
const CURRENCY = 'usd'
const TAG = { closewatch_plan: 'solo' }

const recreateWebhook = process.argv.includes('--recreate-webhook')

function envFromFile(path = '.env') {
  try {
    return Object.fromEntries(
      readFileSync(path, 'utf8')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'))
        .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
    )
  } catch {
    return {}
  }
}

const key = process.env.STRIPE_SECRET_KEY || envFromFile().STRIPE_SECRET_KEY
if (!key) {
  console.error('No STRIPE_SECRET_KEY. Pass it inline:\n  STRIPE_SECRET_KEY=sk_live_… node scripts/stripe-go-live.mjs')
  process.exit(1)
}
const live = !key.includes('_test_')
console.log(`Mode: ${live ? 'LIVE — real cards' : 'sandbox'}\n`)

const stripe = new Stripe(key)

// --- product and price -------------------------------------------------------
const found = await stripe.products.search({ query: `metadata['closewatch_plan']:'solo'` })
let product = found.data.find((p) => p.active)
if (product) {
  console.log(`product   ${product.id} (existing)`)
} else {
  product = await stripe.products.create({
    name: 'Closewatch Solo',
    description: 'Unlimited active proposals. Everything on the free plan, without the ceiling.',
    metadata: TAG,
  })
  console.log(`product   ${product.id} (created)`)
}

const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 })
let price = prices.data.find(
  (p) => p.unit_amount === AMOUNT_CENTS && p.currency === CURRENCY && p.recurring?.interval === 'month',
)
if (price) {
  console.log(`price     ${price.id} (existing)`)
} else {
  price = await stripe.prices.create({
    product: product.id,
    unit_amount: AMOUNT_CENTS,
    currency: CURRENCY,
    recurring: { interval: 'month' },
    metadata: TAG,
  })
  console.log(`price     ${price.id} (created)`)
}

// --- webhook endpoint --------------------------------------------------------
const endpoints = await stripe.webhookEndpoints.list({ limit: 100 })
let endpoint = endpoints.data.find((e) => e.url === WEBHOOK_URL)
let webhookSecret = null

if (endpoint && recreateWebhook) {
  await stripe.webhookEndpoints.del(endpoint.id)
  console.log(`webhook   ${endpoint.id} (deleted, recreating)`)
  endpoint = null
}

if (endpoint) {
  console.log(`webhook   ${endpoint.id} (existing — its secret cannot be re-read)`)
} else {
  endpoint = await stripe.webhookEndpoints.create({
    url: WEBHOOK_URL,
    enabled_events: EVENTS,
    description: `Closewatch subscription sync${live ? '' : ' (sandbox)'}`,
  })
  webhookSecret = endpoint.secret
  console.log(`webhook   ${endpoint.id} (created)`)
}

// --- push to the Worker ------------------------------------------------------
function putSecret(name, value) {
  execFileSync('npx', ['wrangler', 'secret', 'put', name], {
    input: value,
    stdio: ['pipe', 'ignore', 'inherit'],
  })
  console.log(`  set ${name}`)
}

console.log('\nWorker secrets:')
putSecret('STRIPE_SECRET_KEY', key)
putSecret('STRIPE_PRICE_SOLO', price.id)
if (webhookSecret) {
  putSecret('STRIPE_WEBHOOK_SECRET', webhookSecret)
} else {
  console.log('  left STRIPE_WEBHOOK_SECRET alone (endpoint already existed)')
  console.log('  rerun with --recreate-webhook if the Worker needs a fresh one')
}

console.log(
  `\nProduction is now on ${live ? 'LIVE Stripe. The next card charged is real.' : 'sandbox Stripe.'}`,
)
console.log('Secrets apply immediately; no deploy needed.')
