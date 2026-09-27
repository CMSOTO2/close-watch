import { notFound, redirect } from '@tanstack/react-router'
import { beginVisit } from '#/lib/analytics/begin-visit'
import type { VisitContext } from '#/lib/analytics/begin-visit'

// The loader and head for both share-link routes, apart from share-viewer.tsx
// so that importing them does not put the viewer and the PDF renderer in the
// entry chunk every page downloads. See landing-meta.ts for the rule.

/**
 * Loads a share link for either route. A link at the wrong address, which
 * means an old unnamed one, a sender who has since been renamed, or a name
 * someone typed in, is sent to the right one before anything is recorded.
 */
export async function loadShare(
  token: string,
  slug: string | undefined,
): Promise<VisitContext> {
  const result = await beginVisit({ data: { token, slug } })
  if (!result) throw notFound()
  if (result.kind === 'redirect') {
    throw result.slug
      ? redirect({
          to: '/p/$slug/$token',
          params: { slug: result.slug, token },
          replace: true,
        })
      : redirect({ to: '/p/$token', params: { token }, replace: true })
  }
  return result.visit
}

export function shareHead(title: string | undefined) {
  return {
    meta: [
      { title: title ?? 'Proposal' },
      // Keep share links out of search results.
      { name: 'robots', content: 'noindex, nofollow' },
      // Never put the secret token in a Referer header sent to another origin.
      { name: 'referrer', content: 'no-referrer' },
    ],
  }
}
