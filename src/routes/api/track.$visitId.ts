import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { getSupabaseAdminClient } from '#/lib/supabase/server'
import { notifyFirstOpen } from '#/lib/notify/first-open'

/**
 * Engagement ingest for the public viewer.
 *
 * Reached by navigator.sendBeacon, which sends text/plain and ignores the
 * response, so the body is parsed by hand and every failure returns 204. A
 * viewer must never see an error because our analytics hiccuped.
 */

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
        const { data: visit } = await supabase
          .from('visits')
          .select('id, share_links!inner(token, revoked_at)')
          .eq('id', visitId.data)
          .eq('share_links.token', token)
          .maybeSingle()

        if (!visit || visit.share_links.revoked_at) return noContent()

        await supabase.rpc('record_engagement', {
          p_visit_id: visitId.data,
          p_engaged_ms: engagedMs,
          p_pages: pages,
        })

        if (events.length > 0) {
          await supabase.from('events').insert(
            events.map((e) => ({
              visit_id: visitId.data,
              type: e.type,
              page_number: e.page ?? null,
              payload: (e.payload ?? null) as never,
            })),
          )
        }

        // The engagement above may have just crossed the qualification line.
        // Best-effort and self-guarding; must never break the 204.
        try {
          await notifyFirstOpen(supabase, visitId.data)
        } catch {
          // A notification hiccup is never the viewer's problem.
        }

        return noContent()
      },
    },
  },
})
