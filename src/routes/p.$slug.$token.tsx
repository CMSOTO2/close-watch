import { createFileRoute } from '@tanstack/react-router'
import {
  ShareLinkGone,
  ShareViewer,
  loadShare,
  shareHead,
} from '#/components/share-viewer'

/**
 * A share link with the sender's name in it: /p/25-dials/{token}. The name is
 * for the client, so they can tell who a link is from before opening it; the
 * token is what opens it. A name that is not the sender's is redirected to
 * the one that is, in loadShare.
 */
export const Route = createFileRoute('/p/$slug/$token')({
  loader: ({ params }) => loadShare(params.token, params.slug),
  head: ({ loaderData }) => shareHead(loaderData?.title),
  component: ViewerPage,
  notFoundComponent: ShareLinkGone,
})

function ViewerPage() {
  const visit = Route.useLoaderData()
  const { token } = Route.useParams()
  return <ShareViewer visit={visit} token={token} />
}
