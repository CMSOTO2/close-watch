import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from '@tanstack/react-form-start'
import { createProposal } from '#/lib/proposals/create'
import { createShareLink } from '#/lib/proposals/mutations'
import { logOnboardingEvent } from '#/lib/onboarding/log-event'
import { classifyPages } from '#/lib/proposals/classify'
import type { PageText } from '#/lib/proposals/classify'
import type { PageSection } from '#/lib/supabase/types'
import { PageContainer } from '#/components/page-container'
import { BackLink } from '#/components/back-link'
import { useToast } from '#/components/toast'
import { AtLimitPanel, DraftLimitPanel } from '#/components/billing/at-limit'
import { entitlementsQuery } from '#/lib/billing/entitlements'
import { OPEN_FOLDER_KEY, foldersQuery } from '#/lib/folders'
import { PDF_MAX_BYTES, PDF_MAX_MB, PDF_MIME, queryKeys } from '#/constants'

export const Route = createFileRoute('/_authed/proposals/new')({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(entitlementsQuery),
      context.queryClient.ensureQueryData(foldersQuery),
    ]),
  component: NewProposal,
})

type ReadPdf = {
  pageCount: number
  sections: Array<PageSection>
  textless: boolean
}

/**
 * Reads the page count and the text of each page from the chosen PDF, without
 * rendering it. The text is only used to guess what each page is; it is never
 * uploaded, so a proposal's contents stay in the file and out of the database.
 */
async function readPdf(file: File): Promise<ReadPdf> {
  // The pdfjs bundle is fetched on demand, so this request can fail long after
  // the page itself loaded: a deploy replaces the hashed chunk under an open
  // tab, or a dev server restarts beneath it. The browser's own words for that
  // — "Failed to fetch dynamically imported module: .../src/lib/pdf.ts" — were
  // reaching the form verbatim, which reads as a broken app rather than a page
  // that has gone stale.
  let pdfjs
  try {
    ;({ pdfjs } = await import('#/lib/pdf'))
  } catch (cause) {
    throw new Error(
      'Could not load the PDF reader \u2014 reload the page and try again.',
      { cause },
    )
  }

  const data = new Uint8Array(await file.arrayBuffer())

  // Anything thrown from here down is pdfjs failing to parse or, more often on
  // an old phone, failing to run at all. Its own message is minified and says
  // nothing a person can act on — "undefined is not a function (near '...')" —
  // so it gets a sentence that names the two things actually worth trying, with
  // the original kept as `cause` for the console.
  let doc
  let loadingTask
  try {
    loadingTask = pdfjs.getDocument({ data })
    doc = await loadingTask.promise
  } catch (cause) {
    throw new Error(
      `Could not read that PDF on this device. If you are on a phone, update it and try again, or upload from a computer. (${cause instanceof Error ? cause.message : String(cause)})`,
      { cause },
    )
  }
  const pageCount = doc.numPages

  // Everything below is the page tagger, and the page tagger is a convenience.
  // The upload needs `pageCount`, which is already in hand; the guessed tags
  // save the owner some dropdowns and nothing more. So a failure here degrades
  // to "we could not read the text" — the same path a scanned PDF takes — and
  // never stops someone sending a proposal.
  //
  // It has done exactly that once already. Reading the page count barely wakes
  // the pdfjs worker, while getTextContent drives its font and text machinery
  // hard, so the two fail on different devices. This step was added on
  // 2026-09-01 and took uploading with it on iOS, where every browser is WebKit
  // underneath and there is no second engine to fall back to.
  let pages: Array<PageText> = []
  let unreadable = false
  try {
    for (let n = 1; n <= pageCount; n++) {
      const page = await doc.getPage(n)
      const content = await page.getTextContent()
      // pdfjs hands back positioned runs, not lines. Joining with spaces loses
      // the layout, which the classifier does not use and cannot be misled by.
      const text = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
      pages.push({ pageNumber: n, text })
      page.cleanup()
    }
  } catch (cause) {
    // Logged rather than swallowed: this is the only place the real reason is
    // visible, and on the device where it happens there is no other way to see
    // it. The owner gets the untagged-pages toast, not an error.
    console.error('[upload] page text extraction failed', cause)
    pages = []
    unreadable = true
  }

  // Not awaited past a failure: destroy() on a transport that has already
  // errored can reject too, and by this point there is nothing left to save.
  await loadingTask.destroy().catch(() => {})

  if (unreadable) return { pageCount, sections: [], textless: true }

  const { sections, textless } = classifyPages(pages)
  return { pageCount, sections, textless }
}

/**
 * True on WebKit, which is Safari and every browser on iOS, because Apple
 * requires the engine there.
 *
 * `navigator.vendor` is the discriminator: verified against real engine builds,
 * WebKit reports "Apple Computer, Inc." and Chromium reports "Google Inc." on
 * desktop and Android alike, while Firefox reports an empty string. A
 * user-agent sniff would have to enumerate CriOS, FxiOS and EdgiOS to reach the
 * same answer and would still miss whatever ships next.
 *
 * Read in an effect rather than during render: `navigator` does not exist on
 * the server, and a notice that appears in the client tree but not the server's
 * is a hydration mismatch. It flashes in one frame after mount, which for a
 * line of advice is nobody's problem.
 */
function useIsWebkit(): boolean {
  const [webkit, setWebkit] = useState(false)
  useEffect(() => {
    setWebkit(/apple/i.test(navigator.vendor))
  }, [])
  return webkit
}

/**
 * Says the one true thing and stops.
 *
 * Not "use Chrome": on an iPhone there is no other engine to switch to, and
 * advice that cannot be followed reads as a product that does not understand
 * its own platform. Not a warning colour either — nothing is broken, the
 * proposal uploads and tracks exactly the same, and the only difference is
 * whether the section dropdowns arrive pre-filled.
 */
function SafariNotice() {
  return (
    <p className="mt-2 flex items-start gap-2 rounded-md bg-surface-2 px-3 py-2 text-[13px] leading-relaxed text-ink-2">
      <span className="mt-px shrink-0 font-mono text-[10px] tracking-wider text-ink-3 uppercase">
        Safari
      </span>
      <span>
        Pages may not be tagged automatically here. Everything else works the
        same &mdash; you can set each page&rsquo;s section after uploading.
      </span>
    </p>
  )
}

/**
 * Fire-and-forget funnel logging. Never awaited by a caller and never lets a
 * rejection surface: a step that fails to record is a gap in the data, not a
 * reason to slow down or interrupt someone uploading a proposal.
 */
function logStep(
  step: Parameters<typeof logOnboardingEvent>[0]['data']['step'],
  detail?: string,
) {
  void logOnboardingEvent({ data: { step, detail } }).catch(() => {})
}

function NewProposal() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const notify = useToast()
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Once per visit to the form, not once per render: this is "did someone
  // reach this page", the top of the funnel everything else here is measured
  // against.
  useEffect(() => {
    logStep('form_opened')
  }, [])
  // Which half of the submit is running. Reading a PDF's text happens on this
  // device, and on a phone it is the slow half — a long proposal can hold the
  // main thread for many seconds before a single byte is sent. Labelling all of
  // that "Uploading…" is both wrong and, on a slow connection, indistinguishable
  // from a button that did nothing.
  const [phase, setPhase] = useState<'reading' | 'uploading'>('reading')
  const isWebkit = useIsWebkit()
  const { data: entitlements } = useSuspenseQuery(entitlementsQuery)
  const { data: folders } = useSuspenseQuery(foldersQuery)
  const { user } = Route.useRouteContext()

  const form = useForm({
    defaultValues: {
      // Blank is no folder; otherwise a folder id.
      folderId: '',
      title: '',
      clientName: '',
      recipientName: '',
      dealValue: '',
      file: null as File | null,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null)
      setPhase('reading')
      try {
        const file = value.file!
        let read: Awaited<ReturnType<typeof readPdf>>
        try {
          read = await readPdf(file)
        } catch (err) {
          logStep(
            'pdf_read_failed',
            err instanceof Error ? err.message : String(err),
          )
          throw err
        }
        const { pageCount, sections, textless } = read
        setPhase('uploading')

        const data = new FormData()
        data.set('title', value.title)
        data.set('clientName', value.clientName)
        data.set('dealValue', value.dealValue)
        data.set('folderId', value.folderId)
        data.set('file', file)
        data.set('pageCount', String(pageCount))
        data.set('sections', JSON.stringify(sections))

        let id: string
        try {
          ;({ id } = await createProposal({ data }))
        } catch (err) {
          logStep(
            'submit_failed',
            err instanceof Error ? err.message : String(err),
          )
          throw err
        }
        logStep('proposal_created')

        // The link is cut here rather than inside createProposal, as a second
        // call, so the upload cannot fail because of the send cap. A proposal
        // saved as a draft that could not be shared is a good outcome: the PDF
        // is in, and the only thing missing is the thing the free plan actually
        // limits. Folding the two together would put the wall back in front of
        // the upload, which is exactly what the send_cap migration moved it off.
        //
        // Every upload comes back with a link, named for the person when they
        // typed one and for the client when they did not. Blank used to mean a
        // draft with no link, which left the send step a page away. That was
        // protecting the free cap, and the cap now counts proposals a client
        // has read, not links cut (cap_counts_opened), so a link costs nothing
        // until somebody opens it.
        const recipient = value.recipientName.trim() || value.clientName.trim()
        let link: { url: string } | null = null
        let capped = false
        try {
          link = await createShareLink({
            data: { proposalId: id, recipientName: recipient },
          })
        } catch (err) {
          // Any failure here leaves a usable draft, so it is reported as the
          // milder thing it is rather than as a failed upload.
          capped = true
          console.error('[upload] could not create the first link', err)
        }

        // Fired before the navigation, not after: the provider lives above the
        // router, so the toast rides across to the dashboard and lands next to
        // the row it is talking about.
        //
        // When nothing could be tagged, every page comes back Other, and an
        // owner who finds nine Others with no explanation concludes the tagging
        // is broken. So say the pages need tagging — and only that.
        //
        // It used to say "no readable text", which was a diagnosis rather than
        // a message: it reads as a complaint about the file, and it is not even
        // reliably true. A scanned PDF really has no text layer, but the same
        // branch is reached when extraction simply fails on the device, and
        // telling someone their perfectly ordinary proposal is unreadable is
        // both wrong and the first thing they see after uploading it.
        const client = value.clientName.trim()
        notify(
          capped
            ? `${client} proposal saved as a draft \u2014 no link yet`
            : textless
              ? `${client} proposal created \u2014 tag the pages yourself`
              : `${client} proposal created`,
          capped ? 'neutral' : textless ? 'neutral' : 'good',
        )

        await queryClient.invalidateQueries({
          queryKey: queryKeys.proposalSummaries,
        })
        await queryClient.invalidateQueries({
          queryKey: queryKeys.entitlements,
        })

        // Somewhere with the link on it, not the dashboard, whenever there is a
        // link. A proposal nobody has been sent is not finished, and the
        // dashboard is where you go when you are done rather than mid-task.
        await router.navigate(
          link
            ? { to: '/proposals/$id', params: { id }, search: { sent: true } }
            : { to: '/dashboard' },
        )
      } catch (err) {
        setSubmitError(
          err instanceof Error
            ? err.message
            : 'Something went wrong. Try again.',
        )
      }
    },
  })

  // Start in the folder that is open on the dashboard, so a proposal begun
  // from inside Photography is filed in Photography. Read after mount because
  // the choice lives in localStorage, which the server render cannot see, and
  // only when the owner has not already picked one. They can still change it.
  useEffect(() => {
    try {
      const open = window.localStorage.getItem(OPEN_FOLDER_KEY)
      if (
        open &&
        folders.some((f) => f.id === open) &&
        !form.getFieldValue('folderId')
      ) {
        form.setFieldValue('folderId', open)
      }
    } catch {
      // Storage blocked: the form starts with no folder, as before.
    }
  }, [folders, form])

  return (
    <PageContainer className="py-8 sm:py-9">
      <div className="max-w-xl">
        <BackLink />

        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">
          New proposal
        </h1>
        <p className="mt-1.5 text-[13px] text-ink-2">
          Upload a PDF. You&rsquo;ll get a tracked link to send to your client.
        </p>

        {/* The live cap does not block an upload any more. Preparing the next
            proposal while two are out with clients is normal, so this explains
            the wall they will meet at the send step and leaves the form alone.
            Only the draft ceiling, which is a storage guard, stops them here. */}
        {entitlements.canCreateProposal && !entitlements.canSendProposal && (
          <AtLimitPanel liveProposals={entitlements.liveProposals} />
        )}

        {!entitlements.canCreateProposal ? (
          <DraftLimitPanel draftProposals={entitlements.draftProposals} />
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
            className="mt-8 space-y-5"
          >
            {/* Only once there is a folder to choose. The hint says which name
                the client will see, since a folder can change it. */}
            {folders.length > 0 && (
              <form.Field name="folderId">
                {(field) => {
                  const chosen = folders.find((f) => f.id === field.state.value)
                  const sees =
                    chosen?.senderName ?? user.companyName ?? 'your main name'
                  return (
                    <Field
                      label="Folder"
                      hint={`Optional. Your client sees this proposal from ${sees}.`}
                      field={field}
                    >
                      <select
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        className="w-full cursor-pointer rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink transition-colors hover:border-ink-3 focus-visible:border-brand-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                      >
                        <option value="">No folder</option>
                        {folders.map((folder) => (
                          <option key={folder.id} value={folder.id}>
                            {folder.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )
                }}
              </form.Field>
            )}

            <form.Field
              name="title"
              validators={{
                onChange: ({ value }) =>
                  value.trim() ? undefined : 'Title is required',
              }}
            >
              {(field) => (
                <Field
                  label="Title"
                  hint="For your eyes — the client never sees it."
                  field={field}
                >
                  <input
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Brand identity — Q3"
                    className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink transition-colors placeholder:text-ink-3 hover:border-ink-3 focus-visible:border-brand-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                  />
                </Field>
              )}
            </form.Field>

            <form.Field
              name="clientName"
              validators={{
                onChange: ({ value }) =>
                  value.trim() ? undefined : 'Client name is required',
              }}
            >
              {(field) => (
                <Field label="Client name" field={field}>
                  <input
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Acme Studio"
                    className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink transition-colors placeholder:text-ink-3 hover:border-ink-3 focus-visible:border-brand-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                  />
                </Field>
              )}
            </form.Field>

            {/* Optional. Blank names the link for the client, so every upload
                still comes back with a link to send. */}
            <form.Field name="recipientName">
              {(field) => (
                <Field
                  label="Send to"
                  hint={
                    entitlements.canSendProposal
                      ? 'Optional. Leave it blank and the link is named for the client.'
                      : 'You are at your live proposal limit, so this saves as a draft for now.'
                  }
                  field={field}
                >
                  <input
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Jordan at Acme"
                    className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink transition-colors placeholder:text-ink-3 hover:border-ink-3 focus-visible:border-brand-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                  />
                </Field>
              )}
            </form.Field>

            <form.Field
              name="dealValue"
              validators={{
                onChange: ({ value }) =>
                  !value || Number(value) >= 0
                    ? undefined
                    : 'Deal value must be a positive number',
              }}
            >
              {(field) => (
                <Field
                  label="Deal value"
                  hint="Optional. Used to rank which proposals matter most."
                  field={field}
                >
                  <div className="flex items-center rounded-md border border-line bg-surface px-3 transition-colors focus-within:border-brand-2 hover:border-ink-3">
                    <span className="font-display text-sm text-ink-3">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="12000"
                      className="w-full bg-transparent px-2 py-2 text-sm tnum text-ink outline-none placeholder:text-ink-3"
                    />
                  </div>
                </Field>
              )}
            </form.Field>

            <form.Field
              name="file"
              validators={{
                onChange: ({ value }) =>
                  !value
                    ? 'Choose a PDF to upload'
                    : value.type !== PDF_MIME
                      ? 'File must be a PDF'
                      : value.size > PDF_MAX_BYTES
                        ? `PDF must be ${PDF_MAX_MB} MB or smaller`
                        : undefined,
              }}
            >
              {(field) => (
                <Field label="Proposal PDF" field={field}>
                  <input
                    type="file"
                    accept={PDF_MIME}
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null
                      field.handleChange(file)
                      if (file) logStep('file_selected')
                    }}
                    className="block w-full cursor-pointer rounded-md border border-dashed border-line bg-surface px-3 py-3 text-[13px] text-ink-2 transition-colors hover:border-ink-3 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
                  />
                  {isWebkit && <SafariNotice />}
                </Field>
              )}
            </form.Field>

            {submitError && (
              <p className="rounded-md border border-line bg-danger-soft px-3 py-2 text-[13px] text-danger">
                {submitError}
              </p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <form.Subscribe
                selector={(s) => [s.canSubmit, s.isSubmitting] as const}
              >
                {([canSubmit, isSubmitting]) => (
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    /* min-h-11 is Apple's 44px, and it only applies on the
                       narrow layout: at sm and up this keeps the 36px the rest
                       of the app's buttons are. */
                    className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 sm:min-h-9"
                  >
                    {isSubmitting
                      ? phase === 'reading'
                        ? 'Reading PDF…'
                        : 'Uploading…'
                      : 'Create proposal'}
                  </button>
                )}
              </form.Subscribe>
              <button
                type="button"
                onClick={() => router.navigate({ to: '/dashboard' })}
                className="inline-flex min-h-11 items-center px-1 text-[13px] text-ink-2 transition-colors hover:text-ink sm:min-h-9 sm:px-0"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </PageContainer>
  )
}

function Field({
  label,
  hint,
  field,
  children,
}: {
  label: string
  hint?: string
  field: { state: { meta: { isTouched: boolean; errors: Array<unknown> } } }
  children: React.ReactNode
}) {
  const { isTouched, errors } = field.state.meta
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      {hint && <span className="ml-2 text-xs text-ink-3">{hint}</span>}
      <div className="mt-1.5">{children}</div>
      {isTouched && errors.length > 0 && (
        <p className="mt-1 text-xs text-danger">
          {errors.filter(Boolean).join(', ')}
        </p>
      )}
    </label>
  )
}
