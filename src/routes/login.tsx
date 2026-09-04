import { createFileRoute, Link } from '@tanstack/react-router'
import { Wordmark } from '#/components/brand-mark'
import { LoginForm } from '#/components/auth/login-form'
import { safeNext } from '#/lib/auth-redirect'

export const Route = createFileRoute('/login')({
  // `next` is where to go after signing in, and it is whatever the URL says,
  // so safeNext is the boundary rather than a formality. Dropped from the
  // parsed search when it is missing or unusable, which keeps a bare /login
  // out of the business of carrying an empty parameter around.
  validateSearch: (search: Record<string, unknown>): { next?: string } => {
    const next = safeNext(search.next)
    return next ? { next } : {}
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
  const { next } = Route.useSearch()

  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-6 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-7 inline-flex">
          <Wordmark />
        </Link>
        <div className="rounded-lg border border-line bg-surface px-6 py-7 shadow-md">
          <LoginForm next={next} />
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
