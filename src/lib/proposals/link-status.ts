import type { ShareLink } from './detail'

export type LinkStatus = 'live' | 'revoked' | 'expired'

/**
 * Revoked wins over expired when a link is both: revoking is something the
 * owner did, and that is the more useful thing to be told.
 */
export function linkStatus(link: ShareLink, now = Date.now()): LinkStatus {
  if (link.revokedAt !== null) return 'revoked'
  if (link.expiresAt !== null && new Date(link.expiresAt).getTime() <= now) {
    return 'expired'
  }
  return 'live'
}

/** A link with its status already worked out, so no caller re-derives it. */
export type ClassifiedLink = { link: ShareLink; status: LinkStatus }

export type PartitionedLinks = {
  live: Array<ClassifiedLink>
  dead: Array<ClassifiedLink>
  revoked: number
  expired: number
}

/**
 * Splits the links into the ones that still open and the ones that do not.
 *
 * Order is preserved within each half, so the live links keep whatever order
 * the query returned rather than being resorted behind the owner's back.
 */
export function partitionLinks(
  links: Array<ShareLink>,
  now = Date.now(),
): PartitionedLinks {
  const result: PartitionedLinks = { live: [], dead: [], revoked: 0, expired: 0 }
  for (const link of links) {
    const status = linkStatus(link, now)
    if (status === 'live') {
      result.live.push({ link, status })
      continue
    }
    result.dead.push({ link, status })
    if (status === 'revoked') result.revoked++
    else result.expired++
  }
  return result
}

/**
 * Names exactly what the toggle is holding back. A single reason is said
 * plainly; a mix falls back to "inactive", because "2 revoked · 1 expired" on
 * a button is a summary the eye has to parse rather than read.
 */
export function deadLinkLabel({
  revoked,
  expired,
}: {
  revoked: number
  expired: number
}): string {
  const total = revoked + expired
  const noun = total === 1 ? 'link' : 'links'
  if (expired === 0) return `${total} revoked ${noun}`
  if (revoked === 0) return `${total} expired ${noun}`
  return `${total} inactive ${noun}`
}
