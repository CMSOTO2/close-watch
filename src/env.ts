import { z } from 'zod'

const publicSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().startsWith('sb_publishable_'),
  VITE_PUBLIC_URL: z.string().url().default('http://localhost:3000'),
  // Optional. Site token from Cloudflare dashboard -> Web Analytics. Empty
  // means no beacon is rendered, which is what happens in dev and in CI.
  VITE_CF_BEACON_TOKEN: z.string().optional(),
  // Optional. Google Ads conversion ID ("AW-XXXXXXXXXX"). Empty means no tag
  // is rendered, same as the beacon token above.
  VITE_GOOGLE_ADS_ID: z.string().startsWith('AW-').optional(),
})

export const publicEnv = publicSchema.parse({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  VITE_PUBLIC_URL: import.meta.env.VITE_PUBLIC_URL,
  VITE_CF_BEACON_TOKEN: import.meta.env.VITE_CF_BEACON_TOKEN || undefined,
  VITE_GOOGLE_ADS_ID: import.meta.env.VITE_GOOGLE_ADS_ID || undefined,
})

const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().startsWith('sb_secret_'),
  IP_HASH_SALT: z.string().min(8),
  // Optional: email notifications are disabled until a Resend key is set, so the
  // app runs fine locally and in CI without one.
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  // Optional: where the "someone signed up" note goes. Unset means no signup
  // notification is sent at all, which is what local and CI runs want.
  SIGNUP_NOTIFY_TO: z.string().email().optional(),
  // Optional in the same way: without them the app runs and the free plan
  // works, and every billing path answers "not switched on yet" rather than
  // throwing. The webhook secret comes from the endpoint in the Stripe
  // dashboard, not from the API keys page.
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),
  STRIPE_PRICE_SOLO: z.string().startsWith('price_').optional(),
  STRIPE_PRICE_STUDIO: z.string().startsWith('price_').optional(),
})

let cached: z.infer<typeof serverSchema> | null = null

/** Throws on the server if secrets are missing. Never call from client code. */
export function serverEnv() {
  cached ??= serverSchema.parse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    IP_HASH_SALT: process.env.IP_HASH_SALT,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    // `|| undefined` for the same reason as the Stripe keys below: left empty
    // in .env it arrives as '' and fails the email check.
    SIGNUP_NOTIFY_TO: process.env.SIGNUP_NOTIFY_TO || undefined,
    // `|| undefined` matters: these are prefixed checks, and a key left empty
    // in .env arrives as '' rather than missing, which fails startsWith and
    // takes down every server path that reads the env at all.
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || undefined,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || undefined,
    STRIPE_PRICE_SOLO: process.env.STRIPE_PRICE_SOLO || undefined,
    STRIPE_PRICE_STUDIO: process.env.STRIPE_PRICE_STUDIO || undefined,
  })
  return cached
}
