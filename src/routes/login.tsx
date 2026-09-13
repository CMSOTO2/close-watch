import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Wordmark } from '#/components/brand-mark'
import { LoginForm } from '#/components/auth/login-form'
import { getSessionUser } from '#/lib/auth'
import { AFTER_SIGN_IN, safeNext } from '#/lib/auth-redirect'

export const Route = createFileRoute('/login')({
  // `next` is where to go after signing in, and it is whatever the URL says,
  // so safeNext is the boundary rather than a formality. Dropped from the
  // parsed search when it is missing or unusable, which keeps a bare /login
  // out of the business of carrying an empty parameter around.
  //
  // `mode=signup` is what every "Start free" button sends. Those buttons are
  // for people who have never been here, and they used to land on a form
  // headed "Sign in", with account creation as a small link under it.
  validateSearch: (
    search: Record<string, unknown>,
  ): { next?: string; mode?: 'signup' } => {
    const next = safeNext(search.next)
    return {
      ...(next ? { next } : {}),
      ...(search.mode === 'signup' ? { mode: 'signup' as const } : {}),
    }
  },
  // Someone already signed in has nothing to do here. The public header's
  // Sign in button used to land a signed-in owner on this form, which read as
  // "sign out first" when all they wanted was their dashboard back. Verified
  // server-side with getUser rather than trusting the cookie, because the
  // redirect target can be a page of someone's proposals.
  beforeLoad: async ({ search }) => {
    const user = await getSessionUser()
    if (user) throw redirect({ href: search.next ?? AFTER_SIGN_IN })
  },
  // A sign-in form has nothing to offer a search result, and an indexed one
  // competes with the landing page for the brand query. `follow` so the links
  // out of it still carry weight to terms and privacy.
  head: () => ({
    meta: [
      { title: 'Sign in · Closewatch' },
      { name: 'robots', content: 'noindex, follow' },
    ],
  }),
  component: LoginPage,
})

function LoginPage() {
  const { next, mode } = Route.useSearch()

  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-6 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-7 inline-flex">
          <Wordmark />
        </Link>
        <div className="rounded-lg border border-line bg-surface px-6 py-7 shadow-md">
          <LoginForm next={next} initialMode={mode} />
        </div>
        {/* Google's consent screen links these too, but someone creating an
            account should be able to reach them from the page where they do
            it, not only from the marketing site. */}
        <p className="mt-5 text-center text-xs text-ink-3">
          By continuing you agree to our{' '}
          <Link
            to="/terms"
            className="text-ink-2 hover:text-ink hover:underline"
          >
            terms
          </Link>{' '}
          and{' '}
          <Link
            to="/privacy"
            className="text-ink-2 hover:text-ink hover:underline"
          >
            privacy policy
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
