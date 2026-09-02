import { createFileRoute } from '@tanstack/react-router'
import {
  queryOptions,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from '@tanstack/react-form-start'
import { z } from 'zod'
import { getProfile, updateProfile } from '#/lib/profile'
import { entitlementsQuery } from '#/lib/billing/entitlements'
import { BillingSection } from '#/components/billing/billing-section'
import { PageContainer } from '#/components/page-container'
import { BackLink } from '#/components/back-link'
import { queryKeys } from '#/constants'

const profileQuery = queryOptions({
  queryKey: queryKeys.profile,
  queryFn: () => getProfile(),
})

export const Route = createFileRoute('/_authed/settings')({
  // Stripe sends people back here after checkout. Anything else in the query
  // string is ignored rather than being an error the user cannot fix.
  validateSearch: z.object({
    billing: z.enum(['done', 'cancelled', 'managed']).optional(),
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.query(profileQuery),
      context.queryClient.query(entitlementsQuery),
    ]),
  component: SettingsPage,
})

function SettingsPage() {
  const { billing } = Route.useSearch()
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
          data: {
            fullName: value.fullName.trim(),
            companyName: value.companyName.trim(),
          },
        })
        await queryClient.invalidateQueries({ queryKey: queryKeys.profile })
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not save your profile',
        )
      }
    },
  })

  return (
    <PageContainer className="py-8 sm:py-9">
      <div className="max-w-xl">
        <BackLink />

        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">
          Your profile
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
          This is the name recipients see on your proposals — the
          &ldquo;from&rdquo; line in the viewer and &ldquo;Sent by&rdquo; on
          each proposal. Your company name is shown when set, otherwise your
          name.
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
                <span className="kicker">Your name</span>
                <input
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Jordan Rivera"
                  className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink transition-colors placeholder:text-ink-3 hover:border-ink-3 focus-visible:border-brand-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                />
              </label>
            )}
          </form.Field>

          <form.Field name="companyName">
            {(field) => (
              <label className="block">
                <span className="kicker">Company name</span>
                <input
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Acme Studio"
                  className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink transition-colors placeholder:text-ink-3 hover:border-ink-3 focus-visible:border-brand-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                />
              </label>
            )}
          </form.Field>

          <div className="flex items-center gap-3">
            <form.Subscribe
              selector={(s) => [s.canSubmit, s.isSubmitting] as const}
            >
              {([canSubmit, isSubmitting]) => (
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving…' : 'Save'}
                </button>
              )}
            </form.Subscribe>
            {saved && (
              <span className="text-[13px] font-medium text-good">Saved</span>
            )}
            {error && <span className="text-[13px] text-danger">{error}</span>}
          </div>
        </form>

        <BillingSection
          justPaid={billing === 'done'}
          justManaged={billing === 'managed'}
        />

        {profile?.email && (
          <p className="mt-8 border-t border-line pt-5 text-xs text-ink-3">
            Signed in as {profile.email}
          </p>
        )}
      </div>
    </PageContainer>
  )
}
