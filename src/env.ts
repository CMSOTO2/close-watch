import { z } from 'zod'

const publicSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().startsWith('sb_publishable_'),
  VITE_PUBLIC_URL: z.string().url().default('http://localhost:3000'),
  // Optional. Site token from Cloudflare dashboard -> Web Analytics. Empty
  // means no beacon is rendered, which is what happens in dev and in CI.
  VITE_CF_BEACON_TOKEN: z.string().optional(),
})

export const publicEnv = publicSchema.parse({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  VITE_PUBLIC_URL: import.meta.env.VITE_PUBLIC_URL,
  VITE_CF_BEACON_TOKEN: import.meta.env.VITE_CF_BEACON_TOKEN || undefined,
})

const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().startsWith('sb_secret_'),
  IP_HASH_SALT: z.string().min(8),
  // Optional: email notifications are disabled until a Resend key is set, so the
  // app runs fine locally and in CI without one.
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
})

let cached: z.infer<typeof serverSchema> | null = null

/** Throws on the server if secrets are missing. Never call from client code. */
export function serverEnv() {
  cached ??= serverSchema.parse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    IP_HASH_SALT: process.env.IP_HASH_SALT,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
  })
  return cached
}
