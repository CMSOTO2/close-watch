import { describe, expect, it } from 'vitest'
import { locationLabel, normalizeGeo, requestGeo } from './geo'

function cfRequest(
  cf?: Record<string, unknown>,
  headers?: Record<string, string>,
) {
  const request = new Request('https://getclosewatch.com/p/tok', { headers })
  if (cf) Object.defineProperty(request, 'cf', { value: cf })
  return request
}

describe('normalizeGeo', () => {
  it('keeps a real country and city', () => {
    expect(normalizeGeo('gb', ' London ')).toEqual({
      country: 'GB',
      city: 'London',
    })
  })

  it('drops the codes Cloudflare uses for "could not tell"', () => {
    expect(normalizeGeo('XX', null).country).toBeNull()
    expect(normalizeGeo('T1', null).country).toBeNull()
  })

  it('drops anything that is not a two-letter code', () => {
    for (const bad of ['', 'G', 'GBR', 'G1', '12', 'united kingdom']) {
      expect(normalizeGeo(bad, null).country, bad).toBeNull()
    }
  })

  it('survives values that are not strings', () => {
    expect(normalizeGeo(undefined, undefined)).toEqual({
      country: null,
      city: null,
    })
    expect(normalizeGeo(42, {})).toEqual({ country: null, city: null })
  })

  it('rejects a city long enough to look like an injection', () => {
    expect(normalizeGeo('GB', 'x'.repeat(200)).city).toBeNull()
  })
})

describe('requestGeo', () => {
  it('reads the header Cloudflare sets on every request', () => {
    expect(requestGeo(cfRequest(undefined, { 'cf-ipcountry': 'DE' }))).toEqual({
      country: 'DE',
      city: null,
    })
  })

  it('takes the city from cf, which no header carries', () => {
    const request = cfRequest(
      { country: 'FR', city: 'Lyon' },
      { 'cf-ipcountry': 'FR' },
    )
    expect(requestGeo(request)).toEqual({ country: 'FR', city: 'Lyon' })
  })

  it('falls back to cf.country when the header is absent', () => {
    expect(requestGeo(cfRequest({ country: 'JP' })).country).toBe('JP')
  })

  // Local dev and every non-Cloudflare host. The insert must still go through.
  it('returns nulls when there is no cf and no header', () => {
    expect(requestGeo(cfRequest())).toEqual({ country: null, city: null })
  })
})

describe('locationLabel', () => {
  it('names the country rather than showing its code', () => {
    expect(locationLabel({ country: 'GB', city: 'London' })).toBe(
      'London, United Kingdom',
    )
    expect(locationLabel({ country: 'DE', city: null })).toBe('Germany')
  })

  it('shows the city alone when the country is unknown', () => {
    expect(locationLabel({ country: null, city: 'Lyon' })).toBe('Lyon')
  })

  it('is null when nothing is known, so the row renders without it', () => {
    expect(locationLabel({ country: null, city: null })).toBeNull()
  })
})
