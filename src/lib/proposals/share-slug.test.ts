import { describe, expect, it } from 'vitest'
import { senderName, senderSlug, sharePath } from '#/constants'

/**
 * The sender's name goes into every share link, so a client can tell who a
 * link is from before opening it. The viewer compares the name in the URL
 * with this function's answer and redirects on any difference, so it has to
 * be stable for a given name and only ever produce URL-safe segments.
 */
describe('senderSlug', () => {
  it('turns a company name into a readable segment', () => {
    expect(senderSlug('25 Dials')).toBe('25-dials')
    expect(senderSlug('Acme Studio, LLC')).toBe('acme-studio-llc')
    expect(senderSlug('  Jane   Smith  ')).toBe('jane-smith')
    expect(senderSlug('R&D / Partners')).toBe('r-d-partners')
  })

  it('folds accents rather than dropping the letter', () => {
    expect(senderSlug('Café Noir')).toBe('cafe-noir')
    expect(senderSlug('Ångström Design')).toBe('angstrom-design')
  })

  it('has no slug for a name with nothing left to spell', () => {
    expect(senderSlug('株式会社')).toBeNull()
    expect(senderSlug('---')).toBeNull()
    expect(senderSlug('')).toBeNull()
    expect(senderSlug(null)).toBeNull()
  })

  it('caps the length without leaving a trailing hyphen', () => {
    const slug = senderSlug(`${'a'.repeat(39)} ${'b'.repeat(20)}`)
    expect(slug).toBe('a'.repeat(39))
    expect(senderSlug('x'.repeat(100))).toHaveLength(40)
  })

  it('only ever produces characters a path segment can carry as-is', () => {
    for (const name of ['O’Brien & Co.', 'Ünïcødé Ltd', 'a/b\\c?d#e', '100%']) {
      expect(senderSlug(name) ?? '').toMatch(/^[a-z0-9-]*$/)
    }
  })
})

describe('sharePath', () => {
  it('puts the sender in the link when the name has a slug', () => {
    expect(sharePath('tok_123-abc', '25 Dials')).toBe('/p/25-dials/tok_123-abc')
  })

  it('keeps the plain form when there is no usable name', () => {
    expect(sharePath('tok_123-abc', null)).toBe('/p/tok_123-abc')
    expect(sharePath('tok_123-abc', '株式会社')).toBe('/p/tok_123-abc')
  })
})

describe('senderName', () => {
  it('prefers the company, falling back to the person', () => {
    expect(senderName({ company_name: '25 Dials', full_name: 'Sam' })).toBe(
      '25 Dials',
    )
    expect(senderName({ company_name: null, full_name: 'Sam' })).toBe('Sam')
    expect(senderName({ company_name: null, full_name: null })).toBeNull()
  })
})
