import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSupabaseServerClient } from '#/lib/supabase/server'

export type Profile = {
  fullName: string | null
  companyName: string | null
  email: string | null
}

/** The signed-in user's own profile. RLS scopes the read to their row. */
export const getProfile = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Profile | null> => {
    const supabase = getSupabaseServerClient()
    const { data } = await supabase
      .from('profiles')
      .select('full_name, company_name, email')
      .maybeSingle()
    if (!data) return null
    return {
      fullName: data.full_name,
      companyName: data.company_name,
      email: data.email,
    }
  },
)

/**
 * The name clients see: at the top of the viewer, in every share link, and as
 * "Sent by" on the detail page. Required, because every link carries it. The
 * column is still `company_name`, and a person working under their own name
 * puts that here.
 */
export const displayNameSchema = z
  .string()
  .trim()
  .min(2, 'At least 2 characters')
  .max(80, 'Keep it under 80 characters')

/** The welcome step's one write. */
export const setCompanyName = createServerFn({ method: 'POST' })
  .validator(z.object({ companyName: displayNameSchema }))
  .handler(async ({ data }): Promise<void> => {
    const supabase = getSupabaseServerClient()

    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) throw new Error('Not signed in')

    const { error } = await supabase
      .from('profiles')
      .update({ company_name: data.companyName })
      .eq('id', auth.user.id)
    if (error) throw new Error(error.message)
  })

/** Saves the profile from Settings. The name clients see cannot be cleared. */
export const updateProfile = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      fullName: z.string().trim().max(120),
      companyName: displayNameSchema,
    }),
  )
  .handler(async ({ data }): Promise<Profile> => {
    const supabase = getSupabaseServerClient()

    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) throw new Error('Not signed in')

    const { data: updated, error } = await supabase
      .from('profiles')
      .update({
        full_name: data.fullName || null,
        company_name: data.companyName,
      })
      .eq('id', auth.user.id)
      .select('full_name, company_name, email')
      .maybeSingle()

    if (error || !updated)
      throw new Error(error?.message ?? 'Could not save your profile')
    return {
      fullName: updated.full_name,
      companyName: updated.company_name,
      email: updated.email,
    }
  })
