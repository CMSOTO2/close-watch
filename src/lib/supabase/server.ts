import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { getCookies, setCookie } from '@tanstack/react-start/server'
import { publicEnv, serverEnv } from '#/env'
import type { Database } from './types'

/**
 * Request-scoped client that carries the signed-in user's session.
 * Every query it runs is subject to RLS.
 */
export function getSupabaseServerClient() {
  return createServerClient<Database>(
    publicEnv.VITE_SUPABASE_URL,
    publicEnv.VITE_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return Object.entries(getCookies()).map(([name, value]) => ({
            name,
            value,
          }))
        },
        setAll(cookies) {
          for (const { name, value, options } of cookies) {
            setCookie(name, value, options)
          }
        },
      },
    },
  )
}

/**
 * Bypasses RLS. Only two callers should ever exist: the public viewer loader
 * and the tracking ingest endpoint, both of which authorise by share token
 * before touching anything.
 */
export function getSupabaseAdminClient() {
  return createClient<Database>(
    publicEnv.VITE_SUPABASE_URL,
    serverEnv().SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
