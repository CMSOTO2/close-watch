import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { FolderPlus } from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog } from '#/components/confirm-dialog'
import { NewFolderDialog } from '#/components/dashboard/new-folder-dialog'
import { useToast } from '#/components/toast'
import {
  deleteFolder,
  folderNameSchema,
  folderSenderSchema,
  foldersQuery,
  updateFolder,
} from '#/lib/folders'
import type { Folder } from '#/lib/folders'
import { queryKeys, shareLinkPreview } from '#/constants'

const INPUT =
  'w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink transition-colors placeholder:text-ink-3 hover:border-ink-3 focus-visible:border-brand-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring'

const QUIET_BUTTON =
  'shrink-0 text-xs font-medium text-ink-2 hover:text-ink hover:underline disabled:opacity-50'

/** The first problem with a folder's two fields, in the form's own words. */
function folderProblem(name: string, senderName: string): string | null {
  const n = folderNameSchema.safeParse(name)
  if (!n.success) return n.error.issues[0]?.message ?? 'Invalid name'
  const s = folderSenderSchema.safeParse(senderName)
  if (!s.success) return s.error.issues[0]?.message ?? 'Invalid name'
  return null
}

/**
 * Settings' folder list: create a folder, rename one, give it a name clients
 * see, or remove it.
 *
 * Every folder shows the link its proposals go out on, and the edit form shows
 * it changing as you type, because the name clients see is the one setting
 * here that reaches them. New folders open the same dialog as the dashboard's
 * "New folder", with its link preview.
 */
export function FoldersSection({ mainName }: { mainName: string | null }) {
  const queryClient = useQueryClient()
  const { data: folders } = useSuspenseQuery(foldersQuery)
  const notify = useToast()
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState<Folder | null>(null)
  const main = mainName ?? 'your main name'

  // A sender name is in every link its proposals carry, so every list that
  // shows a link refreshes too.
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.folders }),
      queryClient.invalidateQueries({ queryKey: queryKeys.proposalSummaries }),
      queryClient.invalidateQueries({ queryKey: ['proposal'] }),
    ])

  async function remove() {
    if (!removing) return
    setBusy(true)
    try {
      await deleteFolder({ data: { id: removing.id } })
      await refresh()
      notify(`${removing.name} removed`)
      setRemoving(null)
    } catch {
      notify('Could not remove that folder', 'danger')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      id="folders"
      className="mt-10 scroll-mt-20 border-t border-line pt-8"
    >
      <h2 className="font-semibold text-lg">Folders</h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
        Group proposals on your dashboard: web design and coding, or a studio
        and a side practice. A folder can also have its own name clients see.
        Its proposals then arrive as that name, in the proposal and in its link,
        instead of as {main}.
      </p>

      {folders.length > 0 && (
        <ul className="mt-4 divide-y divide-line-soft rounded-md border border-line bg-surface">
          {folders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              mainName={mainName}
              onSaved={refresh}
              onRemove={() => setRemoving(folder)}
            />
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setCreating(true)}
        className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink shadow-sm transition-colors hover:border-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <FolderPlus aria-hidden className="size-4" />
        New folder
      </button>

      {creating && (
        <NewFolderDialog
          mainName={mainName}
          onClose={() => setCreating(false)}
          onCreated={(folder) => {
            setCreating(false)
            void refresh()
            notify(`Folder ${folder.name} created`, 'good')
          }}
        />
      )}

      <ConfirmDialog
        open={removing !== null}
        title={`Remove ${removing?.name ?? 'this folder'}?`}
        message={`Its proposals stay, in no folder, and send as ${main}. Links you have already sent keep working and open under that name.`}
        confirmLabel="Remove"
        busyLabel="Removing…"
        destructive
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => setRemoving(null)}
      />
    </section>
  )
}

function FolderItem({
  folder,
  mainName,
  onSaved,
  onRemove,
}: {
  folder: Folder
  mainName: string | null
  onSaved: () => Promise<unknown>
  onRemove: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(folder.name)
  const [senderName, setSenderName] = useState(folder.senderName ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const main = mainName ?? 'your main name'

  function cancel() {
    setEditing(false)
    setName(folder.name)
    setSenderName(folder.senderName ?? '')
    setError(null)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const problem = folderProblem(name, senderName)
    if (problem) return setError(problem)
    setBusy(true)
    try {
      await updateFolder({ data: { id: folder.id, name, senderName } })
      await onSaved()
      setEditing(false)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save it')
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    const sender = senderName.trim()
    return (
      <li className="px-3 py-3">
        <form onSubmit={save} className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              aria-label="Folder name"
              className={INPUT}
            />
            <input
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Name clients see (optional)"
              maxLength={80}
              aria-label="Name clients see for this folder, optional"
              className={INPUT}
            />
          </div>
          <p className="truncate font-mono text-[12px] text-ink-3">
            Links look like {shareLinkPreview(sender || mainName)}
            {!sender && ` (sends as ${main})`}
          </p>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={busy} className={QUIET_BUTTON}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={cancel} className={QUIET_BUTTON}>
              Cancel
            </button>
          </div>
        </form>
        {error && <p className="mt-1.5 text-[13px] text-danger">{error}</p>}
      </li>
    )
  }

  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2.5">
      <span className="min-w-0">
        <span className="block truncate text-sm text-ink">{folder.name}</span>
        <span className="block truncate text-xs text-ink-3">
          Clients see {folder.senderName ?? main}
        </span>
        <span className="block truncate font-mono text-[11px] text-ink-3">
          {shareLinkPreview(folder.senderName ?? mainName)}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={QUIET_BUTTON}
        >
          Edit
        </button>
        <button type="button" onClick={onRemove} className={QUIET_BUTTON}>
          Remove
        </button>
      </span>
    </li>
  )
}
