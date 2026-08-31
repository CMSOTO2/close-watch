import {
  Link,
  Outlet,
  createFileRoute,
  redirect,
  useRouter,
} from '@tanstack/react-router'
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
          <nav className="flex items-center gap-4">
            <Link
              to="/settings"
              className="text-[13px] text-ink-2 transition-colors hover:text-ink"
            >
              Settings
            </Link>
            <button
              onClick={signOut}
              className="text-[13px] text-ink-2 transition-colors hover:text-ink"
            >
              Sign out
            </button>
            <ThemeToggle />
            <span
              title={user.email ?? undefined}
              className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-3 text-[11px] font-semibold text-ink-2"
            >
              {initials(user.email)}
            </span>
          </nav>
        </PageContainer>
      </header>
      <Outlet />
    </div>
  )
}

/** First two letters of the local part — enough to recognise your own account. */
function initials(email: string | null | undefined): string {
  if (!email) return '·'
  return email.slice(0, 2).toUpperCase()
}
