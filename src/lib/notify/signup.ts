import { serverEnv } from '#/env'
import type { getSupabaseAdminClient } from '#/lib/supabase/server'
import { DEFAULT_FROM, escapeHtml, sendEmail } from './resend'

type AdminClient = ReturnType<typeof getSupabaseAdminClient>

/**
 * Sends the "someone signed up" email to whoever runs the place — once per
 * account, the first time a new user reaches a session.
 *
 * Best-effort in the same way as the activity emails: every failure is
 * swallowed so a signup never fails because we could not send a note about it,
 * and the claim is rolled back on a send failure so the user's next sign-in
 * retries. Silent until both RESEND_API_KEY and SIGNUP_NOTIFY_TO are set.
 */
export async function notifySignup(
  supabase: AdminClient,
  userId: string,
): Promise<void> {
  const { RESEND_API_KEY, EMAIL_FROM, SIGNUP_NOTIFY_TO } = serverEnv()
  if (!RESEND_API_KEY || !SIGNUP_NOTIFY_TO) return

  // Claim atomically. The update only matches while the column is still null,
  // so a magic link opened twice, or a callback the browser retries, still
  // sends exactly one email. Existing accounts were backfilled by the
  // migration, which is why signing in is not mistaken for signing up.
  const { data: claimed } = await supabase
    .from('profiles')
    .update({ signup_notified_at: new Date().toISOString() })
    .eq('id', userId)
    .is('signup_notified_at', null)
    .select('id, email, full_name, company_name')
    .maybeSingle()
  if (!claimed) return

  // The running total is the part worth reading. head:true asks for the count
  // without the rows.
  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })

  try {
    await sendEmail({
      apiKey: RESEND_API_KEY,
      from: EMAIL_FROM ?? DEFAULT_FROM,
      to: SIGNUP_NOTIFY_TO,
      ...signupEmail({
        email: claimed.email,
        fullName: claimed.full_name,
        companyName: claimed.company_name,
        total: count ?? null,
      }),
    })
  } catch {
    // Undo the claim so their next sign-in tries again rather than the signup
    // going unannounced because Resend was having a moment.
    await supabase
      .from('profiles')
      .update({ signup_notified_at: null })
      .eq('id', claimed.id)
  }
}

function signupEmail(input: {
  email: string | null
  fullName: string | null
  companyName: string | null
  total: number | null
}) {
  const who = input.email ?? 'an account with no email on it'
  const details = [
    input.fullName ? `Name: ${input.fullName}` : null,
    input.companyName ? `Company: ${input.companyName}` : null,
    input.total === null ? null : `That makes ${input.total} accounts.`,
  ].filter((line): line is string => line !== null)

  const text = [`${who} just signed up for Closewatch.`, '', ...details].join(
    '\n',
  )

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.5;color:#171717">
      <p><strong>${escapeHtml(who)}</strong> just signed up for Closewatch.</p>
      ${details.map((line) => `<p style="color:#525252">${escapeHtml(line)}</p>`).join('')}
    </div>`

  return { subject: `New Closewatch signup: ${who}`, text, html }
}
