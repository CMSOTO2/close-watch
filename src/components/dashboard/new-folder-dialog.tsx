import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  createFolder,
  folderNameSchema,
  folderSenderSchema,
} from '#/lib/folders'
import type { Folder } from '#/lib/folders'
import { queryKeys, shareLinkPreview } from '#/constants'

const INPUT =
  'mt-1.5 w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink transition-colors placeholder:text-ink-3 hover:border-ink-3 focus-visible:border-brand-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring'

/**
 * Creating a folder, from the dashboard or from Settings.
 *
 * A modal rather than an inline field because a folder has two decisions in
 * it, and the second one reaches clients: a name they see instead of the
 * account's. The link preview is there so that choice is made looking at the
 * thing it changes, not at a label describing it.
 *
 * Mounted only while open, so every opening starts with empty fields. Built
 * like ConfirmDialog: portalled, closed by Escape or a click outside.
 */
export function NewFolderDialog({
  mainName,
  onClose,
  onCreated,
}: {
  /** The account's own name, which a folder with no name for clients sends as. */
  mainName: string | null
  onClose: () => void
  onCreated: (folder: Folder) => void
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [senderName, setSenderName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  const sender = senderName.trim()
  const main = mainName ?? 'your main name'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const n = folderNameSchema.safeParse(name)
    if (!n.success) return setError(n.error.issues[0]?.message ?? 'Invalid')
    const s = folderSenderSchema.safeParse(senderName)
    if (!s.success) return setError(s.error.issues[0]?.message ?? 'Invalid')
    setError(null)
    setBusy(true)
    try {
      const folder = await createFolder({
        data: { name: n.data, senderName: s.data },
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.folders })
      onCreated(folder)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create it')
      setBusy(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={busy ? undefined : onClose}
        aria-hidden="true"
      />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-folder-title"
        onSubmit={submit}
        className="relative w-full max-w-md rounded-lg border border-line bg-surface p-5 shadow-lg"
      >
        <h2
          id="new-folder-title"
          className="font-display text-base font-semibold tracking-tight text-ink"
        >
          New folder
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
          Groups proposals on your dashboard. Give it a name clients see and its
          proposals send as that instead of {main}.
        </p>

        <label className="mt-4 block">
          <span className="kicker">Folder name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Photography"
            maxLength={60}
            className={INPUT}
          />
        </label>

        <label className="mt-3 block">
          <span className="kicker">Name clients see</span>
          <input
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="Optional, e.g. Acme Photography"
            maxLength={80}
            className={INPUT}
          />
        </label>

        <div className="mt-4 rounded-md border border-line bg-surface-2 px-3 py-2.5">
          <p className="text-[12px] text-ink-3">
            Links in this folder will look like
          </p>
          <p className="mt-1 truncate font-mono text-[12px] text-ink">
            {shareLinkPreview(sender || mainName)}
          </p>
          {!sender && (
            <p className="mt-1 text-[12px] text-ink-3">
              Left blank, it sends as {main}.
            </p>
          )}
        </div>

        {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create folder'}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}
