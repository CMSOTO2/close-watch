import { Link, createFileRoute } from '@tanstack/react-router'
import { queryOptions, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from '@tanstack/react-form-start'
import { getProfile, updateProfile } from '#/lib/profile'
import { queryKeys } from '#/constants'

const profileQuery = queryOptions({
  queryKey: queryKeys.profile,
  queryFn: () => getProfile(),
})

export const Route = createFileRoute('/_authed/settings')({
  loader: ({ context }) => context.queryClient.query(profileQuery),
  component: SettingsPage,
})

function SettingsPage() {
  const queryClient = useQueryClient()
  const { data: profile } = useSuspenseQuery(profileQuery)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const form = useForm({
    defaultValues: {
      fullName: profile?.fullName ?? '',
      companyName: profile?.companyName ?? '',
    },
    onSubmit: async ({ value }) => {
      setError(null)
      setSaved(false)
      try {
        await updateProfile({
          data: { fullName: value.fullName.trim(), companyName: value.companyName.trim() },
        })
        await queryClient.invalidateQueries({ queryKey: queryKeys.profile })
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save your profile')
      }
    },
  })

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      <Link to="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← Proposals
      </Link>

      <h1 className="mt-4 text-xl font-semibold">Your profile</h1>
      <p className="mt-1 text-sm text-neutral-500">
        This is the name recipients see on your proposals — the &ldquo;from&rdquo; line in the
        viewer and &ldquo;Sent by&rdquo; on each proposal. Your company name is shown when set,
        otherwise your name.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="mt-6 space-y-4"
      >
        <form.Field name="fullName">
          {(field) => (
            <label className="block">
              <span className="text-xs text-neutral-500">Your name</span>
              <input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Jordan Rivera"
                className="mt-1 w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm"
              />
            </label>
          )}
        </form.Field>

        <form.Field name="companyName">
          {(field) => (
            <label className="block">
              <span className="text-xs text-neutral-500">Company name</span>
              <input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Acme Studio"
                className="mt-1 w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm"
              />
            </label>
          )}
        </form.Field>

        <div className="flex items-center gap-3">
          <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
            {([canSubmit, isSubmitting]) => (
              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {isSubmitting ? 'Saving…' : 'Save'}
              </button>
            )}
          </form.Subscribe>
          {saved && <span className="text-sm text-green-600">Saved</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>

      {profile?.email && (
        <p className="mt-8 text-xs text-neutral-400">Signed in as {profile.email}</p>
      )}
    </div>
  )
}
