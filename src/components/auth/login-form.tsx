import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from '@tanstack/react-form-start'
import { getSupabaseBrowserClient } from '#/lib/supabase/client'
import { AuthField } from './auth-field'
import { GoogleButton } from './google-button'
import { emailSchema, signinPasswordSchema, signupPasswordSchema } from './validation'
import type { Mode } from './validation'

export function LoginForm() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('signin')
  // Set while an email link (magic link or signup confirmation) is pending.
  const [notice, setNotice] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function goToDashboard() {
    // signInWithPassword wrote the session cookies the server reads; invalidate
    // so the _authed guard re-runs against them before we land.
    await router.invalidate()
    await router.navigate({ to: '/dashboard' })
  }

  const form = useForm({
    defaultValues: { email: '', password: '', confirmPassword: '' },
    onSubmit: async ({ value }) => {
      setSubmitError(null)
      const supabase = getSupabaseBrowserClient()

      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: value.email,
          password: value.password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        })
        if (error) return setSubmitError(error.message)
        // No session means the project requires email confirmation first.
        if (!data.session) {
          return setNotice(`Check ${value.email} to confirm your account, then sign in.`)
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: value.email,
          password: value.password,
        })
        // Deliberately vague: do not reveal whether the email has an account.
        if (error) return setSubmitError('That email or password is not right.')
      }

      await goToDashboard()
    },
  })

  // Magic link does not need the password, so it reads the email field directly
  // rather than going through the form's submit.
  async function sendMagicLink() {
    const email = form.state.values.email
    if (!emailSchema.safeParse(email).success) {
      return setSubmitError('Enter a valid email first.')
    }
    setSubmitError(null)
    const { error } = await getSupabaseBrowserClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setSubmitError('Could not send that link. Try again.')
    else setNotice(`Check ${email} for your sign-in link.`)
  }

  return (
    <>
      <h1 className="text-xl font-semibold">
        {mode === 'signup' ? 'Create your Closewatch account' : 'Sign in to Closewatch'}
      </h1>

      {notice ? (
        <p className="mt-4 text-sm text-neutral-600">{notice}</p>
      ) : (
        <>
          <GoogleButton onError={setSubmitError} />

          <div className="my-4 flex items-center gap-3 text-xs text-neutral-400">
            <span className="h-px flex-1 bg-neutral-200" />
            or
            <span className="h-px flex-1 bg-neutral-200" />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
            className="space-y-3"
          >
            <form.Field name="email" validators={{ onChange: emailSchema }}>
              {(field) => (
                <AuthField
                  field={field}
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@studio.com"
                />
              )}
            </form.Field>

            <form.Field
              name="password"
              validators={{
                onChange: mode === 'signup' ? signupPasswordSchema : signinPasswordSchema,
              }}
            >
              {(field) => (
                <AuthField
                  field={field}
                  type="password"
                  name="password"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  placeholder="Password"
                />
              )}
            </form.Field>

            {mode === 'signup' && (
              <form.Field
                name="confirmPassword"
                validators={{
                  // Re-check the match whenever the password field changes too.
                  onChangeListenTo: ['password'],
                  onChange: ({ value, fieldApi }) =>
                    value !== fieldApi.form.state.values.password
                      ? 'Passwords do not match'
                      : undefined,
                }}
              >
                {(field) => (
                  <AuthField
                    field={field}
                    type="password"
                    name="confirm-password"
                    autoComplete="new-password"
                    placeholder="Confirm password"
                  />
                )}
              </form.Field>
            )}

            {mode === 'signup' && (
              <p className="text-xs text-neutral-500">
                At least 6 characters, with a number and an uppercase letter.
              </p>
            )}

            <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
              {([canSubmit, isSubmitting]) => (
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {isSubmitting ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}
                </button>
              )}
            </form.Subscribe>

            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          </form>

          <button
            type="button"
            onClick={sendMagicLink}
            className="mt-3 w-full text-center text-xs text-neutral-500 hover:text-neutral-900"
          >
            Email me a magic link instead
          </button>

          <p className="mt-6 text-center text-sm text-neutral-500">
            {mode === 'signup' ? 'Already have an account?' : 'New to Closewatch?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signup' ? 'signin' : 'signup')
                setSubmitError(null)
              }}
              className="font-medium text-neutral-900 hover:underline"
            >
              {mode === 'signup' ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </>
      )}
    </>
  )
}
