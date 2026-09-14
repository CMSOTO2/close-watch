import { createServerFn } from '@tanstack/react-start'
import {
  getCookie,
  getRequest,
  getRequestHeader,
  getRequestIP,
  setCookie,
} from '@tanstack/react-start/server'
import { createHash, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { isShareToken, senderName, senderSlug } from '#/constants'
import { serverEnv } from '#/env'
import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
} from '#/lib/supabase/server'
import { OWNER_PREVIEW, detectBot, parseUserAgent } from './bots'
import { requestGeo } from './geo'
import type { Geo } from './geo'

const VISITOR_COOKIE = 'cw_vid'
/** Gap after which a return counts as a new visit rather than the same read. */
const SESSION_GAP_MS = 30 * 60 * 1000

export type VisitContext = {
  visitId: string
  pdfUrl: string
  pageCount: number
  title: string
  senderName: string | null
  /** The owner is reading their own link; nothing here counts as a client read. */
  ownerPreview: boolean
}

/**
 * What opening a share link comes to: a visit to render, or the address the
 * link should be at. `slug` null is the plain /p/{token} form.
 */
export type ShareResolution =
  | { kind: 'visit'; visit: VisitContext }
  | { kind: 'redirect'; slug: string | null }

/**
 * Whether the person opening the link is signed in as the proposal's owner.
 *
 * getUser rather than getSession, for the reason lib/auth gives: the cookie
 * alone is not proof, and a forged one must not be able to turn a client's
 * read into an uncounted preview. Any failure answers no, which is the old
 * behaviour of treating the owner as a reader.
 */
async function viewerOwns(ownerId: string): Promise<boolean> {
  try {
    const { data } = await getSupabaseServerClient().auth.getUser()
    return data.user?.id === ownerId
  } catch {
    return false
  }
}

/**
 * Opens (or resumes) a viewing session for a share token and hands the client
 * everything it needs to render. Runs only on the server: the publishable key
 * never sees these tables.
 */
export const beginVisit = createServerFn({ method: 'GET' })
  // Deliberately unbounded here. Enforcing the token's shape in the validator
  // throws inside the server function, and that surfaces to the reader as a
  // 500 and the generic error page — which is what a truncated or mangled URL
  // used to get. The shape is checked in the handler instead, where failing it
  // returns null and the route renders the same "no longer available" page as
  // a revoked link.
  .validator(z.object({ token: z.string(), slug: z.string().optional() }))
  .handler(async ({ data }): Promise<ShareResolution | null> => {
    if (!isShareToken(data.token)) return null

    const supabase = getSupabaseAdminClient()

    const { data: link } = await supabase
      .from('share_links')
      .select(
        'id, revoked_at, expires_at, proposals!inner(id, owner_id, title, page_count, storage_path, folders(sender_name), profiles!inner(full_name, company_name))',
      )
      .eq('token', data.token)
      .maybeSingle()

    if (!link || link.revoked_at) return null
    if (link.expires_at && new Date(link.expires_at) < new Date()) return null

    const proposal = link.proposals
    // The name its folder sends as, when it is in one that has a name for
    // clients; otherwise the account's own.
    const sender =
      proposal.folders?.sender_name ?? senderName(proposal.profiles)

    // The name in the URL is the sender's, not the reader's to choose. Any
    // other name, including none at all on a link sent before names were in
    // links, goes to the real one before a visit is recorded. So a rename
    // never breaks a link already sent, and nobody can dress their own link up
    // as another company's.
    const canonical = senderSlug(sender)
    if ((data.slug ?? null) !== canonical) {
      return { kind: 'redirect', slug: canonical }
    }

    // Trying the product on yourself is the first thing a new account should
    // do, and it used to cost them: their own read spent one of the free
    // plan's two slots and claimed the first-open email the client's real
    // open should have sent. See OWNER_PREVIEW.
    const ownerPreview = await viewerOwns(proposal.owner_id)

    const userAgent = getRequestHeader('user-agent')
    const { isBot, reason } = ownerPreview
      ? { isBot: true, reason: OWNER_PREVIEW }
      : detectBot(userAgent)
    const device = parseUserAgent(userAgent)

    // First-party, httpOnly. It only ever needs to be read on the server, and
    // keeping it out of JS means an ad blocker cannot quietly break returning
    // visitor detection.
    let visitorId = getCookie(VISITOR_COOKIE)
    if (!visitorId) {
      visitorId = randomUUID()
      setCookie(VISITOR_COOKIE, visitorId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      })
    }

    // Resume rather than create if they refreshed or came back within the hour.
    const { data: recent } = await supabase
      .from('visits')
      .select('id, visit_seq, last_seen_at')
      .eq('share_link_id', link.id)
      .eq('visitor_id', visitorId)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let visitId: string

    if (
      recent &&
      Date.now() - new Date(recent.last_seen_at).getTime() < SESSION_GAP_MS
    ) {
      visitId = recent.id
    } else {
      const ip = getRequestIP({ xForwardedFor: true })
      const ipHash = ip
        ? createHash('sha256')
            .update(`${serverEnv().IP_HASH_SALT}:${ip}`)
            .digest('hex')
            .slice(0, 32)
        : null

      // Only on a new visit: a resumed read is the same person in the same
      // place, and re-reading it would just cost a header parse per beacon.
      //
      // Guarded because location is the least important column on this row and
      // the row itself is the product. Nothing about reading a header should
      // ever be what stops a visit from being recorded.
      let geo: Geo = { country: null, city: null }
      try {
        geo = requestGeo(getRequest())
      } catch {
        // No request context to read; the visit still counts.
      }

      const { data: created, error } = await supabase
        .from('visits')
        .insert({
          share_link_id: link.id,
          proposal_id: proposal.id,
          visitor_id: visitorId,
          visit_seq: (recent?.visit_seq ?? 0) + 1,
          device_type: device.deviceType,
          os: device.os,
          browser: device.browser,
          referrer: getRequestHeader('referer') ?? null,
          country: geo.country,
          city: geo.city,
          ip_hash: ipHash,
          is_bot: isBot,
          bot_reason: reason,
        })
        .select('id')
        .maybeSingle()

      if (error || !created) return null
      visitId = created.id
    }

    const { data: signed } = await supabase.storage
      .from('proposals')
      .createSignedUrl(proposal.storage_path, 60 * 60)

    if (!signed) return null

    return {
      kind: 'visit',
      visit: {
        visitId,
        pdfUrl: signed.signedUrl,
        pageCount: proposal.page_count,
        title: proposal.title,
        senderName: sender,
        ownerPreview,
      },
    }
  })
