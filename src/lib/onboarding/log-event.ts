import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
} from '#/lib/supabase/server'

/**
 * Records one step of the new-proposal funnel: opened the form, chose a file,
 * a read or submit that failed, or a proposal that made it all the way
 * through. Exists because the proposals table only ever sees the last of
 * those, and three real signups in a row stopped somewhere before it.
 *
 * A server function using the admin client rather than a client-side insert,
 * same as `joinStudioWaitlist` — the table has RLS on and no policies, so a
 * public write path straight to Supabase would let anyone log events into
 * someone else's account.
 *
 * Best-effort by design: a step that fails to log is a gap in the funnel
 * data, not a reason to interrupt someone uploading a proposal.
 */
export const logOnboardingEvent = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      step: z.enum([
        'form_opened',
        'file_selected',
        'pdf_read_failed',
        'submit_failed',
        'proposal_created',
      ]),
      // Truncated here, not just at the call site: whatever calls this is
      // free to hand over a raw Error#message.
      detail: z.string().trim().max(300).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { data: auth } = await getSupabaseServerClient().auth.getUser()
    if (!auth.user) return { ok: false }

    await getSupabaseAdminClient().from('onboarding_events').insert({
      user_id: auth.user.id,
      step: data.step,
      detail: data.detail ?? null,
    })

    return { ok: true }
  })
