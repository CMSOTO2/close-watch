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
  proposalSummaries: ['proposal-summaries'] as const,
  proposal: (id: string) => ['proposal', id] as const,
  proposalAnalytics: (id: string) => ['proposal-analytics', id] as const,
}
