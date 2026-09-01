import { Link } from '@tanstack/react-router'
import { Check } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'

/**
 * The three plans from POSITIONING.md.
 *
 * Checkout is not wired: the paid buttons are inert on purpose until there is
 * a Stripe account behind them. Free is the exception — signing up is the one
 * thing on this table that already works, so it links where it says it does
 * rather than pretending along with the others.
 *
 * Features that do not exist yet are marked, not omitted. The plan needs the
 * shape it will have to be worth reading, and a small "soon" is the difference
 * between a roadmap and a page that sells three things you cannot deliver.
 */

type Feature = { text: string; soon?: boolean }

type Plan = {
  name: string
  price: string
  cadence: string | null
  who: string
  features: Array<Feature>
  cta: string
  /** The anchor. POSITIONING.md: do not price below $19, and do not hide it. */
  featured?: boolean
}

const PLANS: Array<Plan> = [
  {
    name: 'Free',
    price: '$0',
    cadence: null,
    who: 'Enough to watch one deal and see whether any of this is true.',
    features: [
      { text: '2 active proposals' },
      { text: '30 days of history' },
      { text: 'Tracked links and intent scoring' },
    ],
    cta: 'Start free',
  },
  {
    name: 'Solo',
    price: '$19',
    cadence: '/mo',
    who: 'For one person sending their own proposals.',
    features: [
      { text: 'Unlimited proposals' },
      { text: 'Full history' },
      { text: 'Email the moment a proposal is opened' },
      { text: 'Page-by-page attention and forwarding' },
    ],
    cta: 'Choose Solo',
    featured: true,
  },
  {
    name: 'Studio',
    price: '$49',
    cadence: '/mo',
    who: 'For a small team working one pipeline together.',
    features: [
      { text: 'Everything in Solo' },
      { text: '3 seats', soon: true },
      { text: 'Slack alerts', soon: true },
      { text: 'Your own domain on share links', soon: true },
    ],
    cta: 'Choose Studio',
  },
]

export function Pricing() {
  return (
    <>
      <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              'flex flex-col bg-surface px-5 py-6',
              // The featured plan is marked by a warmer ground rather than by
              // being lifted out of the row: a card that breaks the grid takes
              // the border seams with it.
              plan.featured && 'bg-brand-soft',
            )}
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-display text-base font-semibold tracking-tight">
                {plan.name}
              </p>
              {plan.featured && (
                <span className="rounded-sm bg-surface/70 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-brand uppercase">
                  Most take this
                </span>
              )}
            </div>

            <p className="mt-4 flex items-baseline gap-0.5">
              <span className="font-display text-3xl font-semibold tracking-[-0.03em]">
                {plan.price}
              </span>
              {plan.cadence && (
                <span className="text-[13px] text-ink-2">{plan.cadence}</span>
              )}
            </p>

            <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
              {plan.who}
            </p>

            <ul className="mt-5 flex flex-col gap-2">
              {plan.features.map((feature) => (
                <li
                  key={feature.text}
                  className="flex items-start gap-2 text-[13px] text-ink-2"
                >
                  <Check
                    aria-hidden
                    className="mt-0.5 size-3.5 shrink-0 text-brand"
                  />
                  <span>
                    {feature.text}
                    {feature.soon && (
                      <span className="ml-1.5 rounded-sm bg-surface-2 px-1 py-0.5 text-[10px] text-ink-3">
                        soon
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            {/* Pushes every button to the same line however tall the list is. */}
            <div className="mt-6 grow" />

            {plan.cta === 'Start free' ? (
              <Button asChild variant={plan.featured ? 'default' : 'outline'}>
                <Link to="/login">{plan.cta}</Link>
              </Button>
            ) : (
              <Button
                type="button"
                variant={plan.featured ? 'default' : 'outline'}
                // TODO: open Stripe checkout for this plan. Inert until there is
                // an account behind it — a button that silently does nothing is
                // worse than one that says it is not ready.
                disabled
                title="Card payments are not switched on yet"
              >
                {plan.cta}
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Three greyed-out buttons with no explanation read as a broken page.
          Said out loud, the same three read as a plan that has not opened yet,
          and the free tier — which does work — becomes the obvious move. */}
      <p className="mt-4 text-[13px] text-ink-3">
        Card payments are not switched on yet. The free plan works today, and it
        is the one that shows you whether the rest is worth paying for.
      </p>
    </>
  )
}
