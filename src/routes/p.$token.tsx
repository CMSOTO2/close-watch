import { createFileRoute, notFound } from '@tanstack/react-router'
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
  const { pdfUrl, visitId, title, senderName } = Route.useLoaderData()
  const { token } = Route.useParams()

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line bg-surface">
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
      <PdfViewer
        pdfUrl={pdfUrl}
        visitId={visitId}
        token={token}
        title={title}
      />
    </div>
  )
}
