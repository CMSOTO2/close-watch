import { Link, Outlet, createFileRoute, redirect, useRouter } from '@tanstack/react-router'
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
    <div className="min-h-screen">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <Link to="/dashboard" className="text-sm font-semibold text-neutral-900">
            Closewatch
          </Link>
          <div className="flex items-center gap-3">
            {user.email && <span className="text-xs text-neutral-500">{user.email}</span>}
            <Link to="/settings" className="text-sm text-neutral-500 hover:text-neutral-900">
              Settings
            </Link>
            <button
              onClick={signOut}
              className="text-sm text-neutral-500 hover:text-neutral-900"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
