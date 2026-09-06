import { describe, expect, it } from 'vitest'
import { wwwRedirect } from './www-redirect'

// `.env` is what vitest loads, so the canonical host under test is the real
// production one rather than a stand-in.
describe('wwwRedirect', () => {
  it('leaves the canonical host alone', () => {
    expect(wwwRedirect('https://getclosewatch.com/vs/docsend')).toBeNull()
  })

  it('sends the www copy to the canonical host', () => {
    expect(wwwRedirect('https://www.getclosewatch.com/vs/docsend')).toBe(
      'https://getclosewatch.com/vs/docsend',
    )
  })

  it('keeps the path and the query string', () => {
    expect(wwwRedirect('https://www.getclosewatch.com/?utm_source=hn')).toBe(
      'https://getclosewatch.com/?utm_source=hn',
    )
  })

  it('upgrades an http www request rather than redirecting within http', () => {
    expect(wwwRedirect('http://www.getclosewatch.com/terms')).toBe(
      'https://getclosewatch.com/terms',
    )
  })

  // A host that merely contains our name is somebody else's. Matching loosely
  // here would hand them a redirect that looks like it came from us.
  it('ignores a lookalike host', () => {
    expect(wwwRedirect('https://www.getclosewatch.com.evil.test/')).toBeNull()
    expect(wwwRedirect('https://notgetclosewatch.com/')).toBeNull()
    expect(wwwRedirect('https://www.www.getclosewatch.com/')).toBeNull()
  })

  // The share viewer is the one place a redirect would be felt: the reader is
  // holding a link somebody sent them, and it has to keep working.
  it('carries a share link across', () => {
    expect(wwwRedirect('https://www.getclosewatch.com/p/abc123')).toBe(
      'https://getclosewatch.com/p/abc123',
    )
  })
})
