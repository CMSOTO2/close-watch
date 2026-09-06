import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { serverEnv } from '#/env'
import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
} from '#/lib/supabase/server'

/**
 * The Studio waitlist, behind the pricing card's only working button.
 *
 * Studio has a price and three features marked "soon", so the honest options
 * were to hide it or to make the button do something. This is the something:
 * the card still anchors $19 against $49, and the click now buys an answer to
 * the question the plan actually turns on — does anyone want seats.
 *
 * A server function rather than a client-side insert. The table has RLS on and
 * no policies, so nothing but the service role can touch it; a public form
 * wired straight to Supabase would be an open write endpoint on a list of
 * email addresses, which is a spam target and a leak in one.
 *
 * Everything server-only lives inside the handler, because the pricing
 * component imports this and the client build strips handler bodies but not
 * module-level imports. Importing the admin client at the top instead drags the
 * service key's module into the browser bundle and the build stops.
 */
export const joinStudioWaitlist = createServerFn({ method: 'POST' })
  .validator(z.object({ email: z.string().trim().min(1).pipe(z.email()) }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const email = data.email.trim()

    // Signed in or not, both are normal here: most people read the pricing page
    // before they have an account. It is recorded when we happen to know it
    // because "an existing user wants seats" is a different fact from "a
    // stranger does", and the difference is the whole reason to collect this.
    const { data: session } = await getSupabaseServerClient().auth.getUser()

    const supabase = getSupabaseAdminClient()
    const { error } = await supabase
      .from('studio_waitlist')
      .insert({ email, user_id: session.user?.id ?? null, source: 'pricing' })

    // 23505 is the unique index on lower(email). Asking twice is not an error
    // to the person asking, and telling them it is would be a strange way to
    // thank someone for volunteering their address.
    if (error && error.code !== '23505') return { ok: false }

    if (!error) await notify(email, session.user?.email ?? null)
    return { ok: true }
  })

/**
 * Tells whoever runs the place. Best-effort in the same shape as the signup and
 * first-open notes: nobody's join fails because Resend was having a moment, and
 * the row is already safely in the table by the time this runs.
 */
async function notify(email: string, accountEmail: string | null) {
  const { RESEND_API_KEY, EMAIL_FROM, SIGNUP_NOTIFY_TO } = serverEnv()
  if (!RESEND_API_KEY || !SIGNUP_NOTIFY_TO) return

  const { count } = await getSupabaseAdminClient()
    .from('studio_waitlist')
    .select('id', { count: 'exact', head: true })

  const lines = [
    `${email} joined the Studio waitlist.`,
    accountEmail && accountEmail !== email
      ? `Signed in at the time as ${accountEmail}.`
      : null,
    count === null ? null : `That makes ${count} on the list.`,
  ].filter((l): l is string => l !== null)

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM ?? 'Closewatch <onboarding@resend.dev>',
        to: SIGNUP_NOTIFY_TO,
        subject: `Studio waitlist: ${email}`,
        text: lines.join('\n'),
      }),
    })
  } catch {
    // Never the volunteer's problem.
  }
}
