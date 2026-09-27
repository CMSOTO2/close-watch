import { createFileRoute } from '@tanstack/react-router'
import { ShareLinkGone, ShareViewer } from '#/components/share-viewer'
import { loadShare, shareHead } from '#/components/share-route'

/**
 * A share link without the sender's name in it. Every link sent before names
 * went into links has this shape, and loadShare sends it on to the named form.
 * It stays the final address only for a sender whose name has no slug.
 */
export const Route = createFileRoute('/p/$token')({
  loader: ({ params }) => loadShare(params.token, undefined),
  head: ({ loaderData }) => shareHead(loaderData?.title),
  component: ViewerPage,
  notFoundComponent: ShareLinkGone,
})

function ViewerPage() {
  const visit = Route.useLoaderData()
  const { token } = Route.useParams()
  return <ShareViewer visit={visit} token={token} />
}
