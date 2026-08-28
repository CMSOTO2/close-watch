import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from '@tanstack/react-form-start'
import { getSupabaseBrowserClient } from '#/lib/supabase/client'

export const Route = createFileRoute('/login')({ component: LoginPage })

function LoginPage() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { email: '' },
    onSubmit: async ({ value }) => {
      setSubmitError(null)
      const { error } = await getSupabaseBrowserClient().auth.signInWithOtp({
        email: value.email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) setSubmitError('Could not send that link. Try again.')
      else setSentTo(value.email)
    },
  })

  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold">Sign in to Closewatch</h1>

        {sentTo ? (
          <p className="mt-4 text-sm text-neutral-600">
            Check <span className="font-medium">{sentTo}</span> for your sign-in link.
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
            className="mt-6 space-y-3"
          >
            <form.Field
              name="email"
              validators={{
                onChange: ({ value }) =>
                  !value
                    ? 'Email is required'
                    : /.+@.+\..+/.test(value)
                      ? undefined
                      : 'Enter a valid email',
              }}
            >
              {(field) => (
                <div>
                  <input
                    type="email"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="you@studio.com"
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  />
                  {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                    <p className="mt-1 text-xs text-red-600">
                      {field.state.meta.errors.join(', ')}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
              {([canSubmit, isSubmitting]) => (
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {isSubmitting ? 'Sending…' : 'Email me a link'}
                </button>
              )}
            </form.Subscribe>

            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          </form>
        )}
      </div>
    </div>
  )
}
