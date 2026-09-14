import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useForm } from '@tanstack/react-form-start'
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  FileUp,
  Loader2,
} from 'lucide-react'
import { createProposal } from '#/lib/proposals/create'
import { createShareLink } from '#/lib/proposals/mutations'
import { logOnboardingEvent } from '#/lib/onboarding/log-event'
import { classifyPages } from '#/lib/proposals/classify'
import type { PageText } from '#/lib/proposals/classify'
import type { PageSection } from '#/lib/supabase/types'
import { PageContainer } from '#/components/page-container'
import { BackLink } from '#/components/back-link'
import { useToast } from '#/components/toast'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import { formatDealValue } from '#/lib/deal-value'
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

/** Where the chosen PDF has got to, for the drop zone. */
type FileRead =
  | { status: 'reading'; file: File }
  | { status: 'ready'; file: File; result: ReadPdf }
  | { status: 'failed'; file: File; message: string }

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

  // The PDF is read as soon as it is chosen, not on submit, so the drop zone
  // can confirm it (name, size, page count) and a file this device cannot read
  // says so while the owner is still looking at it. Submit reuses the same
  // read, finished or still running, rather than doing it twice.
  const [fileRead, setFileRead] = useState<FileRead | null>(null)
  const readRef = useRef<{ file: File; promise: Promise<ReadPdf> } | null>(null)

  function startReading(file: File) {
    const promise = readPdf(file)
    readRef.current = { file, promise }
    setFileRead({ status: 'reading', file })
    promise.then(
      (result) => {
        if (readRef.current?.file === file)
          setFileRead({ status: 'ready', file, result })
      },
      (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        logStep('pdf_read_failed', message)
        if (readRef.current?.file === file)
          setFileRead({ status: 'failed', file, message })
      },
    )
  }
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
        // Normally already read, or still being read, since it was chosen.
        const cached =
          readRef.current?.file === file ? readRef.current.promise : null
        let read: ReadPdf
        try {
          read = await (cached ?? readPdf(file))
        } catch (err) {
          // A read that failed when the file was chosen was logged then.
          if (!cached)
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
        // Shown as "12,000" while typing; the server parses a plain number.
        data.set('dealValue', value.dealValue.replace(/,/g, ''))
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

  const canSend = entitlements.canSendProposal

  return (
    <PageContainer className="py-8 sm:py-10">
      {/* A centred column rather than one pinned to the shell's left edge,
          which on a wide screen left the form in a corner and the rest of the
          window empty. */}
      <div className="mx-auto max-w-2xl">
        <BackLink />

        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">
          New proposal
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
          Upload the PDF you already send. You get a tracked link to paste into
          your own email.
        </p>

        {/* The live cap does not block an upload any more. Preparing the next
            proposal while two are out with clients is normal, so this explains
            the wall they will meet at the send step and leaves the form alone.
            Only the draft ceiling, which is a storage guard, stops them here. */}
        {entitlements.canCreateProposal && !canSend && (
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
            className="mt-6 overflow-hidden rounded-xl border border-line bg-surface shadow-sm"
          >
            {/* The file first: it is the one thing this page cannot do
                without, and the only field that needs a confirmation. */}
            <section className="px-5 py-5 sm:px-6 sm:py-6">
              <h2 className="text-sm font-medium text-ink">Proposal PDF</h2>
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
                  <PdfDropzone
                    file={field.state.value}
                    read={
                      fileRead && fileRead.file === field.state.value
                        ? fileRead
                        : null
                    }
                    error={
                      field.state.meta.isTouched &&
                      field.state.meta.errors.length > 0
                        ? field.state.meta.errors.filter(Boolean).join(', ')
                        : null
                    }
                    onFile={(file) => {
                      field.handleChange(file)
                      logStep('file_selected')
                      // Only a file that passes the checks is worth reading.
                      if (file.type === PDF_MIME && file.size <= PDF_MAX_BYTES)
                        startReading(file)
                    }}
                  />
                )}
              </form.Field>
              {isWebkit && <SafariNotice />}
            </section>

            <section className="border-t border-line px-5 py-5 sm:px-6 sm:py-6">
              <h2 className="text-sm font-medium text-ink">Details</h2>
              <div className="mt-4 grid gap-x-4 gap-y-5 sm:grid-cols-2">
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
                        className={INPUT}
                      />
                    </Field>
                  )}
                </form.Field>

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
                      hint="For your eyes only. The client never sees it."
                      field={field}
                    >
                      <input
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Brand identity, Q3"
                        className={INPUT}
                      />
                    </Field>
                  )}
                </form.Field>

                {/* Optional. Blank names the link for the client, so every
                    upload still comes back with a link to send. */}
                <form.Field name="recipientName">
                  {(field) => (
                    <Field
                      label="Send to"
                      hint={
                        canSend
                          ? 'Optional. Left blank, the link is named for the client.'
                          : 'You are at your live limit, so this saves as a draft for now.'
                      }
                      field={field}
                    >
                      <input
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Jordan at Acme"
                        className={INPUT}
                      />
                    </Field>
                  )}
                </form.Field>

                <form.Field
                  name="dealValue"
                  validators={{
                    onChange: ({ value }) =>
                      !value || Number(value.replace(/,/g, '')) >= 0
                        ? undefined
                        : 'Deal value must be a positive number',
                  }}
                >
                  {(field) => (
                    <Field
                      label="Deal value"
                      hint="Optional. Ranks which proposals matter most."
                      field={field}
                    >
                      <div className="flex items-center rounded-md border border-line-strong bg-surface px-3 transition-colors focus-within:border-brand-2 hover:border-ink-3">
                        <span className="text-sm text-ink-3">$</span>
                        {/* Text with a decimal keypad rather than type=number,
                            which cannot show "12,000". The commas are added as
                            they type and stripped again on submit. */}
                        <input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) =>
                            field.handleChange(formatDealValueInput(e.target))
                          }
                          placeholder="12,000"
                          className="w-full bg-transparent px-2 py-2 text-sm tnum text-ink outline-none placeholder:text-ink-3"
                        />
                      </div>
                    </Field>
                  )}
                </form.Field>

                {/* Only once there is a folder to choose. The hint says which
                    name the client will see, since a folder can change it. */}
                {folders.length > 0 && (
                  <form.Field name="folderId">
                    {(field) => {
                      const chosen = folders.find(
                        (f) => f.id === field.state.value,
                      )
                      const sees =
                        chosen?.senderName ??
                        user.companyName ??
                        'your main name'
                      return (
                        <Field
                          label="Folder"
                          hint={`Optional. Your client sees this proposal from ${sees}.`}
                          field={field}
                          className="sm:col-span-2"
                        >
                          <select
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            className={cn(INPUT, 'cursor-pointer')}
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
              </div>
            </section>

            {submitError && (
              <div className="border-t border-line px-5 py-4 sm:px-6">
                <p className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2 text-[13px] leading-relaxed text-danger">
                  <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
                  {submitError}
                </p>
              </div>
            )}

            {/* What happens on Create, said where the button is. */}
            <div className="flex flex-col gap-3 border-t border-line bg-surface-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-[13px] leading-relaxed text-ink-2">
                {canSend
                  ? 'Next, you get the link to send, straight away.'
                  : 'At your live limit, so this saves as a draft.'}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.navigate({ to: '/dashboard' })}
                  className="min-h-11 sm:min-h-9"
                >
                  Cancel
                </Button>
                <form.Subscribe
                  selector={(s) => [s.canSubmit, s.isSubmitting] as const}
                >
                  {([canSubmit, isSubmitting]) => (
                    <Button
                      type="submit"
                      disabled={!canSubmit || isSubmitting}
                      /* min-h-11 is Apple's 44px, and it only applies on the
                         narrow layout: at sm and up this keeps the 36px the
                         rest of the app's buttons are. */
                      className="min-h-11 flex-1 sm:min-h-9 sm:flex-none"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 aria-hidden className="animate-spin" />
                          {phase === 'reading' ? 'Reading PDF…' : 'Uploading…'}
                        </>
                      ) : (
                        'Create proposal'
                      )}
                    </Button>
                  )}
                </form.Subscribe>
              </div>
            </div>
          </form>
        )}
      </div>
    </PageContainer>
  )
}

const INPUT =
  'w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink transition-colors placeholder:text-ink-3 hover:border-ink-3 focus-visible:border-brand-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring'

/**
 * Formats the input's value (see formatDealValue) and puts the caret back where the person was
 * typing. Adding a comma shifts everything after it, so without this the caret
 * jumps to the end whenever they edit the middle of a number.
 */
function formatDealValueInput(input: HTMLInputElement): string {
  const caret = input.selectionStart ?? input.value.length
  const kept = input.value.slice(0, caret).replace(/[^\d.]/g, '').length
  const next = formatDealValue(input.value)
  requestAnimationFrame(() => {
    let seen = 0
    let pos = 0
    while (pos < next.length && seen < kept) {
      if (/[\d.]/.test(next[pos])) seen++
      pos++
    }
    input.setSelectionRange(pos, pos)
  })
  return next
}

/** The file input's id, shared by the drop zone and its Replace button. */
const PDF_INPUT_ID = 'proposal-pdf'

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/**
 * The PDF picker: a drop zone until a file is chosen, then a card that says
 * what happened to it.
 *
 * The old picker was the browser's own file input, which on most platforms
 * shows a filename in small grey text and nothing else, so there was no way
 * to tell a file had been taken until the upload finished or failed. Now the
 * card says the name, the size, the page count and "Ready", or why not.
 *
 * The real input stays in the DOM, visually hidden, so the browser's picker,
 * keyboard focus and the e2e suite's setInputFiles all work as before.
 */
function PdfDropzone({
  file,
  read,
  error,
  onFile,
}: {
  file: File | null
  /** The read of this exact file, if one has been started. */
  read: FileRead | null
  /** A validation message: missing, not a PDF, or too large. */
  error: string | null
  onFile: (file: File) => void
}) {
  const [dragging, setDragging] = useState(false)

  const drop = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(true)
    },
    onDragLeave: () => setDragging(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const dropped = e.dataTransfer.files[0] as File | undefined
      if (dropped) onFile(dropped)
    },
  }

  const focusRing =
    'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring'

  return (
    <div className="mt-3" {...drop}>
      <input
        id={PDF_INPUT_ID}
        type="file"
        accept={PDF_MIME}
        className="peer sr-only"
        onChange={(e) => {
          const chosen = e.target.files?.[0]
          if (chosen) onFile(chosen)
          // Cleared so choosing the same file again still counts as a change.
          e.target.value = ''
        }}
      />

      {file ? (
        <FileCard
          file={file}
          read={read}
          error={error}
          dragging={dragging}
          focusRing={focusRing}
        />
      ) : (
        <>
          <label
            htmlFor={PDF_INPUT_ID}
            className={cn(
              'flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors',
              focusRing,
              dragging
                ? 'border-brand-2 bg-brand-soft'
                : 'border-line-strong hover:border-ink-3 hover:bg-surface-2',
            )}
          >
            <span className="grid size-11 place-items-center rounded-full border border-line bg-surface text-ink-2 shadow-sm">
              <FileUp aria-hidden className="size-5" />
            </span>
            <span className="mt-2 text-sm font-medium text-ink">
              Drop your proposal PDF here
            </span>
            <span className="text-[13px] text-ink-2">
              or{' '}
              <span className="font-medium text-brand underline underline-offset-2">
                choose a file
              </span>
            </span>
            <span className="text-xs text-ink-3">
              PDF, up to {PDF_MAX_MB} MB
            </span>
          </label>
          {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
        </>
      )}
    </div>
  )
}

function FileCard({
  file,
  read,
  error,
  dragging,
  focusRing,
}: {
  file: File
  read: FileRead | null
  error: string | null
  dragging: boolean
  focusRing: string
}) {
  // A validation error outranks the read: a 40 MB file is never read at all.
  const state: 'invalid' | 'failed' | 'ready' | 'reading' = error
    ? 'invalid'
    : read?.status === 'failed'
      ? 'failed'
      : read?.status === 'ready'
        ? 'ready'
        : 'reading'
  const bad = state === 'invalid' || state === 'failed'

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors',
        focusRing,
        dragging
          ? 'border-brand-2 bg-brand-soft'
          : bad
            ? 'border-line bg-danger-soft'
            : state === 'ready'
              ? 'border-good-line bg-good-soft'
              : 'border-line bg-surface-2',
      )}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-md border border-line bg-surface">
        {state === 'reading' ? (
          <Loader2 aria-hidden className="size-4 animate-spin text-ink-3" />
        ) : bad ? (
          <AlertCircle aria-hidden className="size-4 text-danger" />
        ) : (
          <FileText aria-hidden className="size-4 text-good" />
        )}
      </span>

      <span className="min-w-0 flex-1" aria-live="polite">
        <span className="block truncate text-sm font-medium text-ink">
          {file.name}
        </span>
        <span
          className={cn(
            'mt-0.5 flex items-start gap-1 text-[13px] leading-snug',
            bad ? 'text-danger' : 'text-ink-2',
          )}
        >
          {state === 'ready' && read?.status === 'ready' && (
            <>
              <CheckCircle2
                aria-hidden
                className="mt-0.5 size-3.5 shrink-0 text-good"
              />
              Ready · {formatBytes(file.size)} · {read.result.pageCount}{' '}
              {read.result.pageCount === 1 ? 'page' : 'pages'}
            </>
          )}
          {state === 'reading' && <>Reading PDF… · {formatBytes(file.size)}</>}
          {state === 'failed' && read?.status === 'failed' && read.message}
          {state === 'invalid' && error}
        </span>
      </span>

      <label
        htmlFor={PDF_INPUT_ID}
        className="shrink-0 cursor-pointer rounded-md px-2 py-1 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface hover:text-ink"
      >
        Replace
      </label>
    </div>
  )
}

function Field({
  label,
  hint,
  field,
  className,
  children,
}: {
  label: string
  hint?: string
  field: { state: { meta: { isTouched: boolean; errors: Array<unknown> } } }
  className?: string
  children: React.ReactNode
}) {
  const { isTouched, errors } = field.state.meta
  const problem = isTouched ? errors.filter(Boolean).join(', ') : ''
  // The hint sits under the field rather than beside the label, where a long
  // one wrapped into the field below it. An error takes its place.
  return (
    <label className={cn('block', className)}>
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="mt-1.5">{children}</div>
      {problem ? (
        <span className="mt-1.5 block text-xs text-danger">{problem}</span>
      ) : (
        hint && (
          <span className="mt-1.5 block text-xs leading-relaxed text-ink-3">
            {hint}
          </span>
        )
      )}
    </label>
  )
}
