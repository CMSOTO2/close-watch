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
    return { fullName: data.full_name, companyName: data.company_name, email: data.email }
  },
)

/**
 * Updates the display name recipients see on shared proposals — the "from …"
 * line in the viewer and "Sent by …" on the detail page both read this.
 */
export const updateProfile = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      fullName: z.string().trim().max(120),
      companyName: z.string().trim().max(120),
    }),
  )
  .handler(async ({ data }): Promise<Profile> => {
    const supabase = getSupabaseServerClient()

    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) throw new Error('Not signed in')

    const { data: updated, error } = await supabase
      .from('profiles')
      .update({ full_name: data.fullName || null, company_name: data.companyName || null })
      .eq('id', auth.user.id)
      .select('full_name, company_name, email')
      .maybeSingle()

    if (error || !updated) throw new Error(error?.message ?? 'Could not save your profile')
    return { fullName: updated.full_name, companyName: updated.company_name, email: updated.email }
  })
