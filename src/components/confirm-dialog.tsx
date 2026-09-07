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
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={busy ? undefined : onCancel}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative w-full max-w-sm rounded-lg border border-line bg-surface p-5 shadow-lg"
      >
        <h2
          id="confirm-dialog-title"
          className="font-display text-base font-semibold tracking-tight text-ink"
        >
          {title}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            disabled={busy}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-md px-3 py-1.5 text-sm font-medium shadow-sm transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50 ${
              destructive
                ? // The /60 matches the Button component's destructive variant and is
                  // not decoration. Dark lifts --danger to a light coral, and white on
                  // it is 2.76:1 — this dialog is the one that confirms deleting a
                  // proposal, so it was the worst place in the app to be unreadable.
                  // Compositing at 60% over the surface lands the fill at #9a5340 and
                  // white back at 5.70:1, and makes a destructive confirm look like
                  // every other destructive button rather than a brighter one.
                  'bg-destructive text-destructive-foreground dark:bg-destructive/60'
                : 'bg-primary text-primary-foreground'
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
