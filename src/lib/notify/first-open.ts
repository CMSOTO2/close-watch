import { publicEnv, serverEnv } from '#/env'
import type { getSupabaseAdminClient } from '#/lib/supabase/server'

type AdminClient = ReturnType<typeof getSupabaseAdminClient>

/**
 * Sends the "someone opened your proposal" email — once per proposal, on the
 * first qualified, human open.
 *
 * Called from the tracking ingest endpoint after engagement is recorded. It is
 * best-effort: every failure is swallowed so a viewer never sees an error, and
 * the claim is rolled back on a send failure so a later open can retry. Does
 * nothing until RESEND_API_KEY is set, so local and CI runs stay silent.
 */
export async function notifyFirstOpen(
  supabase: AdminClient,
  visitId: string,
): Promise<void> {
  const { RESEND_API_KEY, EMAIL_FROM } = serverEnv()
  if (!RESEND_API_KEY) return

  // Only a genuine, qualified, human read counts as an "open".
  const { data: visit } = await supabase
    .from('visits')
    .select('proposal_id, share_link_id, is_bot, is_qualified')
    .eq('id', visitId)
    .maybeSingle()
  if (!visit || visit.is_bot || !visit.is_qualified) return

  // Claim the notification atomically. The update only matches while the column
  // is still null, so exactly one concurrent beacon wins and sends.
  const { data: claimed } = await supabase
    .from('proposals')
    .update({ first_open_notified_at: new Date().toISOString() })
    .eq('id', visit.proposal_id)
    .is('first_open_notified_at', null)
    .select('id, title, client_name, owner_id')
    .maybeSingle()
  if (!claimed) return

  const [{ data: owner }, { data: link }] = await Promise.all([
    supabase
      .from('profiles')
      .select('email')
      .eq('id', claimed.owner_id)
      .maybeSingle(),
    supabase
      .from('share_links')
      .select('recipient_name, recipient_email')
      .eq('id', visit.share_link_id)
      .maybeSingle(),
  ])

  if (!owner?.email) return

  const who = link?.recipient_name ?? link?.recipient_email ?? 'Someone'
  const url = `${publicEnv.VITE_PUBLIC_URL.replace(/\/$/, '')}/proposals/${claimed.id}`

  try {
    await sendEmail({
      apiKey: RESEND_API_KEY,
      from: EMAIL_FROM ?? 'Closewatch <onboarding@resend.dev>',
      to: owner.email,
      subject: `${who} opened "${claimed.title}" proposal`,
      proposalTitle: claimed.title,
      clientName: claimed.client_name,
      who,
      url,
    })
  } catch {
    // Undo the claim so the next qualified open tries again rather than the
    // notification being lost to a transient send failure.
    await supabase
      .from('proposals')
      .update({ first_open_notified_at: null })
      .eq('id', claimed.id)
  }
}

type EmailInput = {
  apiKey: string
  from: string
  to: string
  subject: string
  proposalTitle: string
  clientName: string
  who: string
  url: string
}

async function sendEmail(input: EmailInput): Promise<void> {
  const text = [
    `${input.who} just opened your proposal "${input.proposalTitle}" for ${input.clientName}.`,
    '',
    `See what they read: ${input.url}`,
  ].join('\n')

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.5;color:#171717">
      <p><strong>${escapeHtml(input.who)}</strong> just opened your proposal
      &ldquo;${escapeHtml(input.proposalTitle)}&rdquo; for ${escapeHtml(input.clientName)}.</p>
      <p><a href="${input.url}" style="color:#2563eb">See what they read →</a></p>
    </div>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${input.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: input.from,
      to: input.to,
      subject: input.subject,
      text,
      html,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Resend ${res.status}: ${body.slice(0, 200)}`)
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
