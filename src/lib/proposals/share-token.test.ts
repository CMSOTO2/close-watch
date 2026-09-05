import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { isShareToken } from '#/constants'

/**
 * The shape check exists so a malformed token reaches the reader as a dead
 * link rather than a 500. Production served the error page for every one of
 * the rejected cases below before this guard existed.
 */
describe('isShareToken', () => {
  it('accepts a token of the shape newToken() issues', () => {
    // Mirrors src/lib/proposals/mutations.ts: 18 bytes -> 24 base64url chars.
    for (let i = 0; i < 200; i++) {
      expect(isShareToken(randomBytes(18).toString('base64url'))).toBe(true)
    }
  })

  it('rejects the ways a real link gets mangled', () => {
    expect(isShareToken('')).toBe(false)
    expect(isShareToken('x')).toBe(false)
    expect(isShareToken('short')).toBe(false)
    // A mail client that ate the last characters of a 24-char token.
    expect(isShareToken('abc')).toBe(false)
    // A space that survived as %20 and came back decoded.
    expect(isShareToken('tok en12')).toBe(false)
    expect(isShareToken('a'.repeat(200))).toBe(false)
    expect(isShareToken('token+with/base64')).toBe(false)
    expect(isShareToken('../../../etc/passwd')).toBe(false)
  })

  it('accepts an unknown token of the right shape, which is a 404 not an error', () => {
    // The database decides this one, not the regex.
    expect(isShareToken('definitelynotarealtoken123')).toBe(true)
  })
})
