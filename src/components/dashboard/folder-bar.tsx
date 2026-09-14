import { Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { FolderPlus } from 'lucide-react'
import { useState } from 'react'
import { createFolder, folderNameSchema } from '#/lib/folders'
import type { Folder } from '#/lib/folders'
import type { ProposalSummary } from '#/lib/analytics/summaries'
import { queryKeys } from '#/constants'
import { cn } from '#/lib/utils'

/**
 * The dashboard's folders, as a row you click through: All, each folder, and
 * No folder for anything not filed. The chosen one scopes everything below it.
 *
 * Creating a folder is here rather than only in Settings because the moment
 * someone wants one is the moment they are looking at the list that is too
 * mixed. Proposals go into folders from each row's menu.
 */
export function FolderBar({
  folders,
  proposals,
  selected,
  onSelect,
}: {
  folders: Array<Folder>
  /** Every proposal, so each folder's count is its whole contents. */
  proposals: Array<ProposalSummary>
  /** 'all', 'none', or a folder id. */
  selected: string
  onSelect: (key: string) => void
}) {
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const counts = new Map<string, number>()
  let unfiled = 0
  for (const p of proposals) {
    if (p.folderId) counts.set(p.folderId, (counts.get(p.folderId) ?? 0) + 1)
    else unfiled++
  }

  function close() {
    setAdding(false)
    setName('')
    setError(null)
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    const parsed = folderNameSchema.safeParse(name)
    if (!parsed.success) {
      return setError(parsed.error.issues[0]?.message ?? 'Invalid name')
    }
    setBusy(true)
    try {
      const folder = await createFolder({
        data: { name: parsed.data, senderName: '' },
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.folders })
      close()
      onSelect(folder.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create it')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-6">
      <div
        role="group"
        aria-label="Folders"
        className="flex flex-wrap items-center gap-1.5"
      >
        {folders.length > 0 && (
          <>
            <Chip
              label="All"
              count={proposals.length}
              active={selected === 'all'}
              onClick={() => onSelect('all')}
            />
            {folders.map((folder) => (
              <Chip
                key={folder.id}
                label={folder.name}
                count={counts.get(folder.id) ?? 0}
                active={selected === folder.id}
                onClick={() => onSelect(folder.id)}
                title={
                  folder.senderName
                    ? `Sends as ${folder.senderName}`
                    : undefined
                }
              />
            ))}
            {unfiled > 0 && (
              <Chip
                label="No folder"
                count={unfiled}
                active={selected === 'none'}
                onClick={() => onSelect('none')}
              />
            )}
          </>
        )}

        {adding ? (
          <form onSubmit={create} className="flex items-center gap-1.5">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') close()
              }}
              placeholder="Folder name"
              maxLength={60}
              aria-label="New folder name"
              className="w-40 rounded-md border border-line-strong bg-surface px-2.5 py-1 text-[13px] text-ink placeholder:text-ink-3 focus-visible:border-brand-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
            />
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="rounded-md bg-primary px-2.5 py-1 text-[13px] font-medium text-primary-foreground disabled:opacity-50"
            >
              Create
            </button>
            <button
              type="button"
              onClick={close}
              className="px-1.5 py-1 text-[13px] text-ink-2 hover:text-ink"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <FolderPlus aria-hidden className="size-3.5" />
            New folder
          </button>
        )}

        {folders.length > 0 && !adding && (
          <Link
            to="/settings"
            hash="folders"
            className="px-1.5 py-1 text-[13px] text-ink-3 transition-colors hover:text-ink"
          >
            Manage
          </Link>
        )}
      </div>
      {error && <p className="mt-1.5 text-[13px] text-danger">{error}</p>}
    </div>
  )
}

function Chip({
  label,
  count,
  active,
  onClick,
  title,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  title?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      title={title}
      className={cn(
        'flex max-w-56 items-center gap-1.5 rounded-md border px-2.5 py-1 text-[13px] transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        active
          ? 'border-brand bg-brand-soft text-ink'
          : 'border-line bg-surface text-ink-2 hover:border-ink-3 hover:text-ink',
      )}
    >
      <span className="truncate">{label}</span>
      <span className="font-mono text-[11px] tnum text-ink-3">{count}</span>
    </button>
  )
}
