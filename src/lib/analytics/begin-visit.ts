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
import { isShareToken } from '#/constants'
import { serverEnv } from '#/env'
import { getSupabaseAdminClient } from '#/lib/supabase/server'
import { detectBot, parseUserAgent } from './bots'
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
  .validator(z.object({ token: z.string() }))
  .handler(async ({ data }): Promise<VisitContext | null> => {
    if (!isShareToken(data.token)) return null

    const supabase = getSupabaseAdminClient()

    const { data: link } = await supabase
      .from('share_links')
      .select(
        'id, revoked_at, expires_at, proposals!inner(id, title, page_count, storage_path, profiles!inner(full_name, company_name))',
      )
      .eq('token', data.token)
      .maybeSingle()

    if (!link || link.revoked_at) return null
    if (link.expires_at && new Date(link.expires_at) < new Date()) return null

    const proposal = link.proposals

    const userAgent = getRequestHeader('user-agent')
    const { isBot, reason } = detectBot(userAgent)
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

    const sender = proposal.profiles

    return {
      visitId,
      pdfUrl: signed.signedUrl,
      pageCount: proposal.page_count,
      title: proposal.title,
      senderName: sender.company_name ?? sender.full_name,
    }
  })
