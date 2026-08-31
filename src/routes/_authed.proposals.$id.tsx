import {
  Link,
  createFileRoute,
  notFound,
  useRouter,
} from '@tanstack/react-router'
import {
  queryOptions,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from '@tanstack/react-form-start'
import { getProposalDetail } from '#/lib/proposals/detail'
import {
  createShareLink,
  deleteProposal,
  markProposalWon,
  reopenProposal,
  revokeShareLink,
  setPageSection,
} from '#/lib/proposals/mutations'
import {
  ProposalActivity,
  proposalAnalyticsQuery,
} from '#/components/proposal-activity'
import { ConfirmDialog } from '#/components/confirm-dialog'
import { PageContainer } from '#/components/page-container'
import { formatMoney } from '#/lib/utils'
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
    <PageContainer className="py-16 text-center">
      <h1 className="font-display text-lg font-semibold tracking-tight">
        Proposal not found
      </h1>
      <Link
        to="/dashboard"
        className="mt-3 inline-block text-[13px] text-ink-2 transition-colors hover:text-ink"
      >
        Back to proposals
      </Link>
    </PageContainer>
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
      await queryClient.invalidateQueries({
        queryKey: queryKeys.proposalSummaries,
      })
      await router.navigate({ to: '/dashboard' })
    } catch {
      setDeleting(false)
      setConfirmOpen(false)
    }
  }

  return (
    <PageContainer className="py-8 sm:py-9">
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard"
          className="text-[13px] text-ink-2 transition-colors hover:text-ink"
        >
          ← Proposals
        </Link>
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={deleting}
          className="text-[13px] text-ink-3 transition-colors hover:text-danger disabled:opacity-50"
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

      <div className="mt-4 max-w-3xl">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {proposal.clientName}
        </h1>
        <p className="text-[13px] text-ink-2">{proposal.title}</p>
        <p className="mt-2 text-[13px] text-ink-3">
          {proposal.pageCount} pages
          {proposal.dealValueCents != null && (
            <> · {formatMoney(proposal.dealValueCents, proposal.currency)}</>
          )}
          {' · '}
          {proposal.status}
          {(proposal.owner.name ?? proposal.owner.email) && (
            <> · Sent by {proposal.owner.name ?? proposal.owner.email}</>
          )}
        </p>
      </div>

      <Outcome proposalId={id} />
      <ShareLinks proposalId={id} />
      <ProposalActivity proposalId={id} />
      <PageTags proposalId={id} />
    </PageContainer>
  )
}

function Outcome({ proposalId }: { proposalId: string }) {
  const queryClient = useQueryClient()
  const { data: proposal } = useSuspenseQuery(detailQuery(proposalId))
  const [busy, setBusy] = useState(false)
  const [revokeLinks, setRevokeLinks] = useState(false)

  if (!proposal) return null
  const won = proposal.status === 'won'

  async function run(fn: () => Promise<unknown>) {
    setBusy(true)
    try {
      await fn()
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.proposal(proposalId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.proposalSummaries,
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.securedTotals }),
      ])
    } finally {
      setBusy(false)
    }
  }

  if (won) {
    const markedOn = proposal.outcomeAt
      ? new Date(proposal.outcomeAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : null
    return (
      <div className="mt-6 flex items-center justify-between gap-4 rounded-lg border border-good-line bg-good-soft px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-good">
            Paid &amp; finalized
            {proposal.dealValueCents != null && (
              <> · {formatMoney(proposal.dealValueCents, proposal.currency)}</>
            )}
          </p>
          {markedOn && (
            <p className="text-xs text-good/80">Marked {markedOn}</p>
          )}
        </div>
        <button
          onClick={() =>
            run(() => reopenProposal({ data: { id: proposalId } }))
          }
          disabled={busy}
          className="shrink-0 text-xs font-medium text-good hover:underline disabled:opacity-50"
        >
          Reopen
        </button>
      </div>
    )
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2">
      <button
        onClick={() =>
          run(() => markProposalWon({ data: { id: proposalId, revokeLinks } }))
        }
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-md bg-good px-4 py-2 text-sm font-medium text-good-fg shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Mark as paid & finalized'}
      </button>
      <label className="inline-flex items-center gap-1.5 text-xs text-ink-2">
        <input
          type="checkbox"
          checked={revokeLinks}
          onChange={(e) => setRevokeLinks(e.target.checked)}
          className="rounded border-line accent-[var(--brand)]"
        />
        Also revoke share links
      </label>
    </div>
  )
}

function ShareLinks({ proposalId }: { proposalId: string }) {
  const queryClient = useQueryClient()
  const { data: proposal } = useSuspenseQuery(detailQuery(proposalId))
  const links = proposal?.shareLinks ?? []

  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.proposal(proposalId) })

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
        setError(
          err instanceof Error ? err.message : 'Could not create the link',
        )
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
    <section className="mt-10 max-w-3xl">
      <h2 className="font-display text-base font-semibold tracking-tight">
        Share links
      </h2>
      <p className="mt-1 text-[13px] text-ink-2">
        One link per recipient. That&rsquo;s how you tell who&rsquo;s reading.
      </p>

      {links.length > 0 && (
        <ul className="mt-4 space-y-2">
          {links.map((link) => {
            const revoked = link.revokedAt != null
            const expired =
              link.expiresAt != null && new Date(link.expiresAt) < new Date()
            const dead = revoked || expired
            const expiry =
              !dead && link.expiresAt ? expiryInfo(link.expiresAt) : null
            return (
              <li
                key={link.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-line bg-surface px-3 py-2 shadow-sm"
              >
                <div className="min-w-0 flex-1 basis-64">
                  <p className="truncate text-sm">
                    {link.recipientName ??
                      link.recipientEmail ??
                      'Untitled recipient'}
                  </p>
                  <p
                    className={`truncate font-mono text-[11px] ${dead ? 'text-ink-3 line-through' : 'text-ink-2'}`}
                  >
                    {link.url}
                  </p>
                  {expiry && (
                    <p
                      className={`text-xs ${expiry.soon ? 'text-warm' : 'text-ink-3'}`}
                    >
                      {expiry.label}
                      {expiry.soon &&
                        ' — send a fresh link if this deal is still live'}
                    </p>
                  )}
                </div>
                {dead ? (
                  <span className="font-mono text-[10px] uppercase tracking-wide text-ink-3">
                    {revoked ? 'revoked' : 'expired'}
                  </span>
                ) : (
                  <>
                    <button
                      onClick={() => copy(link.url)}
                      className="rounded-md border border-line bg-surface px-2 py-1 text-xs font-medium text-ink-2 transition-colors hover:border-ink-3 hover:text-ink"
                    >
                      {copied === link.url ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      onClick={() => revoke(link.id)}
                      className="text-xs text-ink-3 transition-colors hover:text-danger"
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
            <label className="min-w-[12rem] flex-1">
              <span className="kicker">Recipient name</span>
              <input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Jordan at Acme"
                className="mt-1.5 w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink transition-colors placeholder:text-ink-3 hover:border-ink-3 focus-visible:border-brand-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
              />
            </label>
          )}
        </form.Field>
        <form.Field
          name="recipientEmail"
          validators={{
            onChange: ({ value }) =>
              !value || /.+@.+\..+/.test(value)
                ? undefined
                : 'Enter a valid email',
          }}
        >
          {(field) => (
            <label className="min-w-[12rem] flex-1">
              <span className="kicker">Email (optional)</span>
              <input
                type="email"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="jordan@acme.com"
                className="mt-1.5 w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink transition-colors placeholder:text-ink-3 hover:border-ink-3 focus-visible:border-brand-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
              />
              {field.state.meta.isTouched &&
                field.state.meta.errors.length > 0 && (
                  <span className="mt-1 block text-xs text-danger">
                    {field.state.meta.errors.join(', ')}
                  </span>
                )}
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
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
            >
              {isSubmitting ? 'Creating…' : 'New link'}
            </button>
          )}
        </form.Subscribe>
      </form>
      {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
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
      await queryClient.invalidateQueries({
        queryKey: queryKeys.proposal(proposalId),
      })
    } finally {
      setSavingPage(null)
    }
  }

  return (
    <section className="mt-10 max-w-3xl">
      <h2 className="font-display text-base font-semibold tracking-tight">
        Pages
      </h2>
      <p className="mt-1 text-[13px] text-ink-2">
        Tag your pricing page so you can see when a client lingers on it.
      </p>

      <ul className="mt-4 divide-y divide-line-soft">
        {pages.map((page) => (
          <li
            key={page.pageNumber}
            className="flex items-center justify-between gap-3 py-2"
          >
            <span className="text-[13px] text-ink-2">
              Page {page.pageNumber}
            </span>
            <div className="flex items-center gap-2">
              {savingPage === page.pageNumber && (
                <span className="text-xs text-ink-3">saving…</span>
              )}
              <select
                value={page.section}
                onChange={(e) =>
                  onChange(page.pageNumber, e.target.value as PageSection)
                }
                className="cursor-pointer rounded-md border border-line bg-surface px-2 py-1 text-[13px] text-ink-2 transition-colors hover:border-ink-3 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {(Object.keys(SECTION_LABELS) as Array<PageSection>).map(
                  (s) => (
                    <option key={s} value={s}>
                      {SECTION_LABELS[s]}
                    </option>
                  ),
                )}
              </select>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
