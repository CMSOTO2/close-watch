/**
 * Tell Bing the site changed, without waiting to be crawled.
 *
 * A sitemap is a standing invitation; IndexNow is a knock on the door. Bing
 * takes the URL list immediately, which matters here for a reason that has
 * nothing to do with Bing's own traffic: ChatGPT's search retrieval leans on
 * Bing's index, so the lag between deploying a page and that page being
 * quotable by an assistant is mostly Bing's crawl schedule. This shortens it.
 *
 * Google does not participate and never has. It gets the sitemap and its own
 * schedule, and there is no equivalent to push at it.
 *
 * The URL list is read from the deployed sitemap rather than hardcoded, so this
 * cannot drift out of sync with `routes/sitemap[.]xml.ts`. Which means it wants
 * to run *after* a deploy, against the site that deploy just published.
 *
 * It never exits non-zero. It is chained onto `pnpm run deploy`, and a search
 * engine having a bad afternoon is not a failed deploy.
 */

const KEY = '29129641e32560f7681fb103a3a47a1b'
const ORIGIN = process.env.INDEXNOW_ORIGIN ?? 'https://getclosewatch.com'
const HOST = new URL(ORIGIN).host

function done(message) {
  console.log(`indexnow: ${message}`)
  process.exit(0)
}

const sitemapUrl = `${ORIGIN}/sitemap.xml`
let urlList

try {
  const res = await fetch(sitemapUrl)
  if (!res.ok) done(`skipped, ${sitemapUrl} returned ${res.status}`)
  const xml = await res.text()
  urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
} catch (error) {
  done(`skipped, could not read ${sitemapUrl} (${error.message})`)
}

if (!urlList?.length) done(`skipped, no <loc> entries in ${sitemapUrl}`)

// The key file has to be reachable, or the whole submission is rejected as
// unverified. Checking costs one request and turns a silent no-op into a line
// that says what is wrong.
//
// Retried because `wrangler deploy` returns before the uploaded assets are
// serving everywhere, and this runs seconds later: the first attempt after a
// deploy 404s often enough that a single check would make the whole script a
// no-op most of the time, quietly and with a plausible-looking reason.
const keyLocation = `${ORIGIN}/${KEY}.txt`
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let verified = false

for (let attempt = 1; attempt <= 5 && !verified; attempt++) {
  if (attempt > 1) await wait(3000)
  try {
    const res = await fetch(keyLocation, { cache: 'no-store' })
    verified = res.ok && (await res.text()).trim() === KEY
    if (!verified && attempt === 5) {
      done(`skipped, ${keyLocation} did not serve the key (HTTP ${res.status})`)
    }
  } catch (error) {
    if (attempt === 5) {
      done(`skipped, could not read ${keyLocation} (${error.message})`)
    }
  }
}

try {
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation, urlList }),
  })

  // 200 and 202 both mean accepted. 422 is the interesting failure: the key or
  // the URLs did not belong to this host, which is worth reading aloud rather
  // than passing over as "not 200".
  if (res.ok || res.status === 202) {
    done(`submitted ${urlList.length} URLs to Bing (HTTP ${res.status})`)
  }
  done(`refused with HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
} catch (error) {
  done(`skipped, submission failed (${error.message})`)
}
