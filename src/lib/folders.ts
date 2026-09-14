import { createServerFn } from '@tanstack/react-start'
import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { getSupabaseServerClient } from '#/lib/supabase/server'
import { queryKeys } from '#/constants'

/**
 * Folders group proposals on the dashboard. One can also carry a name clients
 * see, and its proposals then send as that instead of the account's own name.
 * See supabase/migrations/20260914000000_folders.sql.
 */
export type Folder = {
  id: string
  name: string
  /** The name clients see for this folder's proposals; null is the account's. */
  senderName: string | null
}

/** For the owner only, so short names are fine. Matches the column check. */
export const folderNameSchema = z
  .string()
  .trim()
  .min(1, 'Give the folder a name')
  .max(60, 'Keep it under 60 characters')

/** Optional: blank means the folder's proposals send as the account's name. */
export const folderSenderSchema = z
  .string()
  .trim()
  .max(80, 'Keep it under 80 characters')
  .refine((v) => v === '' || v.length >= 2, 'At least 2 characters')

export const listFolders = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<Folder>> => {
    const supabase = getSupabaseServerClient()
    // RLS scopes this to the signed-in owner's rows.
    const { data } = await supabase
      .from('folders')
      .select('id, name, sender_name')
      .order('created_at')
    return (data ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      senderName: f.sender_name,
    }))
  },
)

export const foldersQuery = queryOptions({
  queryKey: queryKeys.folders,
  queryFn: () => listFolders(),
})

/**
 * Where the dashboard remembers its open folder ('all', 'none' or a folder
 * id). The new-proposal form reads it too, so a proposal started from inside
 * a folder begins filed in that folder.
 */
export const OPEN_FOLDER_KEY = 'cw.dashboard.folder'

/** 23505 is the unique index on (owner, name), which deserves a sentence. */
function saveError(error: { code?: string; message: string }): Error {
  return new Error(
    error.code === '23505'
      ? 'You already have a folder called that.'
      : error.message,
  )
}

const folderInput = z.object({
  name: folderNameSchema,
  senderName: folderSenderSchema,
})

export const createFolder = createServerFn({ method: 'POST' })
  .validator(folderInput)
  .handler(async ({ data }): Promise<Folder> => {
    const supabase = getSupabaseServerClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) throw new Error('Not signed in')

    const { data: folder, error } = await supabase
      .from('folders')
      .insert({
        owner_id: auth.user.id,
        name: data.name,
        sender_name: data.senderName || null,
      })
      .select('id, name, sender_name')
      .maybeSingle()
    if (error || !folder) throw saveError(error ?? { message: 'Not saved' })
    return { id: folder.id, name: folder.name, senderName: folder.sender_name }
  })

/**
 * Renames a folder or changes the name its proposals send as. Changing the
 * sender changes the name in those proposals' links; links already sent keep
 * working, because the viewer redirects the old name to the new one.
 */
export const updateFolder = createServerFn({ method: 'POST' })
  .validator(folderInput.extend({ id: z.uuid() }))
  .handler(async ({ data }): Promise<Folder> => {
    const supabase = getSupabaseServerClient()
    const { data: folder, error } = await supabase
      .from('folders')
      .update({ name: data.name, sender_name: data.senderName || null })
      .eq('id', data.id)
      .select('id, name, sender_name')
      .maybeSingle()
    if (error || !folder) throw saveError(error ?? { message: 'Not saved' })
    return { id: folder.id, name: folder.name, senderName: folder.sender_name }
  })

/** Its proposals are left in no folder (on delete set null), not deleted. */
export const deleteFolder = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data }): Promise<void> => {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.from('folders').delete().eq('id', data.id)
    if (error) throw new Error(error.message)
  })

/**
 * Files a proposal in a folder, or in none. Through move_proposal_to_folder
 * rather than an update, for the reason that function's migration gives.
 */
export const moveProposal = createServerFn({ method: 'POST' })
  .validator(z.object({ proposalId: z.uuid(), folderId: z.uuid().nullable() }))
  .handler(async ({ data }): Promise<void> => {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.rpc('move_proposal_to_folder', {
      p_proposal_id: data.proposalId,
      p_folder_id: data.folderId,
    })
    if (error) throw new Error('Could not move that proposal')
  })
