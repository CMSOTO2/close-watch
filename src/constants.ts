import { publicEnv } from '#/env'
import type { PageSection } from '#/lib/supabase/types'

// --- PDF upload -------------------------------------------------------------
// The size cap is enforced in three places (client field, server fn, storage
// bucket); keep this the single source the app code reads.
export const PDF_MAX_MB = 10
export const PDF_MAX_BYTES = PDF_MAX_MB * 1024 * 1024
export const PDF_MAX_PAGES = 500
export const PDF_MIME = 'application/pdf'

// --- Storage ----------------------------------------------------------------
/** Private bucket holding proposal PDFs. Distinct from the `proposals` table. */
export const PROPOSALS_BUCKET = 'proposals'

// --- Page sections ----------------------------------------------------------
export const PAGE_SECTIONS = [
  'cover',
  'summary',
  'scope',
  'timeline',
  'pricing',
  'terms',
  'case_study',
  'team',
  'other',
] as const satisfies ReadonlyArray<PageSection>

export const SECTION_LABELS: Record<PageSection, string> = {
  cover: 'Cover',
  summary: 'Summary',
  scope: 'Scope',
  timeline: 'Timeline',
  pricing: 'Pricing',
  terms: 'Terms',
  case_study: 'Case study',
  team: 'Team',
  other: 'Other',
}

// --- Plans ------------------------------------------------------------------
/**
 * Live proposals a free account may have at once. Live means sent: it has at
 * least one share link and a client can open it. Closing a deal or archiving it
 * gives the slot back, so the free plan is a standing offer rather than a
 * two-use trial.
 *
 * Drafts do not count. The cap used to include them, which meant someone could
 * upload three PDFs on their first evening, share none, and meet a paywall
 * having received nothing from the product.
 *
 * The enforced copy of this number lives in `can_send_proposal` in
 * supabase/migrations/20260902000500_send_cap.sql. Change one, change both.
 */
export const FREE_LIVE_PROPOSALS = 2

/**
 * Drafts a free account may stack up. Loose on purpose: a draft costs storage
 * and nothing else, and this exists so one account cannot upload into the
 * bucket forever, not to sell anything. A real user should never meet it.
 *
 * Enforced by `can_create_proposal` in the same migration.
 */
export const FREE_DRAFT_PROPOSALS = 10

// --- Share links ------------------------------------------------------------
/**
 * How long a new share link stays valid before it auto-expires. A link is a
 * capability URL (anyone holding it can view), so an expiry caps the damage
 * from a forwarded or leaked link. Owners can still revoke sooner.
 */
export const SHARE_LINK_TTL_DAYS = 60

/** Full public viewer URL for a share token. */
export function shareUrl(token: string): string {
  return `${publicEnv.VITE_PUBLIC_URL.replace(/\/$/, '')}/p/${token}`
}

// --- React Query keys -------------------------------------------------------
export const queryKeys = {
  profile: ['profile'] as const,
  securedTotals: ['secured-totals'] as const,
  proposalSummaries: ['proposal-summaries'] as const,
  entitlements: ['entitlements'] as const,
  proposal: (id: string) => ['proposal', id] as const,
  proposalAnalytics: (id: string) => ['proposal-analytics', id] as const,
}
