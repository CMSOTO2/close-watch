import { describe, expect, it } from 'vitest'
import { cancellation, periodEnd } from './stripe'
import type Stripe from 'stripe'

/**
 * Stripe describes a scheduled cancellation two ways, and reading only the
 * boolean told a customer who had just cancelled that their subscription
 * renews. These cover both shapes and the plain renewing case.
 */

const AUGUST = 1791000000 // 2026-10-02T…Z, a fixed instant

function subscription(fields: Partial<Stripe.Subscription>): Stripe.Subscription {
  return {
    cancel_at_period_end: false,
    cancel_at: null,
    items: { data: [{ current_period_end: AUGUST }] },
    ...fields,
  } as unknown as Stripe.Subscription
}

describe('cancellation', () => {
  it('reads the boolean the API sets', () => {
    expect(cancellation(subscription({ cancel_at_period_end: true }))).toEqual({
      ending: true,
      at: null,
    })
  })

  it('reads the timestamp the billing portal sets', () => {
    const result = cancellation(subscription({ cancel_at: AUGUST }))
    expect(result.ending).toBe(true)
    expect(result.at).toBe(new Date(AUGUST * 1000).toISOString())
  })

  it('reads both together', () => {
    const result = cancellation(
      subscription({ cancel_at_period_end: true, cancel_at: AUGUST }),
    )
    expect(result.ending).toBe(true)
    expect(result.at).toBe(new Date(AUGUST * 1000).toISOString())
  })

  it('leaves a renewing subscription alone', () => {
    expect(cancellation(subscription({}))).toEqual({ ending: false, at: null })
  })
})

describe('periodEnd', () => {
  it('reads the item, where Stripe moved it', () => {
    expect(periodEnd(subscription({}))).toBe(new Date(AUGUST * 1000).toISOString())
  })

  it('falls back to the subscription for older API versions', () => {
    const older = {
      items: { data: [] },
      current_period_end: AUGUST,
    } as unknown as Stripe.Subscription
    expect(periodEnd(older)).toBe(new Date(AUGUST * 1000).toISOString())
  })

  it('is null when there is nothing to read', () => {
    expect(periodEnd({ items: { data: [] } } as unknown as Stripe.Subscription)).toBeNull()
  })
})
