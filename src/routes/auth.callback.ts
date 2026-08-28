import { createFileRoute } from '@tanstack/react-router'
import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from '@supabase/ssr'
import { publicEnv } from '#/env'
import type { Database } from '#/lib/supabase/types'

export const Route = createFileRoute('/auth/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const code = url.searchParams.get('code')

        // We build the redirect and attach Set-Cookie headers ourselves.
        // Response.redirect() returns a response whose headers are immutable,
        // so the session cookies written during exchangeCodeForSession never
        // made it to the browser — the user came back still signed out.
        const headers = new Headers()
        const redirectTo = (path: string) => {
          headers.set('Location', new URL(path, url.origin).toString())
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

        const { error } = await supabase.auth.exchangeCodeForSession(code)
        return redirectTo(error ? '/login?error=auth' : '/dashboard')
      },
    },
  },
})
