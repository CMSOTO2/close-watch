import { useEffect } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  busyLabel?: string
  cancelLabel?: string
  destructive?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Minimal confirmation modal. Deliberately dependency-free so it can be swapped
 * for the design system's dialog later without touching callers.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  busyLabel = 'Working…',
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, busy, onCancel])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={busy ? undefined : onCancel}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative w-full max-w-sm rounded-lg bg-white p-5 shadow-xl"
      >
        <h2 id="confirm-dialog-title" className="text-base font-semibold text-neutral-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-neutral-600">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            disabled={busy}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 ${
              destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-neutral-900 hover:bg-neutral-700'
            }`}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
