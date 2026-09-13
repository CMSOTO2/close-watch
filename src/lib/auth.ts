import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '#/lib/supabase/server'

export type SessionUser = {
  id: string
  email: string | null
  fullName: string | null
  /** The name clients see. Null until the welcome step asks for it. */
  companyName: string | null
}

/**
 * Uses getUser(), not getSession(). getSession() trusts whatever is in the
 * cookie; getUser() verifies the JWT with Supabase. On a route that gates
 * someone else's proposal data, that difference matters.
 */
export const getSessionUser = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SessionUser | null> => {
    const supabase = getSupabaseServerClient()
    const { data, error } = await supabase.auth.getUser()
    if (error) return null

    // Read here rather than by each page because the app shell's guard needs
    // it on every signed-in route: no name, no sending (see _authed.tsx).
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_name')
      .eq('id', data.user.id)
      .maybeSingle()

    return {
      companyName: profile?.company_name ?? null,
      id: data.user.id,
      email: data.user.email ?? null,
      fullName:
        (data.user.user_metadata.full_name as string | undefined) ?? null,
    }
  },
)
