import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Menu, X } from 'lucide-react'
import { Wordmark } from '#/components/brand-mark'
import { PageContainer } from '#/components/page-container'
import { ThemeToggle } from '#/components/theme-toggle'
import { Button } from '#/components/ui/button'
import { useSignedIn } from '#/lib/use-signed-in'
import { cn } from '#/lib/utils'

/**
 * The bar every public page carries.
 *
 * Shared rather than written per route because the demo had its own, cut down
 * to a wordmark and a sign-in button, which left a visitor who followed the
 * demo link with no way back to the pricing or the questions — the two things
 * someone asks about immediately after being convinced by it.
 *
 * Section links point at `/#id` rather than `#id` so they work from any page.
 * On the landing page that is the same document, so it still scrolls rather
 * than reloading.
 */

type Item = { label: string; href?: string; to?: string }

/**
 * No Home link: the wordmark to its left is one, and it stays in the bar even
 * with the mobile panel open. No "How it works" either — the demo shows what
 * that section describes, and two links to the same explanation split the
 * click. The section keeps its id, so /#how still works if it is ever worth
 * linking to directly.
 */
const ITEMS: Array<Item> = [
  { label: 'Demo', to: '/demo' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'Questions', href: '/#faq' },
]

const DESKTOP_LINK =
  'hidden rounded-md px-2 py-1 text-[13px] text-ink-2 transition-colors hover:text-ink sm:block'

export function SiteHeader({ current }: { current?: 'demo' }) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLElement | null>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)

  // Same disclosure the account menu is: Escape closes and hands focus back,
  // a press outside closes. Not a full ARIA menu, because arrow-key roving is
  // exactly what four links in a dropped panel do not need.
  useEffect(() => {
    if (!open) return

    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      setOpen(false)
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

  const signedIn = useSignedIn()
  const account = signedIn
    ? { to: '/dashboard', label: 'Dashboard' }
    : { to: '/login', label: 'Sign in' }

  const isCurrent = (item: Item) => current === 'demo' && item.to === '/demo'

  return (
    <header
      ref={wrap}
      className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur"
    >
      <PageContainer className="flex items-center justify-between gap-4 py-3">
        <Link
          to="/"
          className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <Wordmark />
        </Link>

        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-3">
          {ITEMS.map((item) =>
            item.to ? (
              <Link
                key={item.label}
                to={item.to}
                aria-current={isCurrent(item) ? 'page' : undefined}
                className={cn(DESKTOP_LINK, isCurrent(item) && 'text-ink')}
              >
                {item.label}
              </Link>
            ) : (
              <a key={item.label} href={item.href} className={DESKTOP_LINK}>
                {item.label}
              </a>
            ),
          )}

          <ThemeToggle />

          <Button
            asChild
            size="sm"
            variant="outline"
            className="hidden sm:inline-flex"
          >
            <Link to={account.to}>{account.label}</Link>
          </Button>

          <button
            ref={trigger}
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Menu'}
            className="grid size-8 shrink-0 place-items-center rounded-md text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:hidden"
          >
            {open ? (
              <X aria-hidden className="size-4" />
            ) : (
              <Menu aria-hidden className="size-4" />
            )}
          </button>
        </nav>
      </PageContainer>

      {/* Dropped below the bar rather than floated over it: the header is
          sticky, so growing it keeps the panel attached to the thing that
          opened it and needs no overlay to catch taps behind. */}
      {open && (
        <div className="border-t border-line bg-surface sm:hidden">
          <PageContainer className="flex flex-col py-1.5">
            {ITEMS.map((item) => {
              const className = cn(
                'rounded-md px-1 py-2.5 text-sm transition-colors hover:text-ink',
                isCurrent(item) ? 'font-medium text-ink' : 'text-ink-2',
              )
              return item.to ? (
                <Link
                  key={item.label}
                  to={item.to}
                  aria-current={isCurrent(item) ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                  className={className}
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={className}
                >
                  {item.label}
                </a>
              )
            })}
            <Button asChild size="sm" className="mt-2 mb-1.5">
              <Link to={account.to} onClick={() => setOpen(false)}>
                {account.label}
              </Link>
            </Button>
          </PageContainer>
        </div>
      )}
    </header>
  )
}
