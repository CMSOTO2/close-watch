import { Link } from '@tanstack/react-router'
import { Check } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'

/**
 * The three plans from POSITIONING.md.
 *
 * Free is not a crippled tier. Every feature is on it and history never
 * expires; the only thing $19 buys is the right to have more than two deals
 * live at once. A feature gate teaches people the product is worse than it is,
 * and the number that actually predicts whether someone will pay is how many
 * proposals they have in flight.
 *
 * Solo points at Settings rather than straight at a checkout: the subscription
 * has to attach to an account, so signing in comes first either way. Studio has
 * no price behind it yet and says so on hover rather than pretending.
 *
 * Features that do not exist yet are marked, not omitted. The plan needs the
 * shape it will have to be worth reading, and a small "soon" is the difference
 * between a roadmap and a page that sells three things you cannot deliver.
 *
 * Free carries the warm ground and the solid button for as long as checkout is
 * off. Weighting a card whose button cannot be pressed points the eye at the
 * one thing nobody can do, and leaves the only working button looking like the
 * cheap option nobody meant. Move it back to Solo the day Stripe is wired.
 */

type Feature = { text: string; soon?: boolean }

type Plan = {
  name: string
  price: string
  cadence: string | null
  who: string
  features: Array<Feature>
  cta: string
  /** Where the button goes. Absent means it is not a button anyone can press. */
  to?: '/login' | '/settings'
  /** Shown on hover when there is no `to`, and the reason there isn't one. */
  unavailable?: string
  /** Warm ground and a solid button. One plan at a time. */
  featured?: boolean
  /**
   * Small caps line above the price. Whatever it says has to be true today:
   * this page is read by people who check, and there is nothing to lose more
   * cheaply than the claim that others already bought.
   */
  badge?: string
}

const PLANS: Array<Plan> = [
  {
    name: 'Free',
    price: '$0',
    cadence: null,
    who: 'Two live deals at a time, with nothing switched off.',
    features: [
      { text: '2 proposals live with clients at a time' },
      { text: 'Drafts you are still preparing do not count' },
      { text: 'Tracked links, intent scoring, page attention' },
      { text: 'Forwarding detection and email alerts' },
      { text: 'Full history, nothing expires' },
    ],
    cta: 'Start free',
    to: '/login',
    featured: true,
    badge: 'Works today',
  },
  {
    name: 'Solo',
    price: '$19',
    cadence: '/mo',
    who: 'For one person with more than two deals in the air.',
    features: [
      { text: 'Unlimited live proposals' },
      { text: 'Everything on the free plan' },
    ],
    cta: 'Choose Solo',
    // Settings, not a checkout link: the upgrade needs a signed-in account to
    // attach the subscription to, and that page is where Stripe sends people
    // back to afterwards.
    to: '/settings',
    // POSITIONING.md: do not price below $19, and do not hide it. No badge
    // while checkout is off. The price is the anchor on its own, and a second
    // caps line in a row of three cards is noise.
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
    unavailable: 'Studio is not open yet',
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
              {plan.badge && (
                <span
                  className={cn(
                    'shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-brand uppercase',
                    plan.featured ? 'bg-surface/70' : 'bg-surface-2',
                  )}
                >
                  {plan.badge}
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

            {plan.to ? (
              <Button asChild variant={plan.featured ? 'default' : 'outline'}>
                <Link to={plan.to}>{plan.cta}</Link>
              </Button>
            ) : (
              <Button
                type="button"
                variant={plan.featured ? 'default' : 'outline'}
                disabled
                title={plan.unavailable}
              >
                {plan.cta}
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* True whether or not the keys are on the Worker yet: Settings is where
          the upgrade lives either way, and it is the page that knows whether
          Stripe is switched on. */}
      <p className="mt-4 text-[13px] text-ink-3">
        Start free and upgrade from Settings the day two proposals stop being
        enough. Solo is billed by Stripe; cancelling is one click in their
        portal and never touches what you have already sent.
      </p>
    </>
  )
}
