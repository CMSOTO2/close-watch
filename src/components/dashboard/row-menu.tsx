import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQueryClient } from '@tanstack/react-query'
import { CircleCheck, Link2, MoreHorizontal, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '#/components/confirm-dialog'
import { useToast } from '#/components/toast'
import { queryKeys } from '#/constants'
import { deleteProposal, markProposalWon } from '#/lib/proposals/mutations'
import { cn } from '#/lib/utils'
import type { ProposalSummary } from '#/lib/analytics/summaries'

/**
 * A row's own actions, so the common ones do not cost a page load: copy the
 * share link, mark the deal paid, delete it.
 *
 * A disclosure like the account menu rather than a full ARIA menu, for the
 * reason given there. The panel is portalled to the body because the row clips
 * its children — `overflow-hidden` keeps the heat spine inside the rounded
 * corners — and it is placed from the trigger and closes on scroll rather than
 * chasing it.
 *
 * `relative z-10` lifts the trigger above the row's stretched link, the same
 * way the copy button it replaced did.
 */
export function RowMenu({ proposal }: { proposal: ProposalSummary }) {
  const notify = useToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [place, setPlace] = useState<{ top: number; right: number } | null>(
    null,
  )
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const panel = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return

    const close = () => setOpen(false)
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      setOpen(false)
      trigger.current?.focus()
    }
    function onPointer(e: PointerEvent) {
      const target = e.target
      if (
        target instanceof Node &&
        (panel.current?.contains(target) || trigger.current?.contains(target))
      )
        return
      setOpen(false)
    }

    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    // Capture, so a scroll inside any container closes it too.
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  function toggle() {
    if (open) {
      setOpen(false)
      return
    }
    const rect = trigger.current?.getBoundingClientRect()
    if (!rect) return
    setPlace({ top: rect.bottom + 6, right: window.innerWidth - rect.right })
    setOpen(true)
  }

  // The list, the secured totals and the free-plan slot count all move when a
  // proposal is closed or removed.
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.proposalSummaries }),
      queryClient.invalidateQueries({ queryKey: queryKeys.securedTotals }),
      queryClient.invalidateQueries({ queryKey: queryKeys.entitlements }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.proposal(proposal.id),
      }),
    ])

  async function copyLink() {
    setOpen(false)
    if (!proposal.shareUrl) return
    try {
      await navigator.clipboard.writeText(proposal.shareUrl)
      notify(`Link for ${proposal.clientName} copied`)
    } catch {
      notify('Could not copy — open the proposal to copy it manually', 'danger')
    }
  }

  // No confirmation, matching the detail page: it is reversible from Closed
  // with Reopen, and a win should not have to get past a dialog.
  async function markPaid() {
    setOpen(false)
    setBusy(true)
    try {
      await markProposalWon({ data: { id: proposal.id } })
      notify('Marked as paid — nice one', 'good')
    } catch {
      notify('That did not save — nothing was changed', 'danger')
    } finally {
      setBusy(false)
      await refresh()
    }
  }

  async function runDelete() {
    setBusy(true)
    try {
      await deleteProposal({ data: { id: proposal.id } })
      notify('Proposal deleted')
      await refresh()
    } catch {
      notify('Could not delete that proposal', 'danger')
    } finally {
      setBusy(false)
      setConfirmDelete(false)
    }
  }

  const item =
    'flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none'

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={toggle}
        disabled={busy}
        // aria-expanded rather than aria-haspopup="menu", as on the account
        // menu: this is a disclosure and does not implement arrow-key roving.
        aria-expanded={open}
        aria-label={`Actions for ${proposal.clientName}`}
        className={cn(
          'relative z-10 grid size-7 shrink-0 place-items-center rounded-md text-ink-3 transition-colors',
          'hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50',
          open && 'bg-surface-2 text-ink',
        )}
      >
        <MoreHorizontal aria-hidden className="size-4" />
      </button>

      {open &&
        place &&
        createPortal(
          <div
            ref={panel}
            style={{ top: place.top, right: place.right }}
            className="row-enter fixed z-40 w-48 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-lg"
          >
            {proposal.shareUrl && (
              <button type="button" onClick={copyLink} className={item}>
                <Link2 aria-hidden className="size-3.5 text-ink-3" />
                Copy link
              </button>
            )}
            <button type="button" onClick={markPaid} className={item}>
              <CircleCheck aria-hidden className="size-3.5 text-good" />
              Mark as paid
            </button>
            <div className="my-1 border-t border-line-soft" />
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setConfirmDelete(true)
              }}
              className={cn(item, 'text-ink-2 hover:text-danger')}
            >
              <Trash2 aria-hidden className="size-3.5" />
              Delete
            </button>
          </div>,
          document.body,
        )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete proposal?"
        message="Its share link and all tracking data are removed for good."
        confirmLabel="Delete"
        busyLabel="Deleting…"
        destructive
        busy={busy}
        onConfirm={runDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
