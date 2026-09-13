import { publicEnv } from '#/env'
import type { PageSection } from '#/lib/supabase/types'

// --- PDF upload -------------------------------------------------------------
// The size cap is enforced in three places (client field, server fn, storage
// bucket); keep this the single source the app code reads.
export const PDF_MAX_MB = 25
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

// --- Reading ----------------------------------------------------------------
/**
 * How long a page must hold a reader's attention before we will say they read
 * it, in milliseconds.
 *
 * Deliberately the same three seconds `record_engagement` uses to decide a
 * visit was a person rather than a scanner: the argument is identical one page
 * down. Below this a page was on screen, which is not the same thing and must
 * not be reported as if it were — scrolling from page 2 to the end of a
 * document sweeps every page in between across the viewport, and crediting
 * those as read inflates the one number this product is bought for.
 *
 * Time is credited to a page in proportion to how much of the window it holds
 * (see `pageWeights`), so this is three seconds of a full screen, or six of
 * half of one. It reads conservative on purpose.
 */
export const PAGE_READ_MS = 3_000

// --- Share links ------------------------------------------------------------
/**
 * How long a new share link stays valid before it auto-expires. A link is a
 * capability URL (anyone holding it can view), so an expiry caps the damage
 * from a forwarded or leaked link. Owners can still revoke sooner.
 */
export const SHARE_LINK_TTL_DAYS = 60

/**
 * Shape of a token `newToken()` issues: URL-safe base64, 24 characters today.
 * The bound is loose rather than exactly 24 so a link issued before any change
 * to the byte length still resolves.
 */
const SHARE_TOKEN = /^[A-Za-z0-9_-]{8,128}$/

/**
 * Whether a string could be a token we issued. A URL failing this is a dead
 * link, not a bad request: mail clients truncate links, people paste half of
 * one, and a link tweeted with the trailing character eaten is the same shape
 * of accident. Every one of those readers should land on "no longer available"
 * rather than an error page.
 */
export function isShareToken(token: string): boolean {
  return SHARE_TOKEN.test(token)
}

/**
 * Shape of a proposal id, which is a database uuid.
 *
 * Same reasoning as isShareToken above, for the other identifier that reaches
 * us straight from a URL. The detail route hands its $id to a server function
 * that validates `z.uuid()`, so anything not uuid-shaped — a crawler following
 * a mangled link, a truncated paste, someone typing /proposals/pricing — threw
 * a raw Zod error out of the loader and rendered the generic something-went-
 * wrong page. That is a 500 for what is plainly a 404: the route already has a
 * notFoundComponent for a proposal that does not exist, and an id that could
 * never exist belongs there too.
 */
const PROPOSAL_ID =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

/** Whether a string could be an id we issued. Existence is the database's call. */
export function isProposalId(id: string): boolean {
  return PROPOSAL_ID.test(id)
}

/**
 * The name a client sees for the sender: the company when one is set,
 * otherwise the person. One rule for the viewer's "from" line, "Sent by" on
 * the detail page and the name in a share link, so the three cannot disagree.
 */
export function senderName(profile: {
  company_name: string | null
  full_name: string | null
}): string | null {
  return profile.company_name ?? profile.full_name ?? null
}

const SLUG_MAX = 40

/**
 * The sender's name as a URL segment: "25 Dials" becomes "25-dials".
 *
 * Accents are folded ("Café Noir" becomes "cafe-noir") and everything else
 * that is not a letter or digit becomes a hyphen. A name with nothing left to
 * spell, such as one written entirely in another script, has no slug, and its
 * links keep the plain /p/{token} form rather than a made-up one.
 */
export function senderSlug(name: string | null): string | null {
  if (!name) return null
  const slug = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/, '')
  return slug || null
}

/** The path a share link opens at, with the sender's name in it when there is one. */
export function sharePath(token: string, name: string | null): string {
  const slug = senderSlug(name)
  return slug ? `/p/${slug}/${token}` : `/p/${token}`
}

/**
 * Full public viewer URL for a share token.
 *
 * The name is for the client's benefit, not access: the token alone opens the
 * document. The viewer sends any other name to the sender's real one before it
 * records anything (see beginVisit), so a rename cannot break a link that has
 * already gone out, and nobody can put another company's name on theirs.
 */
export function shareUrl(token: string, name: string | null): string {
  return `${publicEnv.VITE_PUBLIC_URL.replace(/\/$/, '')}${sharePath(token, name)}`
}

// --- React Query keys -------------------------------------------------------
export const queryKeys = {
  profile: ['profile'] as const,
  securedTotals: ['secured-totals'] as const,
  proposalSummaries: ['proposal-summaries'] as const,
  entitlements: ['entitlements'] as const,
  activeDiscount: ['active-discount'] as const,
  proposal: (id: string) => ['proposal', id] as const,
  proposalAnalytics: (id: string) => ['proposal-analytics', id] as const,
}
