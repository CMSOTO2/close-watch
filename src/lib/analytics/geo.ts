/**
 * Where a read came from, as Cloudflare's edge saw it.
 *
 * Two sources with different reliability. `CF-IPCountry` is a header Cloudflare
 * sets on every request that reaches the Worker, so country survives whatever
 * the server adapter does to the Request on the way in. City exists only on the
 * non-standard `cf` property, which is why it is read defensively: off
 * Cloudflare — local dev, tests, any other host — there is no `cf` at all and
 * both fields fall to null instead of throwing.
 *
 * This is context for the human reading the activity list, not a scoring input.
 * Forwarding is already detected by distinct visitor cookies, which is a far
 * better signal than geography: a VPN, a work laptop on a corporate egress, or
 * a recipient reading on a train all move the country without anyone
 * forwarding anything.
 */

export type Geo = { country: string | null; city: string | null }

/**
 * Cloudflare's placeholders for "could not tell". XX is the documented unknown;
 * T1 is a Tor exit, which the shape check below would reject anyway for having
 * a digit in it, but naming it here says it was considered rather than missed.
 */
const UNKNOWN_COUNTRIES = new Set(['XX', 'T1'])

/** Postgres column is text, but a city name is never this long. */
const MAX_CITY = 120

export function normalizeGeo(country: unknown, city: unknown): Geo {
  return { country: normalizeCountry(country), city: normalizeCity(city) }
}

function normalizeCountry(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const code = value.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return null
  return UNKNOWN_COUNTRIES.has(code) ? null : code
}

function normalizeCity(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const city = value.trim()
  return city.length > 0 && city.length <= MAX_CITY ? city : null
}

/** The shape of the bits of Cloudflare's `request.cf` we care about. */
type CfProperties = { country?: unknown; city?: unknown }

export function requestGeo(request: Request): Geo {
  const cf = (request as Request & { cf?: CfProperties }).cf
  // Header first: it is the one that survives a re-wrapped Request.
  return normalizeGeo(
    request.headers.get('cf-ipcountry') ?? cf?.country,
    cf?.city,
  )
}

/**
 * "London, United Kingdom", or just the country when the city is unknown.
 *
 * The full country name rather than the code, because a bare "GB" next to
 * "Chrome · macOS" reads as one more piece of technical exhaust; the name is
 * the part a consultant actually reacts to when it is not the country they
 * sent the proposal to.
 */
export function locationLabel({ country, city }: Geo): string | null {
  const name = countryName(country)
  if (city && name) return `${city}, ${name}`
  return city ?? name
}

function countryName(code: string | null): string | null {
  if (!code) return null
  try {
    const name = new Intl.DisplayNames(['en'], { type: 'region' }).of(code)
    // DisplayNames echoes the input back for codes it does not know.
    return name && name !== code ? name : code
  } catch {
    // No ICU region data in this runtime; the code is still better than nothing.
    return code
  }
}
