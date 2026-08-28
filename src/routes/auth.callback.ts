import { createFileRoute } from '@tanstack/react-router'
import { getSupabaseServerClient } from '#/lib/supabase/server'

export const Route = createFileRoute('/auth/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const code = new URL(request.url).searchParams.get('code')
        if (!code) return Response.redirect(new URL('/login', request.url), 302)

        const { error } = await getSupabaseServerClient().auth.exchangeCodeForSession(code)
        const target = error ? '/login?error=auth' : '/dashboard'

        return Response.redirect(new URL(target, request.url), 302)
      },
    },
  },
})
