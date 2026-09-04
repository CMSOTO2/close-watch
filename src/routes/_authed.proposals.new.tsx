import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from '@tanstack/react-form-start'
import { createProposal } from '#/lib/proposals/create'
import { classifyPages } from '#/lib/proposals/classify'
import type { PageText } from '#/lib/proposals/classify'
import type { PageSection } from '#/lib/supabase/types'
import { PageContainer } from '#/components/page-container'
import { BackLink } from '#/components/back-link'
import { useToast } from '#/components/toast'
import { AtLimitPanel, DraftLimitPanel } from '#/components/billing/at-limit'
import { entitlementsQuery } from '#/lib/billing/entitlements'
import { PDF_MAX_BYTES, PDF_MAX_MB, PDF_MIME, queryKeys } from '#/constants'

export const Route = createFileRoute('/_authed/proposals/new')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(entitlementsQuery),
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

function NewProposal() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const notify = useToast()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { data: entitlements } = useSuspenseQuery(entitlementsQuery)

  const form = useForm({
    defaultValues: {
      title: '',
      clientName: '',
      dealValue: '',
      file: null as File | null,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null)
      try {
        const file = value.file!
        const { pageCount, sections, textless } = await readPdf(file)

        const data = new FormData()
        data.set('title', value.title)
        data.set('clientName', value.clientName)
        data.set('dealValue', value.dealValue)
        data.set('file', file)
        data.set('pageCount', String(pageCount))
        data.set('sections', JSON.stringify(sections))

        await createProposal({ data })

        // Fired before the navigation, not after: the provider lives above the
        // router, so the toast rides across to the dashboard and lands next to
        // the row it is talking about.
        //
        // A scanned PDF has no text to read, so every page comes back Other.
        // Say so here rather than letting the owner find nine Others and
        // conclude the tagging is broken.
        notify(
          textless
            ? `${value.clientName.trim()} proposal created \u2014 no readable text, so tag the pages yourself`
            : `${value.clientName.trim()} proposal created`,
          textless ? 'neutral' : 'good',
        )

        await queryClient.invalidateQueries({
          queryKey: queryKeys.proposalSummaries,
        })
        await router.navigate({ to: '/dashboard' })
      } catch (err) {
        setSubmitError(
          err instanceof Error
            ? err.message
            : 'Something went wrong. Try again.',
        )
      }
    },
  })

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
                    className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink transition-colors placeholder:text-ink-3 hover:border-ink-3 focus-visible:border-brand-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
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
                    className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink transition-colors placeholder:text-ink-3 hover:border-ink-3 focus-visible:border-brand-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
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
                    onChange={(e) =>
                      field.handleChange(e.target.files?.[0] ?? null)
                    }
                    className="block w-full cursor-pointer rounded-md border border-dashed border-line bg-surface px-3 py-3 text-[13px] text-ink-2 transition-colors hover:border-ink-3 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
                  />
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
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
                  >
                    {isSubmitting ? 'Uploading…' : 'Create proposal'}
                  </button>
                )}
              </form.Subscribe>
              <button
                type="button"
                onClick={() => router.navigate({ to: '/dashboard' })}
                className="text-[13px] text-ink-2 transition-colors hover:text-ink"
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
