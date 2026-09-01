import {
  Link,
  Outlet,
  createFileRoute,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import { AccountMenu } from '#/components/account-menu'
import { Wordmark } from '#/components/brand-mark'
import { PageContainer } from '#/components/page-container'
import { ThemeToggle } from '#/components/theme-toggle'
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
      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <PageContainer className="flex items-center justify-between gap-4 py-3">
          <Link
            to="/dashboard"
            className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            <Wordmark />
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              to="/dashboard"
              // Marks the current page rather than disabling the link, so the
              // bar says where you are as well as where you can go.
              activeProps={{ 'aria-current': 'page', className: 'text-ink' }}
              className="rounded-md px-2 py-1 text-[13px] text-ink-2 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Proposals
            </Link>
            <ThemeToggle />
            <AccountMenu email={user.email ?? null} onSignOut={signOut} />
          </nav>
        </PageContainer>
      </header>
      <Outlet />
    </div>
  )
}
