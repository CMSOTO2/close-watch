import { createFileRoute } from '@tanstack/react-router'
import {
  queryOptions,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from '@tanstack/react-form-start'
import { z } from 'zod'
import { displayNameSchema, getProfile, updateProfile } from '#/lib/profile'
import { fieldError } from '#/components/auth/validation'
import { entitlementsQuery } from '#/lib/billing/entitlements'
import { discountQuery } from '#/lib/billing/discount'
import { BillingSection } from '#/components/billing/billing-section'
import { FoldersSection } from '#/components/folders-section'
import { foldersQuery } from '#/lib/folders'
import { PageContainer } from '#/components/page-container'
import { BackLink } from '#/components/back-link'
import { queryKeys, shareLinkPreview } from '#/constants'

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
      context.queryClient.query(discountQuery),
      context.queryClient.query(foldersQuery),
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
          The name your clients see goes at the top of every proposal and into
          each share link. Change it and your links change with it; ones you
          have already sent keep working.
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
                  className="mt-1.5 w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink transition-colors placeholder:text-ink-3 hover:border-ink-3 focus-visible:border-brand-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                />
              </label>
            )}
          </form.Field>

          <form.Field
            name="companyName"
            validators={{ onChange: displayNameSchema }}
          >
            {(field) => (
              <label className="block">
                <span className="kicker">Name your clients see</span>
                <input
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Acme Studio"
                  maxLength={80}
                  className="mt-1.5 w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink transition-colors placeholder:text-ink-3 hover:border-ink-3 focus-visible:border-brand-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                />
                {field.state.meta.errors.length > 0 && (
                  <span className="mt-1.5 block text-[13px] text-danger">
                    {fieldError(field.state.meta.errors)}
                  </span>
                )}
                {/* The name is in every link, so show the link it makes. */}
                <span className="mt-1.5 block truncate font-mono text-[12px] text-ink-3">
                  Your links look like{' '}
                  {shareLinkPreview(field.state.value.trim() || null)}
                </span>
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

        <FoldersSection mainName={profile?.companyName ?? null} />

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
