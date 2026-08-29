import { Link, createFileRoute, notFound, useRouter } from '@tanstack/react-router'
import { queryOptions, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from '@tanstack/react-form-start'
import { getProposalDetail } from '#/lib/proposals/detail'
import {
  createShareLink,
  deleteProposal,
  revokeShareLink,
  setPageSection,
} from '#/lib/proposals/mutations'
import { ProposalActivity, proposalAnalyticsQuery } from '#/components/proposal-activity'
import { ConfirmDialog } from '#/components/confirm-dialog'
import { SECTION_LABELS, queryKeys } from '#/constants'
import type { PageSection } from '#/lib/supabase/types'

const detailQuery = (id: string) =>
  queryOptions({
    queryKey: queryKeys.proposal(id),
    queryFn: () => getProposalDetail({ data: { id } }),
  })

export const Route = createFileRoute('/_authed/proposals/$id')({
  loader: async ({ context, params }) => {
    const [proposal] = await Promise.all([
      context.queryClient.query(detailQuery(params.id)),
      context.queryClient.query(proposalAnalyticsQuery(params.id)),
    ])
    if (!proposal) throw notFound()
  },
  component: ProposalDetail,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center">
      <h1 className="text-lg font-medium">Proposal not found</h1>
      <Link to="/dashboard" className="mt-3 inline-block text-sm text-neutral-500 hover:text-neutral-900">
        Back to proposals
      </Link>
    </div>
  ),
})

const DAY_MS = 24 * 60 * 60 * 1000

/** Human-readable expiry for an active share link. `soon` flags the last week. */
function expiryInfo(iso: string): { label: string; soon: boolean } {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / DAY_MS)
  const soon = days <= 7
  if (days <= 0) return { label: 'Expires today', soon: true }
  if (days === 1) return { label: 'Expires tomorrow', soon: true }
  if (days <= 30) return { label: `Expires in ${days} days`, soon }
  const date = new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return { label: `Expires ${date}`, soon: false }
}

function ProposalDetail() {
  const { id } = Route.useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: proposal } = useSuspenseQuery(detailQuery(id))
  const [deleting, setDeleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // notFound in the loader means this is always present past that point.
  if (!proposal) return null

  async function runDelete() {
    setDeleting(true)
    try {
      await deleteProposal({ data: { id } })
      await queryClient.invalidateQueries({ queryKey: queryKeys.proposalSummaries })
      await router.navigate({ to: '/dashboard' })
    } catch {
      setDeleting(false)
      setConfirmOpen(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex items-center justify-between">
        <Link to="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Proposals
        </Link>
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={deleting}
          className="text-sm text-neutral-400 hover:text-red-600 disabled:opacity-50"
        >
          Delete
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete proposal?"
        message="Its share link and all tracking data are removed for good."
        confirmLabel="Delete"
        busyLabel="Deleting…"
        destructive
        busy={deleting}
        onConfirm={runDelete}
        onCancel={() => setConfirmOpen(false)}
      />

      <div className="mt-4">
        <h1 className="text-xl font-semibold">{proposal.clientName}</h1>
        <p className="text-sm text-neutral-500">{proposal.title}</p>
        <p className="mt-2 text-sm text-neutral-500">
          {proposal.pageCount} pages
          {proposal.dealValueCents != null && (
            <> · {formatMoney(proposal.dealValueCents, proposal.currency)}</>
          )}
          {' · '}
          {proposal.status}
        </p>
      </div>

      <ShareLinks proposalId={id} />
      <ProposalActivity proposalId={id} />
      <PageTags proposalId={id} />
    </div>
  )
}

function ShareLinks({ proposalId }: { proposalId: string }) {
  const queryClient = useQueryClient()
  const { data: proposal } = useSuspenseQuery(detailQuery(proposalId))
  const links = proposal?.shareLinks ?? []

  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.proposal(proposalId) })

  const form = useForm({
    defaultValues: { recipientName: '', recipientEmail: '' },
    onSubmit: async ({ value }) => {
      setError(null)
      try {
        await createShareLink({
          data: {
            proposalId,
            recipientName: value.recipientName.trim() || undefined,
            recipientEmail: value.recipientEmail.trim() || undefined,
          },
        })
        form.reset()
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not create the link')
      }
    },
  })

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(url)
      setTimeout(() => setCopied((c) => (c === url ? null : c)), 1500)
    } catch {
      setError('Copy failed — select the link and copy manually.')
    }
  }

  async function revoke(linkId: string) {
    await revokeShareLink({ data: { id: linkId } })
    await refresh()
  }

  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold text-neutral-800">Share links</h2>
      <p className="mt-1 text-xs text-neutral-500">
        One link per recipient. That&rsquo;s how you tell who&rsquo;s reading.
      </p>

      {links.length > 0 && (
        <ul className="mt-4 space-y-2">
          {links.map((link) => {
            const revoked = link.revokedAt != null
            const expired = link.expiresAt != null && new Date(link.expiresAt) < new Date()
            const dead = revoked || expired
            const expiry = !dead && link.expiresAt ? expiryInfo(link.expiresAt) : null
            return (
              <li
                key={link.id}
                className="flex items-center gap-3 rounded-md border border-neutral-200 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    {link.recipientName ?? link.recipientEmail ?? 'Untitled recipient'}
                  </p>
                  <p className={`truncate text-xs ${dead ? 'text-neutral-400 line-through' : 'text-neutral-500'}`}>
                    {link.url}
                  </p>
                  {expiry && (
                    <p className={`text-xs ${expiry.soon ? 'text-amber-600' : 'text-neutral-400'}`}>
                      {expiry.label}
                      {expiry.soon && ' — send a fresh link if this deal is still live'}
                    </p>
                  )}
                </div>
                {dead ? (
                  <span className="text-xs text-neutral-400">{revoked ? 'revoked' : 'expired'}</span>
                ) : (
                  <>
                    <button
                      onClick={() => copy(link.url)}
                      className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50"
                    >
                      {copied === link.url ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      onClick={() => revoke(link.id)}
                      className="text-xs text-neutral-400 hover:text-red-600"
                    >
                      Revoke
                    </button>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="mt-4 flex flex-wrap items-end gap-2"
      >
        <form.Field name="recipientName">
          {(field) => (
            <label className="flex-1">
              <span className="text-xs text-neutral-500">Recipient name</span>
              <input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Jordan at Acme"
                className="mt-1 w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm"
              />
            </label>
          )}
        </form.Field>
        <form.Field
          name="recipientEmail"
          validators={{
            onChange: ({ value }) =>
              !value || /.+@.+\..+/.test(value) ? undefined : 'Enter a valid email',
          }}
        >
          {(field) => (
            <label className="flex-1">
              <span className="text-xs text-neutral-500">Email (optional)</span>
              <input
                type="email"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="jordan@acme.com"
                className="mt-1 w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm"
              />
              {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                <span className="mt-1 block text-xs text-red-600">
                  {field.state.meta.errors.join(', ')}
                </span>
              )}
            </label>
          )}
        </form.Field>
        <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
          {([canSubmit, isSubmitting]) => (
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {isSubmitting ? 'Creating…' : 'New link'}
            </button>
          )}
        </form.Subscribe>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  )
}

function PageTags({ proposalId }: { proposalId: string }) {
  const queryClient = useQueryClient()
  const { data: proposal } = useSuspenseQuery(detailQuery(proposalId))
  const pages = proposal?.pages ?? []
  const [savingPage, setSavingPage] = useState<number | null>(null)

  async function onChange(pageNumber: number, section: PageSection) {
    setSavingPage(pageNumber)
    try {
      await setPageSection({ data: { proposalId, pageNumber, section } })
      await queryClient.invalidateQueries({ queryKey: queryKeys.proposal(proposalId) })
    } finally {
      setSavingPage(null)
    }
  }

  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold text-neutral-800">Pages</h2>
      <p className="mt-1 text-xs text-neutral-500">
        Tag your pricing page so you can see when a client lingers on it.
      </p>

      <ul className="mt-4 divide-y divide-neutral-100">
        {pages.map((page) => (
          <li key={page.pageNumber} className="flex items-center justify-between gap-3 py-2">
            <span className="text-sm text-neutral-600">Page {page.pageNumber}</span>
            <div className="flex items-center gap-2">
              {savingPage === page.pageNumber && (
                <span className="text-xs text-neutral-400">saving…</span>
              )}
              <select
                value={page.section}
                onChange={(e) => onChange(page.pageNumber, e.target.value as PageSection)}
                className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
              >
                {(Object.keys(SECTION_LABELS) as Array<PageSection>).map((s) => (
                  <option key={s} value={s}>
                    {SECTION_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(0)} ${currency}`
  }
}
