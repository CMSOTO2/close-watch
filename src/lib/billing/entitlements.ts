import { createServerFn } from '@tanstack/react-start'
import { queryOptions } from '@tanstack/react-query'
import { getSupabaseServerClient } from '#/lib/supabase/server'
import { serverEnv } from '#/env'
import { FREE_ACTIVE_PROPOSALS, queryKeys } from '#/constants'
import type { BillingPlan } from '#/lib/supabase/types'

export type Entitlements = {
  plan: BillingPlan
  /** Stripe's status, or null on the free plan. */
  status: string | null
  /** Draft and sent. Won, lost and archived are history and cost nothing. */
  activeProposals: number
  /** Null means unlimited. */
  activeProposalLimit: number | null
  canCreateProposal: boolean
  /** Set while a paid plan is running out its notice period. */
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  /** When the plan ends, if it is ending. Preferred over currentPeriodEnd there. */
  cancelAt: string | null
  /** True when the plan was granted rather than bought. No card, nothing to manage. */
  comped: boolean
  /** When a granted plan runs out. Null means it does not. */
  compedUntil: string | null
  /** False until the Stripe keys are on the Worker. The UI says so rather than
   *  offering a button that throws. */
  billingEnabled: boolean
}

/** Statuses Stripe reports while the money is still good. Mirrors has_active_plan. */
const PAYING = new Set(['active', 'trialing', 'past_due'])

export const FREE_ENTITLEMENTS: Entitlements = {
  plan: 'free',
  status: null,
  activeProposals: 0,
  activeProposalLimit: FREE_ACTIVE_PROPOSALS,
  canCreateProposal: true,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
  cancelAt: null,
  comped: false,
  compedUntil: null,
  billingEnabled: false,
}

/**
 * What this account is allowed to do, and how much of its allowance is spent.
 *
 * Nothing here is a security boundary. The cap is a restrictive RLS policy on
 * `proposals`, so a caller who skips this check gets a database error rather
 * than a free upgrade. This exists to say so in a sentence first.
 */
export const getEntitlements = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Entitlements> => {
    const supabase = getSupabaseServerClient()

    // Read straight from the env rather than importing the Stripe module, so
    // nothing can drag the SDK into the client bundle through this file.
    const env = serverEnv()
    const billingEnabled = !!env.STRIPE_SECRET_KEY && !!env.STRIPE_PRICE_SOLO

    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return { ...FREE_ENTITLEMENTS, billingEnabled }

    // Both reads are RLS-scoped to this user: the subscription row by the
    // "read own subscription" policy, the count by "own proposals".
    const [subscription, comp, active] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('plan, status, cancel_at_period_end, cancel_at, current_period_end')
        .maybeSingle(),
      supabase.from('comps').select('plan, until').maybeSingle(),
      supabase
        .from('proposals')
        .select('id', { count: 'exact', head: true })
        .in('status', ['draft', 'sent']),
    ])

    const row = subscription.data
    const paying = !!row && row.plan !== 'free' && PAYING.has(row.status ?? '')

    // Mirrors has_active_plan's second door: a granted plan, still in date.
    const granted = comp.data
    const comped =
      !!granted &&
      granted.plan !== 'free' &&
      (granted.until === null || new Date(granted.until) > new Date())

    const activeProposals = active.count ?? 0
    const limit = paying || comped ? null : FREE_ACTIVE_PROPOSALS

    return {
      // A comp is the plan as far as the product is concerned. Where both
      // exist, the paid one wins: it is the one with a card behind it.
      plan: paying ? row.plan : comped ? granted.plan : 'free',
      status: row?.status ?? null,
      activeProposals,
      activeProposalLimit: limit,
      canCreateProposal: limit === null || activeProposals < limit,
      cancelAtPeriodEnd: row?.cancel_at_period_end ?? false,
      currentPeriodEnd: row?.current_period_end ?? null,
      cancelAt: row?.cancel_at ?? null,
      comped: comped && !paying,
      compedUntil: comped && !paying ? granted.until : null,
      billingEnabled,
    }
  },
)

/**
 * What the user is told when the cap stops them. Also the string the new-proposal
 * form matches on to show the upgrade prompt instead of a red error box, which
 * is why it is a constant rather than a sentence written twice.
 */
export const PROPOSAL_LIMIT_MESSAGE =
  `The free plan holds ${FREE_ACTIVE_PROPOSALS} active proposals at a time. ` +
  'Mark one won, lost or archived to free a slot, or go Solo for unlimited.'

export function isProposalLimitError(error: unknown): boolean {
  return (
    error instanceof Error && error.message.includes(PROPOSAL_LIMIT_MESSAGE)
  )
}

/**
 * Throws if this account is at its cap. Called before the PDF is uploaded so a
 * blocked attempt does not leave a file in storage, and so the user gets this
 * sentence rather than the RLS policy's "new row violates row-level security".
 */
export async function assertCanCreateProposal(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  userId: string,
): Promise<void> {
  const [subscription, active] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('proposals')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .in('status', ['draft', 'sent']),
  ])

  const row = subscription.data
  if (row && row.plan !== 'free' && PAYING.has(row.status ?? '')) return
  if ((active.count ?? 0) < FREE_ACTIVE_PROPOSALS) return

  throw new Error(PROPOSAL_LIMIT_MESSAGE)
}

// refetchOnMount for the same reason the dashboard's queries carry it: the SSR
// pass immediately after login can run before the session is in play, and a
// cached "you are at your limit" is a wall the user cannot clear by trying
// again.
export const entitlementsQuery = queryOptions({
  queryKey: queryKeys.entitlements,
  queryFn: () => getEntitlements(),
  refetchOnMount: 'always',
})
