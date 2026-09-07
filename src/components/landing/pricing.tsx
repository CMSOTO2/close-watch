import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Check } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { joinStudioWaitlist } from '#/lib/waitlist/studio'
import { cn } from '#/lib/utils'

/**
 * The three plans from POSITIONING.md.
 *
 * Free is not a crippled tier. Every feature is on it and history never
 * expires; the only thing $19 buys is the right to have more than two deals
 * being read at once. A feature gate teaches people the product is worse than
 * it is, and the number that actually predicts whether someone will pay is how
 * many proposals they have in flight.
 *
 * Every card carries the whole list, including the lines it shares with the one
 * beside it. That was briefly moved out to a single "every plan includes" row,
 * which read as correct and looked hollow: three cards holding a price and two
 * lines each, with the substance parked underneath them. A pricing card is
 * where someone decides, and it has to hold enough to decide on.
 *
 * The duplication is therefore deliberate twice over. It is what stops Free
 * looking thinner than Solo — the only entitlement check in the app is the slot
 * counter, and a list implying otherwise teaches people the free plan is a
 * worse product than it is. And it is what makes each card readable alone,
 * which is how they are actually read.
 *
 * What keeps it from reading as three identical columns is `limit`: the one
 * line that is true of this plan and not the next, given its own weight above
 * the list and separated by a rule. That is the dial this product is priced on,
 * and it should be the first thing the eye lands on after the price.
 *
 * None of this is what made the cards different heights. That was `items-start`
 * and a three-column layout starting at md; both are fixed below and neither
 * depends on how long the lists are.
 *
 * Solo points at Settings rather than straight at a checkout: the subscription
 * has to attach to an account, so signing in comes first either way.
 *
 * Studio has no price behind it and now says so with the only working button a
 * plan that does not exist can have. Hiding the card would have cost the anchor
 * that makes $19 read as cheap; leaving it dead cost a click from everyone who
 * wanted it and told us nothing. See src/lib/waitlist/studio.ts.
 *
 * Solo carries the ring, the lift and the solid button. POSITIONING.md's
 * customer is running a pipeline, and a pipeline is by definition more than two
 * deals being read at once, so Free cannot serve them and recommending it
 * wastes their first week. Free keeps its place at the head of the row and a
 * working button, which is the whole try-first path and is not up for
 * negotiation.
 */

type Feature = { text: string; soon?: boolean }

type Plan = {
  name: string
  price: string
  cadence: string | null
  who: string
  /**
   * The one line that is true of this plan and not of the one beside it. Set
   * above the list and against a rule, because it is the whole comparison.
   */
  limit: string
  /** Everything the plan does, shared lines included. See the note above. */
  features: Array<Feature>
  cta: string
  /** Where the button goes. Absent means the plan cannot be bought yet. */
  to?: '/login' | '/settings'
  /** Ring, lift and a solid button. One plan at a time. */
  featured?: boolean
  /**
   * Small caps line above the price. Whatever it says has to be true today:
   * this page is read by people who check, and there is nothing to lose more
   * cheaply than the claim that others already bought.
   */
  badge?: string
}

/**
 * On every plan, free included, and written into each card rather than referred
 * to from one. Repeated on purpose: see the note at the top of this file.
 */
const SHARED: Array<Feature> = [
  { text: 'Tracked links and intent scoring' },
  { text: 'Attention page by page' },
  { text: 'Distinct readers and email alerts' },
  { text: 'Grouping by client, search and heat filtering' },
  { text: 'Full history — nothing expires' },
]

const PLANS: Array<Plan> = [
  {
    name: 'Free',
    price: '$0',
    cadence: null,
    who: 'For trying it on a real proposal this week.',
    limit: '2 proposals being read at a time',
    features: [
      { text: 'Unlimited sending — a slot is spent on being opened' },
      { text: 'Drafts you are still preparing do not count' },
      ...SHARED,
    ],
    cta: 'Start free',
    to: '/login',
  },
  {
    name: 'Solo',
    price: '$19',
    cadence: '/mo',
    who: 'For the person sending every proposal at a small agency.',
    limit: 'Unlimited proposals being read at once',
    // Deliberately Free's list, minus its two cap lines and plus the one that
    // replaces them. The two columns differ by exactly what the plans differ
    // by, which is the only honest way to show a product with no feature gates.
    features: [
      { text: 'Nothing else changes — the cap simply comes off' },
      { text: 'Unlimited sending, and drafts never count' },
      ...SHARED,
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
    // recommendation, which is a thing a seller is allowed to have.
    badge: 'Recommended',
  },
  {
    name: 'Studio',
    price: '$49',
    cadence: '/mo',
    who: 'For an agency team working one pipeline together.',
    limit: 'Everything in Solo, for a team',
    // Features that do not exist yet are marked, not omitted. The plan needs
    // the shape it will have to be worth reading, and a small "soon" is the
    // difference between a roadmap and a page selling three things nobody can
    // deliver.
    features: [
      { text: '3 seats', soon: true },
      { text: 'Slack alerts', soon: true },
      { text: 'Your own domain on share links', soon: true },
      ...SHARED,
    ],
    cta: 'Join the waitlist',
    badge: 'Not open yet',
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

          Three across only from lg. At md the three columns are 229px wide,
          which is narrower than the text in them wants to be: everything wraps,
          and the cards came out 583, 502 and 430 tall in the same row. Two
          breakpoints later they fit.

          Stretch, not `items-start`. Cards sized to their own content is why
          the spacer below could never do its job — a spacer can only push a
          button to the bottom of a card that is already the right height. */}
      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              'flex flex-col rounded-xl border bg-surface px-5 py-6',
              plan.featured
                ? 'border-brand-fill shadow-lg ring-1 ring-brand-fill lg:-mt-3 lg:pb-8'
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

            {/* The difference, given the weight the difference deserves, and
                fenced off by a rule so it does not read as the first bullet.
                Three cards carrying much the same list is only confusing if
                the line that separates them is buried in it. */}
            <p className="mt-5 border-t border-line-soft pt-4 text-[14px] font-medium text-ink">
              {plan.limit}
            </p>

            <ul className="mt-4 flex flex-col gap-2">
              {plan.features.map((feature) => (
                <li
                  key={feature.text}
                  className="flex items-start gap-2 text-[13px] text-ink-2"
                >
                  <Check
                    aria-hidden
                    className="mt-0.5 size-3.5 shrink-0 text-brand-2"
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

            {/* Now that the cards are equal height, this puts every button on
                the same line. */}
            <div className="mt-6 grow" />

            {plan.to ? (
              <Button asChild variant={plan.featured ? 'brand' : 'outline'}>
                <Link to={plan.to}>{plan.cta}</Link>
              </Button>
            ) : (
              <StudioWaitlist cta={plan.cta} />
            )}
          </div>
        ))}
      </div>

      {/* The cap explained where a visitor meets it, rather than only in the
          panel they hit after signing up. */}
      <p className="mt-6 text-[13px] leading-relaxed text-ink-3">
        What counts toward the free two: a proposal from the moment a client
        opens it, not from when you send it, so sending costs nothing until
        somebody reads. Mark a deal won or lost, or archive one still in play,
        and the slot comes back with its history intact. Nothing is deleted,
        nothing is hidden, and links you have already sent keep tracking either
        way &mdash; a proposal going quiet on your side is not a reason to break
        a link sitting in a client&rsquo;s inbox.
      </p>

      {/* Choose Solo sends a signed-out reader through sign-in and then on to
          Settings, rather than dropping them on the dashboard to find it
          themselves — see src/lib/auth-redirect.ts. Settings is where the
          upgrade lives either way, and it is the page that knows whether
          Stripe is switched on. */}
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

/**
 * The Studio card's button, which is a form.
 *
 * Collapsed to a button until it is pressed, so the card keeps the shape of the
 * two beside it and nobody is asked for an address before they have shown any
 * interest in giving one. The failure state says the plain thing rather than a
 * code: there is nothing the visitor can do about our database, and they were
 * doing us the favour.
 */
function StudioWaitlist({ cta }: { cta: string }) {
  const [state, setState] = useState<
    'idle' | 'open' | 'sending' | 'done' | 'failed'
  >('idle')
  const [email, setEmail] = useState('')

  if (state === 'done') {
    return (
      <p className="rounded-md border border-line bg-surface-2/60 px-3 py-2.5 text-center text-[13px] text-ink-2">
        On the list. We will write when Studio opens.
      </p>
    )
  }

  if (state === 'idle') {
    return (
      <Button type="button" variant="outline" onClick={() => setState('open')}>
        {cta}
      </Button>
    )
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setState('sending')
        try {
          const res = await joinStudioWaitlist({ data: { email } })
          setState(res.ok ? 'done' : 'failed')
        } catch {
          setState('failed')
        }
      }}
    >
      <label
        htmlFor="studio-waitlist-email"
        className="mb-1.5 block text-[12px] font-medium text-ink-2"
      >
        Where should we write?
      </label>
      <input
        id="studio-waitlist-email"
        type="email"
        name="email"
        required
        autoComplete="email"
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@studio.com"
        className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink transition-colors placeholder:text-ink-3 hover:border-ink-3 focus-visible:border-brand-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
      />
      <Button
        type="submit"
        variant="outline"
        className="mt-2 w-full"
        disabled={state === 'sending'}
      >
        {state === 'sending' ? 'Adding…' : cta}
      </Button>
      {state === 'failed' && (
        <p className="mt-2 text-center text-[12px] text-danger">
          That did not save. Try again in a moment.
        </p>
      )}
    </form>
  )
}
