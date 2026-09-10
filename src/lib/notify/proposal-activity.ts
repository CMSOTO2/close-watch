import { publicEnv, serverEnv } from '#/env'
import { locationLabel } from '#/lib/analytics/geo'
import { scoreIntent } from '#/lib/analytics/intent'
import { intentInputFor } from '#/lib/analytics/intent-input'
import { hasUnlimitedPlan } from '#/lib/billing/entitlements'
import type { getSupabaseAdminClient } from '#/lib/supabase/server'
import { ALERT_FLOOR_MS, alertEmail, pickAlert, withinFloor } from './alerts'
import type { Alert, AlertVisit } from './alerts'
import { DEFAULT_FROM, sendEmail } from './resend'

type AdminClient = ReturnType<typeof getSupabaseAdminClient>

type VisitFields = {
  id: string
  visitor_id: string
  started_at: string
  last_seen_at: string
  browser: string | null
  os: string | null
  city: string | null
  country: string | null
}

const VISIT_FIELDS =
  'id, visitor_id, engaged_ms, started_at, last_seen_at, browser, os, city, country'

/**
 * Emails a proposal's owner when a read is worth interrupting them for: the
 * first open, a return after a gap, a new reader, or the score crossing into
 * hot. Which one, and whether at all, is decided by `pickAlert`.
 *
 * Called from the tracking ingest endpoint after every flush. Best-effort in the
 * same way the first-open email always was: each email is claimed atomically
 * before sending (`update … where` the claim is still open) so concurrent
 * beacons cannot double-send, and a failed send gives the claim back so a later
 * flush can retry. The send error is rethrown for the ingest log. Does nothing
 * until RESEND_API_KEY is set, so local and CI runs stay silent.
 */
export async function notifyProposalActivity(
  supabase: AdminClient,
  visitId: string,
): Promise<void> {
  const { RESEND_API_KEY, EMAIL_FROM } = serverEnv()
  if (!RESEND_API_KEY) return

  const { data: visit } = await supabase
    .from('visits')
    .select(
      `${VISIT_FIELDS}, proposal_id, share_link_id, is_bot, is_qualified, alerted_at`,
    )
    .eq('id', visitId)
    .maybeSingle()
  if (!visit || visit.is_bot || !visit.is_qualified) return

  const { data: proposal } = await supabase
    .from('proposals')
    .select(
      'id, title, client_name, owner_id, status, page_count, first_open_notified_at, hot_notified_at, last_alerted_at',
    )
    .eq('id', visit.proposal_id)
    .maybeSingle()
  // A won deal being reread is the client checking what they signed, not a
  // reason to call them.
  if (!proposal || proposal.status === 'won') return

  const now = new Date()
  const lastAlertedAt = proposal.last_alerted_at
    ? new Date(proposal.last_alerted_at)
    : null

  // Every flush of every read arrives here. When nothing is left that this one
  // could send, stop before loading the proposal's history.
  if (
    proposal.first_open_notified_at &&
    proposal.hot_notified_at &&
    (visit.alerted_at || withinFloor(lastAlertedAt, now))
  )
    return

  // The first open is the free plan's email; everything after it is part of
  // what Solo buys. pickAlert always picks the first open while it is unsent,
  // so once it has gone a free account has nothing left to send.
  if (
    proposal.first_open_notified_at &&
    !(await hasUnlimitedPlan(supabase, proposal.owner_id))
  )
    return

  const [
    { data: visits },
    { data: pageViews },
    { data: pricing },
    { data: link },
    { data: owner },
  ] = await Promise.all([
    supabase
      .from('visits')
      .select(VISIT_FIELDS)
      .eq('proposal_id', proposal.id)
      .eq('is_bot', false)
      .eq('is_qualified', true),
    supabase
      .from('page_views')
      .select('visit_id, page_number, engaged_ms')
      .eq('proposal_id', proposal.id),
    supabase
      .from('proposal_pages')
      .select('page_number')
      .eq('proposal_id', proposal.id)
      .eq('section', 'pricing'),
    supabase
      .from('share_links')
      .select('recipient_name, recipient_email')
      .eq('id', visit.share_link_id)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('email')
      .eq('id', proposal.owner_id)
      .maybeSingle(),
  ])
  if (!owner?.email) return

  const all = visits ?? []
  const others = all.filter((v) => v.id !== visit.id)
  const { data: events } = all.length
    ? await supabase
        .from('events')
        .select('visit_id, type')
        .in(
          'visit_id',
          all.map((v) => v.id),
        )
    : { data: [] as Array<{ visit_id: string; type: string }> }

  const pricingPages = new Set((pricing ?? []).map((p) => p.page_number))
  const scoreOf = (subset: typeof all) =>
    scoreIntent(
      intentInputFor({
        pageCount: proposal.page_count,
        visits: subset,
        pageViews: pageViews ?? [],
        events: events ?? [],
        pricingPages,
      }),
    )
  const after = scoreOf(all)

  const alert = pickAlert({
    current: { ...alertVisit(visit), alerted: visit.alerted_at !== null },
    others: others.map(alertVisit),
    firstOpenNotified: proposal.first_open_notified_at !== null,
    hotNotified: proposal.hot_notified_at !== null,
    lastAlertedAt,
    before: scoreOf(others),
    after,
    now,
  })
  if (!alert) return
  if (!(await claim(supabase, alert, proposal.id, visit.id, now))) return

  const earlier = others.filter((v) => v.started_at < visit.started_at)
  const email = alertEmail(alert, {
    title: proposal.title,
    clientName: proposal.client_name,
    recipient: link?.recipient_name ?? link?.recipient_email ?? null,
    thisRead: readLabel(visit),
    earlierReads: [
      ...new Set(earlier.map(readLabel).filter((l): l is string => l !== null)),
    ].slice(0, 3),
    intent: after,
    upsell:
      alert.kind === 'first_open' &&
      !(await hasUnlimitedPlan(supabase, proposal.owner_id)),
    url: `${publicEnv.VITE_PUBLIC_URL.replace(/\/$/, '')}/proposals/${proposal.id}`,
  })

  try {
    await sendEmail({
      apiKey: RESEND_API_KEY,
      from: EMAIL_FROM ?? DEFAULT_FROM,
      to: owner.email,
      ...email,
    })
  } catch (error) {
    // Give the claim back so the next flush tries again rather than the email
    // being lost to a transient send failure.
    await supabase
      .from('proposals')
      .update({
        last_alerted_at: proposal.last_alerted_at,
        ...(alert.kind === 'first_open'
          ? { first_open_notified_at: null }
          : alert.kind === 'went_hot'
            ? { hot_notified_at: null }
            : {}),
      })
      .eq('id', proposal.id)
    await supabase
      .from('visits')
      .update({ alerted_at: visit.alerted_at })
      .eq('id', visit.id)
    throw error
  }
}

/**
 * Takes the right to send `alert`. Every write is conditional on the claim
 * still being open, so of two beacons racing through here exactly one wins.
 */
async function claim(
  supabase: AdminClient,
  alert: Alert,
  proposalId: string,
  visitId: string,
  now: Date,
): Promise<boolean> {
  const stamp = now.toISOString()

  if (alert.kind === 'first_open' || alert.kind === 'went_hot') {
    // Once per proposal, so the proposal column is the claim. The visit is
    // stamped too, so the session that sent it cannot also send a return.
    const { data } = await (
      alert.kind === 'first_open'
        ? supabase
            .from('proposals')
            .update({ first_open_notified_at: stamp, last_alerted_at: stamp })
            .is('first_open_notified_at', null)
        : supabase
            .from('proposals')
            .update({ hot_notified_at: stamp, last_alerted_at: stamp })
            .is('hot_notified_at', null)
    )
      .eq('id', proposalId)
      .select('id')
      .maybeSingle()
    if (!data) return false
    await supabase
      .from('visits')
      .update({ alerted_at: stamp })
      .eq('id', visitId)
    return true
  }

  // A return or a new reader is once per session and held to the floor.
  const { data: session } = await supabase
    .from('visits')
    .update({ alerted_at: stamp })
    .eq('id', visitId)
    .is('alerted_at', null)
    .select('id')
    .maybeSingle()
  if (!session) return false

  const floor = new Date(now.getTime() - ALERT_FLOOR_MS).toISOString()
  const { data: proposal } = await supabase
    .from('proposals')
    .update({ last_alerted_at: stamp })
    .eq('id', proposalId)
    .or(`last_alerted_at.is.null,last_alerted_at.lt."${floor}"`)
    .select('id')
    .maybeSingle()
  if (proposal) return true

  // Another read on this proposal got there first. Leave this session open so
  // it can still send once the floor has passed, if it is still going.
  await supabase.from('visits').update({ alerted_at: null }).eq('id', visitId)
  return false
}

function alertVisit(v: VisitFields): AlertVisit {
  return {
    id: v.id,
    visitorId: v.visitor_id,
    startedAt: new Date(v.started_at),
    lastSeenAt: new Date(v.last_seen_at),
  }
}

/** "Safari · iOS, London, United Kingdom", or whatever part of it is known. */
function readLabel(v: VisitFields): string | null {
  const device = [v.browser, v.os].filter(Boolean).join(' · ')
  const place = locationLabel({ country: v.country, city: v.city })
  return [device, place].filter(Boolean).join(', ') || null
}
