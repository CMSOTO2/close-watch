import { describe, expect, it } from 'vitest'
import { CANONICAL_HOST, redirectFromWww, wwwRedirect } from './www-redirect'

// The host is passed in rather than read from the environment. These assertions
// used to run against whatever VITE_PUBLIC_URL happened to be, which meant they
// tested the production hostname locally and, in CI, tested nothing: with the
// canonical host set to localhost every input returns null, so half of them
// failed and the other half passed for the wrong reason.
const HOST = 'getclosewatch.com'

describe('redirectFromWww', () => {
  it('leaves the canonical host alone', () => {
    expect(
      redirectFromWww('https://getclosewatch.com/vs/docsend', HOST),
    ).toBeNull()
  })

  it('sends the www copy to the canonical host', () => {
    expect(
      redirectFromWww('https://www.getclosewatch.com/vs/docsend', HOST),
    ).toBe('https://getclosewatch.com/vs/docsend')
  })

  it('keeps the path and the query string', () => {
    expect(
      redirectFromWww('https://www.getclosewatch.com/?utm_source=hn', HOST),
    ).toBe('https://getclosewatch.com/?utm_source=hn')
  })

  it('upgrades an http www request rather than redirecting within http', () => {
    expect(redirectFromWww('http://www.getclosewatch.com/terms', HOST)).toBe(
      'https://getclosewatch.com/terms',
    )
  })

  // A host that merely contains our name is somebody else's. Matching loosely
  // here would hand them a redirect that looks like it came from us.
  it('ignores a lookalike host', () => {
    expect(
      redirectFromWww('https://www.getclosewatch.com.evil.test/', HOST),
    ).toBeNull()
    expect(redirectFromWww('https://notgetclosewatch.com/', HOST)).toBeNull()
    expect(
      redirectFromWww('https://www.www.getclosewatch.com/', HOST),
    ).toBeNull()
  })

  // The share viewer is the one place a redirect would be felt: the reader is
  // holding a link somebody sent them, and it has to keep working.
  it('carries a share link across', () => {
    expect(
      redirectFromWww('https://www.getclosewatch.com/p/abc123', HOST),
    ).toBe('https://getclosewatch.com/p/abc123')
  })

  // Nothing above is specific to our own domain, and the rule should not be.
  it('works for whatever host the deployment answers to', () => {
    expect(redirectFromWww('https://www.example.test/a', 'example.test')).toBe(
      'https://example.test/a',
    )
    expect(
      redirectFromWww('https://www.getclosewatch.com/a', 'example.test'),
    ).toBeNull()
  })
})

describe('wwwRedirect', () => {
  // The wrapper's only job is to supply the configured host, so these assert
  // that and nothing about which host it is — which is what lets them pass
  // under CI's localhost as readily as against the real domain. The host comes
  // from the module rather than from process.env, so there is no second reading
  // of the environment to drift out of step with the first.
  it('redirects the www copy of the configured host', () => {
    expect(wwwRedirect(`https://www.${CANONICAL_HOST}/terms`)).toBe(
      `https://${CANONICAL_HOST}/terms`,
    )
  })

  it('leaves the configured host alone', () => {
    expect(wwwRedirect(`https://${CANONICAL_HOST}/terms`)).toBeNull()
  })
})
