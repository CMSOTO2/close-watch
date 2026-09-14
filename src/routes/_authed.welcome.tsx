import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form-start'
import { useState } from 'react'
import { PageContainer } from '#/components/page-container'
import { fieldError } from '#/components/auth/validation'
import { AFTER_SIGN_IN, safeNext } from '#/lib/auth-redirect'
import { displayNameSchema, setCompanyName } from '#/lib/profile'
import { shareLinkPreview } from '#/constants'

/**
 * The one onboarding question: the name clients see.
 *
 * It is on every proposal an account sends, at the top of the viewer and in
 * the share link, so the app shell sends anyone without one here first (see
 * _authed.tsx). One field, because every other question can wait until it
 * matters, and a signup that stalls here has stalled before seeing anything.
 */
export const Route = createFileRoute('/_authed/welcome')({
  validateSearch: (search: Record<string, unknown>): { next?: string } => {
    const next = safeNext(search.next)
    return next ? { next } : {}
  },
  // Already named: nothing to ask. Changing it is what Settings is for.
  beforeLoad: ({ context, search }) => {
    if (context.user.companyName) {
      throw redirect({ href: search.next ?? AFTER_SIGN_IN })
    }
  },
  component: WelcomePage,
})

function WelcomePage() {
  const { next } = Route.useSearch()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { companyName: '' },
    onSubmit: async ({ value }) => {
      setError(null)
      try {
        await setCompanyName({ data: { companyName: value.companyName } })
        // The shell's guard read the profile before the name existed; make it
        // read again, or the next page bounces straight back here.
        await router.invalidate()
        await router.navigate({ href: next ?? AFTER_SIGN_IN })
      } catch {
        setError('Could not save that. Try again.')
      }
    },
  })

  return (
    <PageContainer className="py-12 sm:py-16">
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          What name should your clients see?
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
          It goes at the top of every proposal you send and into the link
          itself, so a client can tell who it is from before they open it. Your
          company name, or your own if you work under it.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="mt-6 space-y-4"
        >
          <form.Field
            name="companyName"
            validators={{ onChange: displayNameSchema }}
          >
            {(field) => (
              <label className="block">
                <span className="kicker">Company or display name</span>
                <input
                  autoFocus
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Acme Studio"
                  maxLength={80}
                  className="mt-1.5 w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink transition-colors placeholder:text-ink-3 hover:border-ink-3 focus-visible:border-brand-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                />
                {field.state.meta.isTouched &&
                  field.state.meta.errors.length > 0 && (
                    <span className="mt-1.5 block text-[13px] text-danger">
                      {fieldError(field.state.meta.errors)}
                    </span>
                  )}
                <span className="mt-2 block truncate font-mono text-[12px] text-ink-3">
                  {shareLinkPreview(field.state.value.trim() || null)}
                </span>
              </label>
            )}
          </form.Field>

          <form.Subscribe
            selector={(s) => [s.canSubmit, s.isSubmitting] as const}
          >
            {([canSubmit, isSubmitting]) => (
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
              >
                {isSubmitting ? 'Saving…' : 'Continue'}
              </button>
            )}
          </form.Subscribe>
          {error && <p className="text-[13px] text-danger">{error}</p>}
        </form>

        <p className="mt-6 text-xs text-ink-3">
          You can change it later in Settings. Links you have already sent keep
          working.
        </p>
      </div>
    </PageContainer>
  )
}
