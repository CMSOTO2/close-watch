import { createFileRoute, notFound } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { Eye } from 'lucide-react'
import { PdfViewer } from '#/components/pdf-viewer'
import { PageContainer } from '#/components/page-container'
import { beginVisit } from '#/lib/analytics/begin-visit'

export const Route = createFileRoute('/p/$token')({
  loader: async ({ params }) => {
    const visit = await beginVisit({ data: { token: params.token } })
    if (!visit) throw notFound()
    return visit
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.title ?? 'Proposal' },
      // Keep share links out of search results.
      { name: 'robots', content: 'noindex, nofollow' },
      // Never put the secret token in a Referer header sent to another origin.
      { name: 'referrer', content: 'no-referrer' },
    ],
  }),
  component: ViewerPage,
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center bg-canvas px-6 text-center">
      <div>
        <h1 className="font-display text-lg font-semibold tracking-tight">
          This link is no longer available
        </h1>
        <p className="mt-2 text-[13px] text-ink-2">
          It may have expired or been revoked. Ask the sender for a new one.
        </p>
      </div>
    </div>
  ),
})

function ViewerPage() {
  const { pdfUrl, visitId, title, senderName, ownerPreview } =
    Route.useLoaderData()
  const { token } = Route.useParams()
  const pageRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)

  // The download/print toolbar inside PdfViewer is sticky too, and it has to
  // come to rest *below* this header rather than behind it. It used to stick at
  // 12px, inside this header's 45px band, so scrolling buried it: the header is
  // opaque and outranks it, and elementFromPoint on the buttons returned the
  // header. They were not just hidden, they were unclickable, which took
  // download and print tracking with them.
  //
  // Measured rather than hard-coded because this height is padding plus a line
  // box in a web font that loads after first paint, so a constant would be
  // right locally and wrong for the first moments of every real read. The
  // observer also covers a title long enough to wrap on a narrow phone.
  useEffect(() => {
    const header = headerRef.current
    const page = pageRef.current
    if (!header || !page) return

    const publish = () =>
      page.style.setProperty(
        '--viewer-header',
        `${Math.round(header.getBoundingClientRect().height)}px`,
      )

    publish()
    // border-box, not the default content box. What gets measured above is
    // getBoundingClientRect, which includes the padding and the border, so an
    // observer watching the content box would sit silent through exactly the
    // changes that move the number it is meant to keep honest.
    const observer = new ResizeObserver(publish)
    observer.observe(header, { box: 'border-box' })
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={pageRef} className="min-h-screen bg-canvas">
      <header
        ref={headerRef}
        className="sticky top-0 z-20 border-b border-line bg-surface"
      >
        <PageContainer className="flex items-baseline justify-between gap-3 py-3">
          <span className="min-w-0 truncate font-display text-sm font-semibold tracking-tight">
            {title}
          </span>
          {senderName && (
            <span className="shrink-0 text-xs text-ink-2">
              from {senderName}
            </span>
          )}
        </PageContainer>
      </header>

      {/* Only the sender, signed in and looking at their own link, sees a line
          here. Said so, or they reasonably wonder whether they just spent a
          free slot. Clients see the document and nothing above it: the notice
          that told them it was tracked was removed on 2026-09-13, and whether
          to tell a client is the sender's call, as /privacy and /terms say. */}
      {ownerPreview && (
        <div className="border-b border-line-soft bg-surface-2">
          <PageContainer className="flex items-start gap-1.5 py-2 text-xs leading-relaxed text-ink-3">
            <Eye aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            <p>
              This is your preview. You are signed in as the sender, so this
              read shows up as yours and never counts as a client opening it.
            </p>
          </PageContainer>
        </div>
      )}

      <PdfViewer
        pdfUrl={pdfUrl}
        visitId={visitId}
        token={token}
        title={title}
      />
    </div>
  )
}
