import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionUser } from '#/lib/auth'

export const Route = createFileRoute('/_authed')({
  beforeLoad: async () => {
    const user = await getSessionUser()
    if (!user) throw redirect({ to: '/login' })
    return { user }
  },
  component: () => <Outlet />,
})
