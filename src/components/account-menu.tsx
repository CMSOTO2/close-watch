import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { LogOut, Settings as SettingsIcon } from 'lucide-react'
import { cn } from '#/lib/utils'

/**
 * The account menu behind the avatar.
 *
 * It exists mostly to separate Sign out from everything else. It used to sit
 * in the bar as plain text a few pixels from Settings, which is a bad place
 * for the one control that throws away what you were doing. Behind a menu it
 * takes a deliberate second action to reach.
 *
 * Hand-rolled to match the dialog and the toasts rather than pulling in a menu
 * library for two items and a label. It is a disclosure, not a full ARIA menu:
 * Tab moves through the items, which is what people do with a two-item account
 * menu anyway, and it avoids half-implementing roving focus.
 */
export function AccountMenu({
  email,
  onSignOut,
}: {
  email: string | null
  onSignOut: () => void
}) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement | null>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return

    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      setOpen(false)
      // Escape hands focus back to the button that opened it, so the keyboard
      // does not get dropped at the top of the document.
      trigger.current?.focus()
    }
    function onPointer(e: PointerEvent) {
      if (e.target instanceof Node && wrap.current?.contains(e.target)) return
      setOpen(false)
    }

    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  const item =
    'flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none'

  return (
    <div ref={wrap} className="relative">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        // Deliberately not aria-haspopup="menu": that announces full menu
        // semantics, and arrow-key roving is exactly what this does not
        // implement. aria-expanded describes a disclosure honestly.
        aria-expanded={open}
        aria-label="Account"
        className={cn(
          'grid size-8 shrink-0 place-items-center rounded-full bg-surface-3 text-[11px] font-semibold text-ink-2 transition-colors',
          'hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          open && 'text-ink ring-2 ring-ring ring-offset-2 ring-offset-surface',
        )}
      >
        {initials(email)}
      </button>

      {open && (
        <div className="row-enter absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-lg">
          {email && (
            <p className="truncate border-b border-line-soft px-3 pb-2 pt-1.5 text-[11px] text-ink-3">
              Signed in as <span className="text-ink-2">{email}</span>
            </p>
          )}
          <Link to="/settings" onClick={() => setOpen(false)} className={item}>
            <SettingsIcon aria-hidden className="size-3.5 text-ink-3" />
            Settings
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onSignOut()
            }}
            className={cn(item, 'text-ink-2 hover:text-danger')}
          >
            <LogOut aria-hidden className="size-3.5" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

function initials(email: string | null): string {
  const name = email?.split('@')[0] ?? ''
  const parts = name.split(/[.\-_]/).filter(Boolean)
  const letters =
    parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2)
  return letters.toUpperCase() || '?'
}
