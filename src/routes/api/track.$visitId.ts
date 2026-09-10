import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { getSupabaseAdminClient } from '#/lib/supabase/server'
import { notifyProposalActivity } from '#/lib/notify/proposal-activity'

/**
 * Engagement ingest for the public viewer.
 *
 * Reached by navigator.sendBeacon, which sends text/plain and ignores the
 * response, so the body is parsed by hand and every failure returns 204. A
 * viewer must never see an error because our analytics hiccuped.
 *
 * Returning 204 regardless is right and it used to mean the writes had no
 * reader at all: the rpc and the insert below were awaited and their errors
 * dropped on the floor, so an ingest that had stopped recording anything looked
 * exactly like an ingest with nothing to record. The dashboard would have said
 * "not opened yet" and been believed. Every failure now says so in the Worker
 * log — the response is unchanged, the silence is not.
 */

/**
 * One prefix so `wrangler tail --search ingest` finds all of it, and so a log
 * that matters is not lost among the request lines.
 */
function ingestFailed(what: string, detail: unknown) {
  console.error(`[ingest] ${what}`, detail)
}

const FIFTEEN_MINUTES = 15 * 60 * 1000

const bodySchema = z.object({
  token: z.string().min(8).max(128),
  engagedMs: z.number().int().min(0).max(FIFTEEN_MINUTES),
  pages: z
    .array(
      z.object({
        page: z.number().int().min(1).max(2000),
        ms: z.number().int().min(0).max(FIFTEEN_MINUTES),
      }),
    )
    .max(500)
    .default([]),
  events: z
    .array(
      z.object({
        type: z.enum(['page_enter', 'download', 'print', 'link_click']),
        page: z.number().int().min(1).max(2000).optional(),
        payload: z.unknown().optional(),
      }),
    )
    .max(200)
    .default([]),
})

const noContent = () => new Response(null, { status: 204 })

export const Route = createFileRoute('/api/track/$visitId')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const visitId = z.string().uuid().safeParse(params.visitId)
        if (!visitId.success) return noContent()

        let parsed
        try {
          parsed = bodySchema.safeParse(JSON.parse(await request.text()))
        } catch {
          return noContent()
        }
        if (!parsed.success) return noContent()

        const { token, engagedMs, pages, events } = parsed.data
        const supabase = getSupabaseAdminClient()

        // The visit id alone is a bearer token, so pair it with the share token
        // to make guessing an id useless.
        const { data: visit, error: lookupError } = await supabase
          .from('visits')
          .select('id, share_links!inner(token, revoked_at)')
          .eq('id', visitId.data)
          .eq('share_links.token', token)
          .maybeSingle()

        // A miss here is ordinary — a guessed id, a revoked link. An *error* is
        // not, and it is indistinguishable from a miss without saying so.
        if (lookupError) ingestFailed('visit lookup', lookupError)
        if (!visit || visit.share_links.revoked_at) return noContent()

        // The one write the whole product depends on. If this stops working
        // every number on every dashboard quietly becomes a lie.
        const { error: engagementError } = await supabase.rpc(
          'record_engagement',
          {
            p_visit_id: visitId.data,
            p_engaged_ms: engagedMs,
            p_pages: pages,
          },
        )
        if (engagementError) ingestFailed('record_engagement', engagementError)

        if (events.length > 0) {
          const { error: eventsError } = await supabase.from('events').insert(
            events.map((e) => ({
              visit_id: visitId.data,
              type: e.type,
              page_number: e.page ?? null,
              payload: (e.payload ?? null) as never,
            })),
          )
          if (eventsError) ingestFailed('events insert', eventsError)
        }

        // The engagement above may have just qualified the visit, brought a
        // reader back, or tipped the score into hot. Best-effort and
        // self-guarding; must never break the 204.
        try {
          await notifyProposalActivity(supabase, visitId.data)
        } catch (error) {
          // Never the viewer's problem, but the email is most of the product
          // for anyone who does not open the dashboard, so it is ours.
          ingestFailed('activity email', error)
        }

        return noContent()
      },
    },
  },
})
