/**
 * The one way this app sends email: Resend's HTTP API, which works from the
 * Cloudflare Worker with no SMTP. Throws on anything but a 2xx so the caller
 * can roll back whatever claim it made before sending.
 */

export const DEFAULT_FROM = 'Closewatch <onboarding@resend.dev>'

export type Email = {
  apiKey: string
  from: string
  to: string
  subject: string
  text: string
  html: string
}

export async function sendEmail({ apiKey, ...email }: Email): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(email),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Resend ${res.status}: ${body.slice(0, 200)}`)
  }
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
