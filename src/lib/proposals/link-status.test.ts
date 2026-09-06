import { describe, expect, it } from 'vitest'
import { deadLinkLabel, linkStatus, partitionLinks } from './link-status'
import type { ShareLink } from './detail'

const NOW = new Date('2026-08-31T12:00:00.000Z').getTime()

function link(over: Partial<ShareLink> = {}): ShareLink {
  return {
    id: 'a',
    token: 't',
    url: 'http://localhost/p/t',
    recipientName: null,
    recipientEmail: null,
    expiresAt: null,
    revokedAt: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    ...over,
  }
}

describe('linkStatus', () => {
  it('treats a link with no expiry as live', () => {
    expect(linkStatus(link(), NOW)).toBe('live')
  })

  it('is live right up to the expiry and expired on it', () => {
    const expiresAt = '2026-08-31T12:00:00.000Z'
    expect(linkStatus(link({ expiresAt }), NOW - 1)).toBe('live')
    expect(linkStatus(link({ expiresAt }), NOW)).toBe('expired')
  })

  it('reports revoked even when the link also expired', () => {
    const both = link({
      revokedAt: '2026-08-02T00:00:00.000Z',
      expiresAt: '2026-08-03T00:00:00.000Z',
    })
    expect(linkStatus(both, NOW)).toBe('revoked')
  })
})

describe('partitionLinks', () => {
  it('splits live from dead and counts each reason once', () => {
    const result = partitionLinks(
      [
        link({ id: 'live' }),
        link({ id: 'revoked', revokedAt: '2026-08-02T00:00:00.000Z' }),
        link({ id: 'expired', expiresAt: '2026-08-04T00:00:00.000Z' }),
        link({
          id: 'both',
          revokedAt: '2026-08-02T00:00:00.000Z',
          expiresAt: '2026-08-04T00:00:00.000Z',
        }),
      ],
      NOW,
    )

    expect(result.live.map((e) => e.link.id)).toEqual(['live'])
    expect(result.dead.map((e) => e.link.id)).toEqual([
      'revoked',
      'expired',
      'both',
    ])
    // 'both' counts as revoked only — the totals have to add up to dead.length
    // or the toggle's label would over-report.
    expect(result.revoked).toBe(2)
    expect(result.expired).toBe(1)
    expect(result.revoked + result.expired).toBe(result.dead.length)
  })

  it('keeps the order the query returned', () => {
    const result = partitionLinks(
      [link({ id: 'b' }), link({ id: 'a' }), link({ id: 'c' })],
      NOW,
    )
    expect(result.live.map((e) => e.link.id)).toEqual(['b', 'a', 'c'])
  })
})

describe('deadLinkLabel', () => {
  it('says the one reason when there is only one', () => {
    expect(deadLinkLabel({ revoked: 1, expired: 0 })).toBe('1 revoked link')
    expect(deadLinkLabel({ revoked: 3, expired: 0 })).toBe('3 revoked links')
    expect(deadLinkLabel({ revoked: 0, expired: 2 })).toBe('2 expired links')
  })

  it('falls back to a neutral word for a mix', () => {
    expect(deadLinkLabel({ revoked: 2, expired: 1 })).toBe('3 inactive links')
  })
})
