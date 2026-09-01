import {
  Link,
  Outlet,
  createFileRoute,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { AccountMenu } from '#/components/account-menu'
import { Wordmark } from '#/components/brand-mark'
import { PageContainer } from '#/components/page-container'
import { ThemeToggle } from '#/components/theme-toggle'
import { Button } from '#/components/ui/button'
import { getSessionUser } from '#/lib/auth'
import { getSupabaseBrowserClient } from '#/lib/supabase/client'

export const Route = createFileRoute('/_authed')({
  beforeLoad: async () => {
    const user = await getSessionUser()
    if (!user) throw redirect({ to: '/login' })
    return { user }
  },
  component: AuthedLayout,
})

/**
 * The app shell.
 *
 * The bar carries identity, the one action worth having everywhere, and the
 * two account utilities — nothing else. It used to also hold a "Proposals"
 * link, which went where the wordmark already went and sat directly above the
 * dashboard's own <h1>Proposals</h1>; a one-item nav duplicating the logo reads
 * as a nav with items missing. Getting back to the list is a per-page concern
 * now, handled by BackLink in the same position on every sub-page.
 *
 * New proposal moved up here from the dashboard heading. It is the only thing
 * an owner starts from a cold page, and in the bar it survives scrolling and is
 * reachable from the detail and settings pages, which had no route to it at all.
 */
function AuthedLayout() {
  const { user } = Route.useRouteContext()
  const router = useRouter()

  async function signOut() {
    await getSupabaseBrowserClient().auth.signOut()
    await router.invalidate()
    await router.navigate({ to: '/login' })
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
        <PageContainer className="flex items-center justify-between gap-4 py-3">
          <Link
            to="/dashboard"
            className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            <Wordmark />
          </Link>
          {/* Labelled because the footer and the page bodies carry navs too. */}
          <nav
            aria-label="Account"
            className="flex items-center gap-2 sm:gap-3"
          >
            <Button asChild size="sm">
              <Link to="/proposals/new">
                <Plus aria-hidden />
                {/* The full label does not fit beside the wordmark on a phone. */}
                <span className="sm:hidden">New</span>
                <span className="hidden sm:inline">New proposal</span>
              </Link>
            </Button>
            {/* Hairline so appearance and account read as utilities rather than
                as a third and fourth thing you might have meant to click. */}
            <span aria-hidden className="h-5 w-px bg-line" />
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <AccountMenu email={user.email ?? null} onSignOut={signOut} />
            </div>
          </nav>
        </PageContainer>
      </header>
      <Outlet />
    </div>
  )
}
