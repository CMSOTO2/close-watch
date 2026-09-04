import { createFileRoute } from '@tanstack/react-router'
import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from '@supabase/ssr'
import { publicEnv } from '#/env'
import {
  AFTER_SIGN_IN,
  expiredNextCookie,
  readNextCookie,
  safeNext,
} from '#/lib/auth-redirect'
import { notifySignup } from '#/lib/notify/signup'
import { getSupabaseAdminClient } from '#/lib/supabase/server'
import type { Database } from '#/lib/supabase/types'

export const Route = createFileRoute('/auth/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const code = url.searchParams.get('code')

        // Where they were going before sign-in interrupted them. The cookie is
        // the real channel; the query parameter is here because it costs
        // nothing and makes this route testable by hand. Both go through
        // safeNext, because both are written by whoever holds the browser.
        const next =
          safeNext(url.searchParams.get('next')) ??
          readNextCookie(request.headers.get('cookie'))

        // We build the redirect and attach Set-Cookie headers ourselves.
        // Response.redirect() returns a response whose headers are immutable,
        // so the session cookies written during exchangeCodeForSession never
        // made it to the browser — the user came back still signed out.
        const headers = new Headers()
        const redirectTo = (path: string) => {
          headers.set('Location', new URL(path, url.origin).toString())
          // Cleared on every exit, taken or not. A destination left behind
          // would quietly redirect somebody's next sign-in.
          headers.append('set-cookie', expiredNextCookie())
          return new Response(null, { status: 302, headers })
        }

        if (!code) return redirectTo('/login')

        const supabase = createServerClient<Database>(
          publicEnv.VITE_SUPABASE_URL,
          publicEnv.VITE_SUPABASE_PUBLISHABLE_KEY,
          {
            cookies: {
              // The PKCE code verifier the browser stored comes in on the
              // request; the exchange needs it to complete.
              getAll() {
                return parseCookieHeader(request.headers.get('cookie') ?? '')
              },
              setAll(cookies) {
                for (const { name, value, options } of cookies) {
                  headers.append(
                    'set-cookie',
                    serializeCookieHeader(name, value, options),
                  )
                }
              },
            },
          },
        )

        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) return redirectTo('/login?error=auth')

        // Every way in that hands back a session lands here — magic link,
        // Google, and the confirmation link on a password signup — so this is
        // where a new account announces itself. notifySignup sends once per
        // account, so a returning user signing in costs one no-op update.
        try {
          await notifySignup(getSupabaseAdminClient(), data.user.id)
        } catch {
          // Signing in never fails because we could not send a note about it.
        }

        return redirectTo(next ?? AFTER_SIGN_IN)
      },
    },
  },
})
