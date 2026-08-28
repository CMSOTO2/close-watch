import { z } from 'zod'

const publicSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().startsWith('sb_publishable_'),
  VITE_PUBLIC_URL: z.string().url().default('http://localhost:3000'),
})

export const publicEnv = publicSchema.parse({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  VITE_PUBLIC_URL: import.meta.env.VITE_PUBLIC_URL,
})

const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().startsWith('sb_secret_'),
  IP_HASH_SALT: z.string().min(8),
})

let cached: z.infer<typeof serverSchema> | null = null

/** Throws on the server if secrets are missing. Never call from client code. */
export function serverEnv() {
  cached ??= serverSchema.parse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    IP_HASH_SALT: process.env.IP_HASH_SALT,
  })
  return cached
}
