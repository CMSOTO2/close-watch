import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { isProposalId } from '#/constants'

/**
 * The sibling of the isShareToken guard, for the other identifier that arrives
 * straight from a URL. Both server functions behind /proposals/$id validate
 * z.uuid(), so before this check every case below threw out of the loader and
 * rendered the generic error page for what is plainly a missing proposal.
 */
describe('isProposalId', () => {
  it('accepts the uuids the database issues', () => {
    for (let i = 0; i < 200; i++) {
      expect(isProposalId(randomUUID())).toBe(true)
    }
  })

  it('rejects what actually turns up in that slot', () => {
    expect(isProposalId('')).toBe(false)
    // Someone guessing a route name rather than following a link.
    expect(isProposalId('pricing')).toBe(false)
    expect(isProposalId('new')).toBe(false)
    // A uuid that lost its tail to a mail client.
    expect(isProposalId('7d4f0c62-0f8f-4c31-9a2e')).toBe(false)
    // Right shape, wrong alphabet.
    expect(isProposalId('zzzzzzzz-0f8f-4c31-9a2e-2b6f3a9c1d55')).toBe(false)
    expect(isProposalId('../../../etc/passwd')).toBe(false)
    expect(isProposalId('a'.repeat(200))).toBe(false)
    // Braced and urn forms are not what the column holds.
    expect(isProposalId('{7d4f0c62-0f8f-4c31-9a2e-2b6f3a9c1d55}')).toBe(false)
  })

  it('accepts an unknown uuid, which is a 404 not an error', () => {
    // The database decides this one, not the regex.
    expect(isProposalId('00000000-0000-4000-8000-000000000000')).toBe(true)
  })
})
