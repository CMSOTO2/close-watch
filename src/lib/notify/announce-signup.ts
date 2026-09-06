import { createServerFn } from '@tanstack/react-start'
import { notifySignup } from '#/lib/notify/signup'
import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
} from '#/lib/supabase/server'

/**
 * The signed-in caller announcing themselves.
 *
 * Password signup with email confirmation switched off never passes through
 * /auth/callback — the client holds a session the moment signUp resolves — so
 * that path calls this instead. It takes no arguments and reads the session for
 * the id, so the most anyone can do with it is announce their own signup, once.
 *
 * It lives apart from notify/signup.ts because the login form imports it, and
 * everything server-only here sits inside the handler, which the client build
 * strips. Importing notifySignup directly from a component instead drags the
 * admin client into the browser bundle and the build stops.
 */
export const announceSignup = createServerFn({ method: 'POST' }).handler(
  async (): Promise<void> => {
    const { data } = await getSupabaseServerClient().auth.getUser()
    if (!data.user) return
    try {
      await notifySignup(getSupabaseAdminClient(), data.user.id)
    } catch {
      // Never the new user's problem.
    }
  },
)
