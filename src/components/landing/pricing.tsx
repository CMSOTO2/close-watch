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
 * no price behind it yet and says so in text under its own dead button, where
 * a phone can read it — it used to say so in a `title`, which is a tooltip for
 * a mouse and nothing at all for anyone else.
 *
 * Features that do not exist yet are marked, not omitted. The plan needs the
 * shape it will have to be worth reading, and a small "soon" is the difference
 * between a roadmap and a page that sells three things you cannot deliver.
 *
 * Solo carries the ring, the lift and the solid button. Free held the emphasis
 * while checkout was off, because weighting a card whose button cannot be
 * pressed points the eye at the one thing nobody can do; Stripe is live now, so
 * it is back where it belongs.
 *
 * Solo rather than Free even though the free plan is the front door, because
 * of who this is for. POSITIONING.md's customer is running a pipeline, and a
 * pipeline is by definition more than two deals being read at once. Free cannot
 * serve them, so recommending it wastes their first week. Free keeps its place at
 * the head of the row and a working button, which is the whole try-first path
 * and is not up for negotiation.
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
  /** Shown under the button when there is no `to`, and the reason there isn't one. */
  unavailable?: string
  /** Ring, lift and a solid button. One plan at a time. */
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
    // "Being read", not "live", because that is what the counter counts and
    // what every other surface says — the at-limit panel, the comparison
    // tables, the entitlement message. A visitor who reads two of them and
    // gets three different phrasings has to work out whether they are three
    // different rules.
    who: 'Two proposals being read at a time, with nothing switched off.',
    // Deliberately the same list as Solo, minus the first line. Solo's bullets
    // used to name grouping, search and heat filtering while Free's did not,
    // which read as a feature gate. None of those are gated; the only
    // entitlement check in the app is the slot counter. Implying otherwise
    // teaches people the free plan is a worse product than it is, which is the
    // one thing POSITIONING.md is most insistent about not doing.
    features: [
      { text: '2 proposals being read at a time, and unlimited sending' },
      { text: 'Drafts you are still preparing do not count' },
      { text: 'Tracked links, intent scoring, page attention' },
      { text: 'Forwarding detection and email alerts' },
      { text: 'Grouping by client, search and heat filtering' },
      { text: 'Full history, nothing expires' },
    ],
    cta: 'Start free',
    to: '/login',
  },
  {
    name: 'Solo',
    price: '$19',
    cadence: '/mo',
    who: 'For the person sending every proposal at a small agency.',
    // Spelled out rather than left as "everything on the free plan". Two
    // bullets against Free's five made the paid tier read as the thinner
    // product, which is the opposite of what the list is for. Free now carries
    // the same lines, so the two columns differ by exactly what the plans
    // differ by: the first bullet. That is the honest version of the same fix.
    features: [
      { text: 'Unlimited proposals live at once' },
      { text: 'Tracked links, intent scoring, page attention' },
      { text: 'Forwarding detection and email alerts' },
      { text: 'Grouping by client, search and heat filtering' },
      { text: 'Full history, nothing expires' },
    ],
    cta: 'Choose Solo',
    // Settings, not a checkout link: the upgrade needs a signed-in account to
    // attach the subscription to, and that page is where Stripe sends people
    // back to afterwards.
    to: '/settings',
    featured: true,
    // POSITIONING.md: do not price below $19, and do not hide it.
    //
    // "Recommended" rather than "Most popular". The rejected badges were all
    // claims about other customers — most popular, chosen by N agencies —
    // which nobody can check and we cannot yet make. This one is our own
    // recommendation, which is a thing a seller is allowed to have, and it is
    // the one the page already argues for: a real pipeline is more than two
    // deals being read at once, so Free cannot serve it.
    badge: 'Recommended',
  },
  {
    name: 'Studio',
    price: '$49',
    cadence: '/mo',
    who: 'For an agency team working one pipeline together.',
    features: [
      { text: 'Everything in Solo' },
      { text: '3 seats', soon: true },
      { text: 'Slack alerts', soon: true },
      { text: 'Your own domain on share links', soon: true },
    ],
    cta: 'Choose Studio',
    unavailable: 'Not open yet — Solo covers everything that works today',
  },
]

export function Pricing() {
  return (
    <>
      {/* Separate cards with gaps, not a seamed table. The featured plan is
          marked by a ring and a lift rather than by a coloured ground: a
          flooded card is the dated pattern, and on a white page an amber one
          reads as a highlighter rather than as emphasis. Colour survives in
          the badge, the checks and the button, which is where it does work.

          The lift is md-only. Stacked on a phone every card is already the
          widest thing on screen, so pulling one up just breaks the rhythm. */}
      <div className="mt-10 grid items-start gap-4 md:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              'flex flex-col rounded-xl border bg-surface px-5 py-6',
              plan.featured
                ? 'border-brand-fill shadow-lg ring-1 ring-brand-fill md:-mt-3 md:pb-8'
                : 'border-line',
            )}
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-display text-base font-semibold tracking-tight">
                {plan.name}
              </p>
              {plan.badge && (
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase',
                    plan.featured
                      ? 'bg-brand-fill text-brand-fill-ink'
                      : 'bg-surface-2 text-ink-2',
                  )}
                >
                  {plan.badge}
                </span>
              )}
            </div>

            <p className="mt-4 flex items-baseline gap-0.5">
              <span className="font-display text-4xl font-semibold tracking-[-0.03em]">
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
              <Button asChild variant={plan.featured ? 'brand' : 'outline'}>
                <Link to={plan.to}>{plan.cta}</Link>
              </Button>
            ) : (
              // A `title` is a desktop hover tooltip: invisible on a phone,
              // invisible to a screen reader on most combinations, and
              // invisible to anyone who does not think to hover a button that
              // is plainly dead. The reason a button cannot be pressed has to
              // be on the page.
              <div>
                <Button
                  type="button"
                  variant={plan.featured ? 'brand' : 'outline'}
                  disabled
                  className="w-full"
                  aria-describedby={`${plan.name}-unavailable`}
                >
                  {plan.cta}
                </Button>
                <p
                  id={`${plan.name}-unavailable`}
                  className="mt-2 text-center text-[12px] text-ink-3"
                >
                  {plan.unavailable}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Choose Solo sends a signed-out reader through sign-in and then on to
          Settings, rather than dropping them on the dashboard to find it
          themselves — see src/lib/auth-redirect.ts. Settings is where the
          upgrade lives either way, and it is the page that knows whether
          Stripe is switched on. */}
      {/* The cap explained where a visitor meets it, rather than only in the
          panel they hit after signing up. Under the cards and not inside the
          Free one: the two lists are deliberately the same but for their first
          line, so that neither plan reads as the thinner product, and three
          extra bullets in one column undoes that. */}
      <p className="mt-6 text-[13px] leading-relaxed text-ink-3">
        What counts toward the free two: a proposal from the moment a client
        opens it, not from when you send it, so sending costs nothing until
        somebody reads. Mark a deal won or lost, or archive one still in play,
        and the slot comes back with its history intact. Nothing is deleted,
        nothing is hidden, and links you have already sent keep tracking either
        way &mdash; a proposal going quiet on your side is not a reason to break
        a link sitting in a client&rsquo;s inbox.
      </p>

      <p className="mt-4 text-[13px] leading-relaxed text-ink-3">
        Choosing Solo asks you to sign in first, because a subscription has to
        attach to an account, and then takes you straight to checkout. You can
        also start free and upgrade later the day two proposals stop being
        enough. Solo is billed by Stripe; cancelling is one click in their
        portal and never touches what you have already sent.
      </p>
    </>
  )
}
