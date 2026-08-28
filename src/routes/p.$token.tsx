import { createFileRoute, notFound } from '@tanstack/react-router'
import { PdfViewer } from '#/components/pdf-viewer'
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
    ],
  }),
  component: ViewerPage,
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <h1 className="text-lg font-medium">This link is no longer available</h1>
        <p className="mt-2 text-sm text-neutral-500">
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
    <div className="min-h-screen bg-neutral-100">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-baseline justify-between px-4 py-3">
          <span className="text-sm font-medium">{title}</span>
          {senderName && <span className="text-xs text-neutral-500">from {senderName}</span>}
        </div>
      </header>
      <PdfViewer pdfUrl={pdfUrl} visitId={visitId} token={token} />
    </div>
  )
}
