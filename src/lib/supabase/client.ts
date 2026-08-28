import { createBrowserClient } from '@supabase/ssr'
import { publicEnv } from '#/env'
import type { Database } from './types'

export function getSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    publicEnv.VITE_SUPABASE_URL,
    publicEnv.VITE_SUPABASE_PUBLISHABLE_KEY,
  )
}
