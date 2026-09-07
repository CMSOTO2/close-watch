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
import { Check, Copy, Download, Send } from 'lucide-react'
import { useState } from 'react'
import { useForm } from '@tanstack/react-form-start'
import { z } from 'zod'
import { getProposalDetail, getProposalFileUrl } from '#/lib/proposals/detail'
import {
  archiveProposal,
  confirmPageSections,
  createShareLink,
  deleteProposal,
  markProposalLost,
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
import { useToast } from '#/components/toast'
import { PageContainer } from '#/components/page-container'
import { Button } from '#/components/ui/button'
import { BackLink } from '#/components/back-link'
import { cn, formatMoney } from '#/lib/utils'
import { formatDay, useTimeZone } from '#/lib/local-date'
import { deadLinkLabel, partitionLinks } from '#/lib/proposals/link-status'
import { SECTION_LABELS, isProposalId, queryKeys, shareUrl } from '#/constants'
import type { PageSection } from '#/lib/supabase/types'

const detailQuery = (id: string) =>
  queryOptions({
    queryKey: queryKeys.proposal(id),
    queryFn: () => getProposalDetail({ data: { id } }),
  })

export const Route = createFileRoute('/_authed/proposals/$id')({
  // Set only by the upload form, and only when it managed to cut a link. It
  // decides whether this page opens with the hand-off banner or the ordinary
  // detail view.
  validateSearch: z.object({ sent: z.boolean().optional() }),
  loader: async ({ context, params }) => {
    // Before the queries, not after: both server functions validate z.uuid(),
    // so a malformed id threw out of here as a Zod error and got the generic
    // error page instead of the not-found one two lines down.
    if (!isProposalId(params.id)) throw notFound()

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
function expiryInfo(
  iso: string,
  timeZone: string,
): { label: string; soon: boolean } {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / DAY_MS)
  const soon = days <= 7
  if (days <= 0) return { label: 'Expires today', soon: true }
  if (days === 1) return { label: 'Expires tomorrow', soon: true }
  if (days <= 30) return { label: `Expires in ${days} days`, soon }
  return { label: `Expires ${formatDay(iso, timeZone)}`, soon: false }
}

/**
 * The hand-off, shown once, straight after upload.
 *
 * Closewatch does not send anything. The owner sends the link, from their own
 * inbox, and until they do the proposal is a file we are holding and no client
 * has seen. That step used to be invisible: uploading landed you on the
 * dashboard next to a new row, which looks like the job is finished, and the
 * link was two clicks away in a column halfway down this page.
 *
 * So it gets its own block at the top, with the URL in full and one button. It
 * is deliberately loud and deliberately temporary — the ordinary list below is
 * where you come back for the link later, and this disappears on reload.
 */
function SendHandoff({
  url,
  recipient,
  client,
}: {
  url: string
  recipient: string
  client: string
}) {
  const notify = useToast()
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      notify(`Link for ${client} copied`)
    } catch {
      notify('Could not copy — select the link and copy it manually', 'danger')
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-brand-2 bg-brand-soft/60 px-4 py-4">
      <p className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-ink">
        <Send aria-hidden className="size-4 text-brand-2" />
        Now send this link to {recipient}
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
        Closewatch does not email it for you. Paste it into your own message,
        the way you would have attached the PDF. Tracking starts the moment it
        is opened.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* Selectable, and showing the whole URL: someone who does not trust a
            copy button should be able to read what they are about to send. */}
        <code className="min-w-0 flex-1 truncate rounded-md border border-line bg-surface px-3 py-2 font-mono text-[13px] text-ink-2">
          {url}
        </code>
        <Button type="button" variant="brand" onClick={() => void copy()}>
          {copied ? (
            <Check aria-hidden className="size-3.5" />
          ) : (
            <Copy aria-hidden className="size-3.5" />
          )}
          {copied ? 'Copied' : 'Copy link'}
        </Button>
      </div>
    </div>
  )
}

/** Who a link was cut for — used in the list and in the revoke confirmation. */
function recipientOf(link: {
  recipientName: string | null
  recipientEmail: string | null
}): string {
  return link.recipientName ?? link.recipientEmail ?? 'Untitled recipient'
}

function ProposalDetail() {
  const { id } = Route.useParams()
  const { sent } = Route.useSearch()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: proposal } = useSuspenseQuery(detailQuery(id))
  const notify = useToast()
  const [deleting, setDeleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // notFound in the loader means this is always present past that point.
  if (!proposal) return null

  // The newest link that still opens, and only when the upload form sent us
  // here. Read from the proposal rather than passed through the URL, so the
  // token never sits in history or a Referer header.
  const justSent = sent
    ? (partitionLinks(proposal.shareLinks).live.at(0)?.link ?? null)
    : null

  async function runDelete() {
    setDeleting(true)
    try {
      await deleteProposal({ data: { id } })
      notify('Proposal deleted')
      await queryClient.invalidateQueries({
        queryKey: queryKeys.proposalSummaries,
      })
      await router.navigate({ to: '/dashboard' })
    } catch {
      notify('Could not delete that proposal', 'danger')
      setDeleting(false)
      setConfirmOpen(false)
    }
  }

  return (
    <PageContainer className="py-8 sm:py-9">
      <div className="flex items-center justify-between">
        <BackLink />
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

      {/* The row runs the full shell; only the text is capped. With the cap on
          the row itself the button landed wherever 768px happened to fall,
          which on a wide window is the middle of the page rather than the end
          of anything. Now it sits at the same right edge as Delete above it. */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
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

        <DownloadPdfButton id={id} />
      </div>

      {justSent && (
        <SendHandoff
          url={shareUrl(justSent.token)}
          recipient={recipientOf(justSent)}
          client={proposal.clientName}
        />
      )}

      <Outcome proposalId={id} />
      <ProposalActivity proposalId={id} />

      {/* The two management blocks sit side by side once there is room for
          them. Alone in a column each stopped at max-w-3xl while the activity
          above ran the full shell, so every card on the page ended at a
          different place and the right third was dead. Paired, they reach the
          same edge the activity does. Below lg they stack, and nothing is
          capped: a section that stops at 768px inside a 950px shell is the
          same unfilled right-hand strip in a smaller window. Single column
          only ever happens under 1024px, so no input gets sprawling — the
          widest a field reaches before the columns split is about 390px. */}
      <div className="grid items-start gap-x-10 lg:grid-cols-2">
        <ShareLinks proposalId={id} />
        <PageTags proposalId={id} />
      </div>
    </PageContainer>
  )
}

/**
 * Gets the owner their own PDF back.
 *
 * The file lives in a private bucket, so there is no href to put in the markup:
 * a URL is signed on click and used immediately. Hence a button rather than a
 * link, and hence the click handler doing the navigation itself.
 *
 * `window.location.assign` rather than a new tab: the signed URL carries
 * Content-Disposition attachment, so the browser downloads it and stays where
 * it is. A new tab would open and immediately blank.
 */
function DownloadPdfButton({ id }: { id: string }) {
  const notify = useToast()
  const [busy, setBusy] = useState(false)

  async function download() {
    setBusy(true)
    try {
      const { url } = await getProposalFileUrl({ data: { id } })
      window.location.assign(url)
    } catch {
      notify('Could not open that PDF right now', 'danger')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      type="button"
      variant="brand"
      size="sm"
      disabled={busy}
      onClick={() => void download()}
    >
      <Download aria-hidden className="size-3.5" />
      {busy ? 'Preparing…' : 'Download PDF'}
    </Button>
  )
}

function Outcome({ proposalId }: { proposalId: string }) {
  const queryClient = useQueryClient()
  const { data: proposal } = useSuspenseQuery(detailQuery(proposalId))
  const notify = useToast()
  const timeZone = useTimeZone()
  const [busy, setBusy] = useState(false)
  const [revokeLinks, setRevokeLinks] = useState(false)
  const [confirmLost, setConfirmLost] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)

  if (!proposal) return null
  const closed =
    proposal.status === 'won' ||
    proposal.status === 'lost' ||
    proposal.status === 'archived'

  /**
   * Paints the outcome immediately and rolls back if the server disagrees.
   * Marking a deal paid is a moment worth celebrating, not one to spend
   * watching three queries refetch before anything on screen changes.
   */
  async function run(
    fn: () => Promise<unknown>,
    next: { status: 'won' | 'lost' | 'sent' | 'archived'; message: string },
  ) {
    const key = queryKeys.proposal(proposalId)
    await queryClient.cancelQueries({ queryKey: key })
    const previous = queryClient.getQueryData(key)

    queryClient.setQueryData(key, (old: typeof proposal) =>
      old == null
        ? old
        : {
            ...old,
            status: next.status,
            // Reopening clears the outcome date, and archiving never sets one:
            // it is the stamp for a deal that resolved, and neither of those
            // did. Won and lost are the two that stamp it.
            outcomeAt:
              next.status === 'sent' || next.status === 'archived'
                ? null
                : new Date().toISOString(),
          },
    )
    setBusy(true)

    try {
      await fn()
      notify(next.message, next.status === 'won' ? 'good' : 'neutral')
    } catch {
      queryClient.setQueryData(key, previous)
      notify('That did not save — nothing was changed', 'danger')
    } finally {
      setBusy(false)
      // The totals and the list are derived from this proposal, so they are
      // refreshed either way: after a success, and after a rollback.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: key }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.proposalSummaries,
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.securedTotals }),
      ])
    }
  }

  if (closed) {
    const won = proposal.status === 'won'
    const archived = proposal.status === 'archived'
    const markedOn =
      proposal.outcomeAt === null
        ? null
        : formatDay(proposal.outcomeAt, timeZone)
    const value =
      proposal.dealValueCents == null
        ? null
        : formatMoney(proposal.dealValueCents, proposal.currency)

    return (
      <div
        className={cn(
          'mt-6 flex items-center justify-between gap-4 rounded-lg border px-4 py-3',
          won ? 'border-good-line bg-good-soft' : 'border-line bg-surface-2',
        )}
      >
        <div>
          <p
            className={cn(
              'text-sm font-semibold',
              won ? 'text-good' : 'text-ink-2',
            )}
          >
            {won ? 'Paid & finalized' : archived ? 'Archived' : 'Didn’t close'}
            {value !== null && (
              <>
                {' · '}
                {/* Struck through on a loss, matching how the closed list
                    already prints a value that never landed. Archiving makes
                    no claim either way, so its value is printed plainly. */}
                <span className={won || archived ? undefined : 'line-through'}>
                  {value}
                </span>
              </>
            )}
          </p>
          {archived ? (
            // There is no date to print because nothing was stamped, so this
            // says what the status means instead: it is off the list, and it
            // is not on the record as a win or a loss.
            <p className="text-xs text-ink-3">
              Out of the pipeline, with no outcome recorded
            </p>
          ) : (
            markedOn && (
              <p className={cn('text-xs', won ? 'text-good/80' : 'text-ink-3')}>
                Marked {markedOn}
              </p>
            )
          )}
        </div>
        <button
          onClick={() =>
            run(() => reopenProposal({ data: { id: proposalId } }), {
              status: 'sent',
              message: 'Reopened',
            })
          }
          disabled={busy}
          className={cn(
            'shrink-0 text-xs font-medium hover:underline disabled:opacity-50',
            won ? 'text-good' : 'text-ink-2',
          )}
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
          run(
            () => markProposalWon({ data: { id: proposalId, revokeLinks } }),
            { status: 'won', message: 'Marked as paid \u2014 nice one' },
          )
        }
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-md bg-good px-4 py-2 text-sm font-medium text-good-fg shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Mark as paid & finalized'}
      </button>
      {/* Quiet beside the win, but present: a deal that fell through is worth
          recording rather than deleting or leaving open forever, and the
          proposal keeps every visit and reader it collected either way. */}
      <button
        onClick={() => setConfirmLost(true)}
        disabled={busy}
        className="rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium text-ink-2 shadow-sm transition-colors hover:border-ink-3 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
      >
        Mark as lost
      </button>
      {/* The third exit, and the quietest, because it is the one that makes no
          claim: the deal is off the list and nothing has been said about how it
          went. It matters more than its weight suggests. Without it, a free
          account that needs a slot back has to call a live deal won or lost,
          and the outcome data is the one asset here a competitor cannot copy. */}
      <button
        onClick={() => setConfirmArchive(true)}
        disabled={busy}
        className="text-sm font-medium text-ink-2 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
      >
        Archive
      </button>

      <ConfirmDialog
        open={confirmArchive}
        title="Archive this proposal?"
        message="It leaves the pipeline and moves to Closed without being recorded as won or lost. Every visit, reader and page it collected is kept, the slot comes back on the free plan, and you can reopen it at any time."
        confirmLabel="Archive"
        busyLabel="Saving…"
        busy={busy}
        onConfirm={async () => {
          await run(
            () => archiveProposal({ data: { id: proposalId, revokeLinks } }),
            { status: 'archived', message: 'Archived — the stats stay' },
          )
          setConfirmArchive(false)
        }}
        onCancel={() => setConfirmArchive(false)}
      />

      <ConfirmDialog
        open={confirmLost}
        title="Mark this deal as lost?"
        message="It leaves the pipeline and moves to Closed. Every visit, reader and page it collected is kept, and you can reopen it if the client comes back."
        confirmLabel="Mark as lost"
        busyLabel="Saving…"
        busy={busy}
        onConfirm={async () => {
          await run(
            () => markProposalLost({ data: { id: proposalId, revokeLinks } }),
            { status: 'lost', message: 'Marked as lost \u2014 the stats stay' },
          )
          setConfirmLost(false)
        }}
        onCancel={() => setConfirmLost(false)}
      />
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

  const notify = useToast()
  const timeZone = useTimeZone()
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  // Holds the link awaiting confirmation. The recipient's name travels with it
  // so the dialog can name who is about to lose their link, rather than asking
  // about "this link" while the list sits behind a scrim.
  const [pendingRevoke, setPendingRevoke] = useState<{
    id: string
    recipient: string
  } | null>(null)
  const [revoking, setRevoking] = useState(false)
  // Hidden by default. A revoked link is a decision already made; leaving them
  // stacked above the form makes a proposal with a few false starts look busier
  // than it is, and buries the link that actually works.
  const [showDead, setShowDead] = useState(false)

  const { live, dead, revoked, expired } = partitionLinks(links)
  const visible = showDead ? [...live, ...dead] : live

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
        notify('Share link created')
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
      notify('Link copied')
    } catch {
      // A toast rather than `setError`, which renders at the foot of the
      // section: a copy that failed should say so next to the pointer, not
      // several rows below the button that was pressed.
      notify('Could not copy — select the link and copy it manually', 'danger')
    }
  }

  async function confirmRevoke() {
    if (pendingRevoke === null) return
    setRevoking(true)
    try {
      await revokeShareLink({ data: { id: pendingRevoke.id } })
      notify(`${pendingRevoke.recipient}'s link no longer opens`)
      setPendingRevoke(null)
    } catch {
      notify('Could not revoke that link', 'danger')
    } finally {
      setRevoking(false)
      await refresh()
    }
  }

  return (
    <section className="mt-10">
      <ConfirmDialog
        open={pendingRevoke !== null}
        title="Revoke this link?"
        message={
          pendingRevoke === null
            ? ''
            : `${pendingRevoke.recipient} will not be able to open the proposal again. What they have already read is kept, but reaching them means sending a new link.`
        }
        confirmLabel="Revoke link"
        busyLabel="Revoking…"
        destructive
        busy={revoking}
        onConfirm={confirmRevoke}
        onCancel={() => setPendingRevoke(null)}
      />

      <h2 className="font-display text-base font-semibold tracking-tight">
        Share links
      </h2>
      <p className="mt-1 text-[13px] text-ink-2">
        One link per recipient. That&rsquo;s how you tell who&rsquo;s reading.
      </p>

      {visible.length > 0 && (
        <ul className="mt-4 space-y-2">
          {visible.map(({ link, status }) => {
            const isDead = status !== 'live'
            const expiry =
              !isDead && link.expiresAt
                ? expiryInfo(link.expiresAt, timeZone)
                : null
            return (
              <li
                key={link.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-line bg-surface px-3 py-2 shadow-sm"
              >
                <div className="min-w-0 flex-1 basis-64">
                  <p className="truncate text-sm">{recipientOf(link)}</p>
                  <p
                    className={`truncate font-mono text-[11px] ${isDead ? 'text-ink-3 line-through' : 'text-ink-2'}`}
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
                {isDead ? (
                  <span className="font-mono text-[10px] uppercase tracking-wide text-ink-3">
                    {status}
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
                      onClick={() =>
                        setPendingRevoke({
                          id: link.id,
                          recipient: recipientOf(link),
                        })
                      }
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

      {dead.length > 0 && (
        <button
          type="button"
          onClick={() => setShowDead((prev) => !prev)}
          aria-expanded={showDead}
          className="mt-3 text-xs font-medium text-ink-3 transition-colors hover:text-ink"
        >
          {showDead ? 'Hide' : 'Show'} {deadLinkLabel({ revoked, expired })}
        </button>
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
  const notify = useToast()
  const pages = proposal?.pages ?? []
  const [savingPage, setSavingPage] = useState<number | null>(null)
  const [confirming, setConfirming] = useState(false)

  async function onChange(pageNumber: number, section: PageSection) {
    setSavingPage(pageNumber)
    try {
      await setPageSection({ data: { proposalId, pageNumber, section } })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.proposal(proposalId),
      })
    } catch {
      // The select is driven by the query, so a failure used to reset it to the
      // old tag and say nothing at all — leaving the owner to believe pricing
      // was tagged when it was not.
      notify('Could not save that page tag', 'danger')
    } finally {
      setSavingPage(null)
    }
  }

  const guessed = pages.filter((p) => p.sectionAuto).length

  async function confirmAll() {
    setConfirming(true)
    try {
      await confirmPageSections({ data: { proposalId } })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.proposal(proposalId),
      })
    } catch {
      notify('Could not confirm those page tags', 'danger')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <section className="mt-10">
      <h2 className="font-display text-base font-semibold tracking-tight">
        Pages
      </h2>
      <p className="mt-1 text-[13px] text-ink-2">
        Tag your pricing page so you can see when a client lingers on it.
      </p>

      {guessed > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 px-3.5 py-3">
          <p className="text-[13px] text-ink-2">
            <span className="font-medium text-ink">
              {guessed} {guessed === 1 ? 'page was' : 'pages were'} tagged
              automatically.
            </span>{' '}
            Worth checking the pricing page before you send it.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={confirmAll}
            disabled={confirming}
          >
            {confirming ? 'Saving\u2026' : 'Looks right'}
          </Button>
        </div>
      )}

      <ul className="mt-4 divide-y divide-line-soft">
        {pages.map((page) => (
          <li
            key={page.pageNumber}
            className="flex items-center justify-between gap-3 py-2"
          >
            <span className="flex items-center gap-2 text-[13px] text-ink-2">
              Page {page.pageNumber}
              {page.sectionAuto && (
                <span
                  className="rounded-sm bg-surface-3 px-1.5 py-0.5 text-[11px] text-ink-2"
                  // Said plainly rather than with a bare dot: the owner needs
                  // to know this tag is a guess before they trust a number
                  // built on it.
                  title="Tagged automatically from the page text"
                >
                  guessed
                </span>
              )}
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
