/**
 * The five screenshots a launch listing asks for.
 *
 * Product directories crop anything that is not 16:9 from the centre, which
 * turns an app screenshot into a strip of its own middle. So nothing here is
 * captured at 1920x1080 directly: each screen is shot at 1440x900 — the width
 * the 1280px shell was designed for — and then composited onto a 1920x1080
 * card with a caption above it. The card is the thing that is 16:9, and the
 * app inside it keeps its real proportions.
 *
 * Composition is done by screenshotting a second, local HTML page rather than
 * by an image library, so this needs nothing that `pnpm test:e2e` does not
 * already install.
 *
 * The data is fabricated. A demo account is created, seeded with proposals and
 * the reading activity that makes the intent scores mean something, shot, and
 * deleted — the same create-and-tear-down the e2e suite uses, against the same
 * project, and named the same greppable way so a failed run leaves evidence
 * rather than a mystery.
 *
 *   pnpm dev            # in one terminal
 *   node scripts/product-shots.mjs
 *
 * Every screen is shot twice, light and dark, because the app has a real dark
 * theme and half the people who open a listing are in one. The light set is
 * what to upload; the dark set is the same five frames for a dark landing page,
 * a dark-background listing, or a post.
 *
 * Output lands in public/shots/{light,dark}/ as 3840x2160 PNGs, numbered in the
 * order they should be uploaded: the first one is also the social share image.
 * They sit in public/ rather than a scratch directory so the same files can be
 * linked from the site, a press kit or a directory listing without being
 * regenerated.
 */
import { randomBytes, randomUUID } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

process.loadEnvFile('.env')
try {
  // Local dev overrides the public origin; share links have to point at the
  // dev server or the viewer shot loads production's copy of nothing.
  process.loadEnvFile('.env.development.local')
} catch {
  // Optional.
}

const BASE = 'http://localhost:3000'
const OUT = 'public/shots'
const url = process.env.VITE_SUPABASE_URL
const publishable = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const secret = process.env.SUPABASE_SECRET_KEY

if (!url || !publishable || !secret) {
  throw new Error(
    'needs VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY',
  )
}

const db = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DAY = 86_400_000
const HOUR = 3_600_000
const ago = (ms) => new Date(Date.now() - ms).toISOString()

// ---------------------------------------------------------------------------
// The document
// ---------------------------------------------------------------------------

/**
 * A ten-page proposal that looks like one. The viewer shot is a picture of
 * somebody else's PDF, so a lorem-ipsum fixture reads as a broken product
 * rather than as a placeholder.
 */
const PROPOSAL_HTML = `
<style>
  @page { size: A4; margin: 0 }
  body { margin: 0; color: #1b1813; font: 15px/1.65 Georgia, 'Times New Roman', serif }
  section { height: 297mm; padding: 26mm 24mm; box-sizing: border-box;
            display: flex; flex-direction: column }
  section:not(:last-child) { page-break-after: always }
  .kicker { font: 600 10px/1 'Helvetica Neue', Arial, sans-serif; letter-spacing: .16em;
            text-transform: uppercase; color: #794e0c }
  h1 { font-size: 40px; line-height: 1.15; margin: 14px 0 0; letter-spacing: -.02em }
  h2 { font-size: 25px; margin: 10px 0 18px; letter-spacing: -.01em }
  p  { margin: 0 0 13px; max-width: 42em }
  .muted { color: #595249 }
  .rule { height: 2px; background: #794e0c; width: 64px; margin: 22px 0 }
  .spacer { flex: 1 }
  table { border-collapse: collapse; width: 100%; margin-top: 6px;
          font: 15px/1.6 'Helvetica Neue', Arial, sans-serif }
  th { text-align: left; font-size: 10px; letter-spacing: .12em; text-transform: uppercase;
       color: #655d53; border-bottom: 1px solid #d2caba; padding: 0 0 8px }
  td { padding: 13px 0; border-bottom: 1px solid #e4ded2 }
  td:last-child, th:last-child { text-align: right }
  tr.total td { font-weight: 700; border-bottom: none; border-top: 2px solid #1b1813 }
  ul { margin: 0 0 13px; padding-left: 20px; max-width: 42em }
  li { margin-bottom: 7px }
  .foot { font: 11px/1.5 'Helvetica Neue', Arial, sans-serif; color: #655d53 }
</style>

<section>
  <div style="height:34mm"></div>
  <p class="kicker">Proposal · Confidential</p>
  <h1>Website redesign<br />and platform build</h1>
  <div class="rule"></div>
  <p class="muted">Prepared for Northwind Studio<br />Attention: Jordan Reyes, VP Marketing</p>
  <div class="spacer"></div>
  <p class="foot">Fieldmark &amp; Co · 4 September 2026 · Valid for 30 days</p>
</section>

<section>
  <p class="kicker">01 — Executive summary</p>
  <h2>What we are proposing</h2>
  <p>Northwind's current site was built for a company half its size. It loads in
  4.8 seconds on mobile, the product pages are unmaintainable without an engineer,
  and enquiries have flattened while traffic has grown 31% year on year.</p>
  <p>This proposal covers a full redesign, a component-driven rebuild on a headless
  CMS, and a ten-week handover that leaves your team able to ship pages without us.</p>
  <p>On the conversion rates we modelled from your analytics, the build pays for
  itself inside seven months.</p>
  <div class="spacer"></div>
  <p class="foot">2</p>
</section>

<section>
  <p class="kicker">02 — Where things stand</p>
  <h2>Findings</h2>
  <ul>
    <li>Mobile is 68% of sessions and 21% of enquiries.</li>
    <li>Eleven near-duplicate page templates, none of them documented.</li>
    <li>Publishing a case study currently takes a developer half a day.</li>
    <li>No design tokens: seven greys, four type scales, three button styles.</li>
  </ul>
  <p>None of this is unusual for a site that has been extended rather than
  designed for four years. All of it is fixable in one pass.</p>
  <div class="spacer"></div>
  <p class="foot">3</p>
</section>

<section>
  <p class="kicker">03 — Scope</p>
  <h2>What we will deliver</h2>
  <ul>
    <li>A design system: tokens, twelve components, light and dark.</li>
    <li>Twelve page templates, responsive from 360px up.</li>
    <li>Headless CMS integration with editor previews.</li>
    <li>Performance budget enforced in CI — LCP under 2.0s on 4G.</li>
    <li>Analytics and event tracking carried across without gaps.</li>
  </ul>
  <p class="muted">Out of scope: copywriting, photography, ongoing hosting,
  and paid media. We are happy to recommend people for all four.</p>
  <div class="spacer"></div>
  <p class="foot">4</p>
</section>

<section>
  <p class="kicker">04 — Approach</p>
  <h2>How the work runs</h2>
  <p>Three workstreams overlap rather than queue. Design leads by two weeks,
  build follows, and content migration runs alongside both from week three.</p>
  <p>You see working software every Thursday. Nothing is presented as a static
  mockup that has not also been built.</p>
  <div class="spacer"></div>
  <p class="foot">5</p>
</section>

<section>
  <p class="kicker">05 — Investment</p>
  <h2>Pricing</h2>
  <table>
    <tr><th>Workstream</th><th>Weeks</th><th>Investment</th></tr>
    <tr><td>Discovery and design system</td><td>3</td><td>$18,000</td></tr>
    <tr><td>Template design and build</td><td>5</td><td>$14,500</td></tr>
    <tr><td>CMS integration and migration</td><td>2</td><td>$6,500</td></tr>
    <tr class="total"><td>Total</td><td>10</td><td>$39,000</td></tr>
  </table>
  <p style="margin-top:22px">Payment terms: 40% on signature, 40% at design
  sign-off, 20% on handover. Fixed price — no hourly billing, no change orders
  for anything inside the scope above.</p>
  <div class="spacer"></div>
  <p class="foot">6</p>
</section>

<section>
  <p class="kicker">06 — Timeline</p>
  <h2>Ten weeks</h2>
  <ul>
    <li>Weeks 1–2 — Discovery, audit, information architecture.</li>
    <li>Weeks 2–4 — Design system and key templates.</li>
    <li>Weeks 4–9 — Build, content migration, QA.</li>
    <li>Week 10 — Handover, documentation, two training sessions.</li>
  </ul>
  <p>Kick-off within ten working days of signature.</p>
  <div class="spacer"></div>
  <p class="foot">7</p>
</section>

<section>
  <p class="kicker">07 — Case study</p>
  <h2>Ardent Legal</h2>
  <p>Same shape of problem: a site grown past its template system, a team
  blocked on developers to publish. We rebuilt it in nine weeks.</p>
  <p>Enquiries up 44% in the two quarters after launch. Time to publish a new
  practice-area page went from two days to twenty minutes.</p>
  <div class="spacer"></div>
  <p class="foot">8</p>
</section>

<section>
  <p class="kicker">08 — Team</p>
  <h2>Who does the work</h2>
  <p>Two people, both senior, both on this from kick-off to handover. No
  account layer between you and the people building it.</p>
  <p class="muted">Avery Lindqvist — design lead. Twelve years, mostly B2B.<br />
  Sam Okonkwo — engineering lead. Headless CMS and performance.</p>
  <div class="spacer"></div>
  <p class="foot">9</p>
</section>

<section>
  <p class="kicker">09 — Terms</p>
  <h2>The agreement</h2>
  <p>Fixed price, fixed scope, ten weeks from kick-off. You own everything on
  handover: source, design files, documentation.</p>
  <p>Either side may end the engagement with two weeks' notice; work completed
  is invoiced, nothing further is owed.</p>
  <div class="spacer"></div>
  <p class="foot">10 · Fieldmark &amp; Co</p>
</section>
`

const PAGE_SECTIONS = [
  'cover',
  'summary',
  'other',
  'scope',
  'other',
  'pricing',
  'timeline',
  'case_study',
  'team',
  'terms',
]

// ---------------------------------------------------------------------------
// The account and its data
// ---------------------------------------------------------------------------

const DOMAIN = 'demo.closewatch.test'
const PASSWORD = 'shots-only-password-not-a-secret'

/**
 * Every proposal on the demo dashboard, with the reading it has had.
 *
 * `visits` is written the way the ingest would have written it, not the way the
 * intent score reads it: the score is derived, so tuning a band means changing
 * how long somebody read, which keeps the screenshots honest about what the
 * numbers mean.
 */
const PROPOSALS = [
  {
    title: 'Website redesign and platform build',
    client: 'Northwind Studio',
    value: 39_000_00,
    pages: 10,
    status: 'sent',
    createdAgo: 9 * DAY,
    recipient: 'Jordan Reyes',
    email: 'jordan@northwindstudio.com',
    // Hot: read three times, forwarded twice, four minutes on the pricing page.
    visits: [
      {
        viewer: 'v1',
        at: 8 * DAY,
        engaged: 214_000,
        dev: ['Chrome', 'macOS', 'US', 'Portland'],
        pages: [
          [1, 22],
          [2, 46],
          [3, 31],
          [4, 38],
          [6, 44],
          [7, 21],
        ],
      },
      {
        viewer: 'v1',
        at: 6 * DAY + 3 * HOUR,
        engaged: 331_000,
        dev: ['Chrome', 'macOS', 'US', 'Portland'],
        pages: [
          [2, 28],
          [4, 52],
          [6, 168],
          [10, 41],
        ],
        events: ['download'],
      },
      {
        viewer: 'v2',
        at: 2 * DAY,
        engaged: 268_000,
        dev: ['Safari', 'iOS', 'US', 'Seattle'],
        pages: [
          [1, 18],
          [2, 51],
          [6, 121],
          [8, 40],
          [10, 27],
        ],
      },
      {
        viewer: 'v3',
        at: 20 * HOUR,
        engaged: 402_000,
        dev: ['Edge', 'Windows', 'US', 'Seattle'],
        pages: [
          [2, 62],
          [4, 44],
          [6, 196],
          [9, 33],
          [10, 51],
        ],
        events: ['print', 'download'],
      },
      {
        viewer: 'v2',
        at: 5 * HOUR,
        engaged: 96_000,
        dev: ['Safari', 'iOS', 'US', 'Seattle'],
        pages: [
          [6, 74],
          [10, 19],
        ],
      },
    ],
  },
  {
    title: 'Brand identity system',
    client: 'Halcyon Group',
    value: 24_500_00,
    pages: 14,
    status: 'sent',
    createdAgo: 5 * DAY,
    recipient: 'Priya Raman',
    email: 'priya@halcyongroup.co',
    visits: [
      {
        viewer: 'h1',
        at: 4 * DAY,
        engaged: 188_000,
        dev: ['Chrome', 'Windows', 'GB', 'London'],
        pages: [
          [1, 20],
          [3, 44],
          [6, 62],
          [9, 34],
        ],
      },
      {
        viewer: 'h1',
        at: 2 * DAY + 6 * HOUR,
        engaged: 188_000,
        dev: ['Chrome', 'Windows', 'GB', 'London'],
        pages: [
          [6, 62],
          [7, 51],
          [14, 44],
        ],
      },
      {
        viewer: 'h2',
        at: 11 * HOUR,
        engaged: 121_000,
        dev: ['Safari', 'macOS', 'GB', 'London'],
        pages: [
          [1, 15],
          [6, 48],
          [14, 26],
        ],
      },
    ],
  },
  {
    title: 'Platform discovery and roadmap',
    client: 'Meridian Health',
    value: 58_000_00,
    pages: 22,
    status: 'sent',
    createdAgo: 12 * DAY,
    recipient: 'Dr. Alex Whitfield',
    email: 'a.whitfield@meridianhealth.org',
    visits: [
      {
        viewer: 'm1',
        at: 11 * DAY,
        engaged: 156_000,
        dev: ['Chrome', 'Windows', 'CA', 'Toronto'],
        pages: [
          [1, 14],
          [2, 38],
          [5, 44],
          [11, 33],
        ],
      },
      {
        viewer: 'm1',
        at: 3 * DAY,
        engaged: 174_000,
        dev: ['Chrome', 'Windows', 'CA', 'Toronto'],
        pages: [
          [11, 88],
          [12, 42],
          [22, 24],
        ],
      },
    ],
  },
  {
    title: 'Operations dashboard build',
    client: 'Cobalt Freight',
    value: 16_200_00,
    pages: 8,
    status: 'sent',
    createdAgo: 3 * DAY,
    recipient: 'Marco Silva',
    email: 'marco@cobaltfreight.com',
    visits: [
      {
        viewer: 'c1',
        at: 2 * DAY,
        engaged: 41_000,
        dev: ['Safari', 'iOS', 'PT', 'Lisbon'],
        pages: [
          [1, 12],
          [2, 18],
          [3, 9],
        ],
      },
    ],
  },
  {
    title: 'Ecommerce replatform',
    client: 'Tidewater Coffee',
    value: 31_000_00,
    pages: 16,
    status: 'sent',
    createdAgo: 1 * DAY,
    recipient: 'Nina Alvarez',
    email: 'nina@tidewatercoffee.com',
    // Sent yesterday, not opened. Every dashboard has one.
    visits: [],
  },
  {
    title: 'Website and CMS rebuild',
    client: 'Ardent Legal',
    value: 47_000_00,
    pages: 12,
    status: 'won',
    createdAgo: 41 * DAY,
    outcomeAgo: 9 * DAY,
    recipient: 'Helena Marsh',
    email: 'h.marsh@ardentlegal.com',
    visits: [
      {
        viewer: 'a1',
        at: 38 * DAY,
        engaged: 288_000,
        dev: ['Chrome', 'macOS', 'US', 'Chicago'],
        pages: [
          [1, 20],
          [4, 60],
          [7, 140],
          [12, 40],
        ],
      },
      {
        viewer: 'a2',
        at: 31 * DAY,
        engaged: 201_000,
        dev: ['Chrome', 'Windows', 'US', 'Chicago'],
        pages: [
          [7, 122],
          [12, 55],
        ],
        events: ['download'],
      },
    ],
  },
  {
    title: 'Investor microsite',
    client: 'Palisade Ventures',
    value: 12_800_00,
    pages: 6,
    status: 'won',
    createdAgo: 52 * DAY,
    outcomeAgo: 26 * DAY,
    recipient: 'Theo Brandt',
    email: 'theo@palisade.vc',
    visits: [
      {
        viewer: 'p1',
        at: 49 * DAY,
        engaged: 142_000,
        dev: ['Safari', 'macOS', 'US', 'New York'],
        pages: [
          [1, 18],
          [4, 84],
          [6, 33],
        ],
      },
    ],
  },
  {
    title: 'Membership portal',
    client: 'Bright Harbor Co-op',
    value: 21_000_00,
    pages: 9,
    status: 'lost',
    createdAgo: 60 * DAY,
    outcomeAgo: 20 * DAY,
    recipient: 'Dana Cole',
    email: 'dana@brightharbor.coop',
    visits: [
      {
        viewer: 'b1',
        at: 57 * DAY,
        engaged: 62_000,
        dev: ['Chrome', 'Android', 'US', 'Austin'],
        pages: [
          [1, 16],
          [2, 22],
        ],
      },
    ],
  },
]

async function seed(pdf) {
  // The header avatar takes its initials from the local part of the address,
  // so this is what puts "AL" in the corner instead of a timestamp.
  const email = `avery.lindqvist.${Date.now()}@${DOMAIN}`
  const { data: created, error: userError } = await db.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Avery Lindqvist' },
  })
  if (userError)
    throw new Error(`could not create demo user: ${userError.message}`)
  const owner = { id: created.user.id, email }

  await db.from('profiles').upsert(
    {
      id: owner.id,
      email,
      full_name: 'Avery Lindqvist',
      company_name: 'Fieldmark & Co',
    },
    { onConflict: 'id' },
  )

  // A comp rather than a fake Stripe subscription: the paywall banner is not
  // what any of these screenshots are about, and inventing subscription rows
  // would put a customer that never paid into the same table real ones live in.
  await db.from('comps').upsert({
    user_id: owner.id,
    plan: 'studio',
    note: 'product screenshots — deleted at the end of scripts/product-shots.mjs',
  })

  const seeded = []

  for (const spec of PROPOSALS) {
    const id = randomUUID()
    const storagePath = `${owner.id}/${id}.pdf`

    const up = await db.storage.from('proposals').upload(storagePath, pdf, {
      contentType: 'application/pdf',
      upsert: true,
    })
    if (up.error)
      throw new Error(`upload failed for ${spec.client}: ${up.error.message}`)

    const proposal = await db
      .from('proposals')
      .insert({
        id,
        owner_id: owner.id,
        title: spec.title,
        client_name: spec.client,
        deal_value_cents: spec.value,
        currency: 'USD',
        storage_path: storagePath,
        page_count: spec.pages,
        status: spec.status,
        outcome_at: spec.outcomeAgo ? ago(spec.outcomeAgo) : null,
        created_at: ago(spec.createdAgo),
      })
      .select('id')
      .single()
    if (proposal.error)
      throw new Error(
        `proposal failed for ${spec.client}: ${proposal.error.message}`,
      )

    // Sections are confirmed rather than guessed, so the detail page shows a
    // tagged document instead of a prompt to go and tag it.
    await db.from('proposal_pages').insert(
      Array.from({ length: spec.pages }, (_, i) => ({
        proposal_id: id,
        page_number: i + 1,
        section: PAGE_SECTIONS[i] ?? 'other',
        section_auto: false,
      })),
    )

    const token = randomBytes(18).toString('base64url')
    const link = await db
      .from('share_links')
      .insert({
        proposal_id: id,
        token,
        recipient_name: spec.recipient,
        recipient_email: spec.email,
        expires_at: new Date(Date.now() + 45 * DAY).toISOString(),
        created_at: ago(spec.createdAgo),
      })
      .select('id')
      .single()
    if (link.error)
      throw new Error(
        `share link failed for ${spec.client}: ${link.error.message}`,
      )

    // A second, already-revoked link on the flagship proposal, so the share
    // section has something to show about link lifecycle.
    if (spec.client === 'Northwind Studio') {
      await db.from('share_links').insert({
        proposal_id: id,
        token: randomBytes(18).toString('base64url'),
        recipient_name: 'Casey Nolan',
        recipient_email: 'casey@northwindstudio.com',
        created_at: ago(spec.createdAgo + HOUR),
        revoked_at: ago(7 * DAY),
      })
    }

    const seenPerViewer = new Map()

    for (const v of spec.visits) {
      const seq = (seenPerViewer.get(v.viewer) ?? 0) + 1
      seenPerViewer.set(v.viewer, seq)
      const [browser, os, country, city] = v.dev

      const visit = await db
        .from('visits')
        .insert({
          share_link_id: link.data.id,
          proposal_id: id,
          visitor_id: `${id}-${v.viewer}`,
          visit_seq: seq,
          started_at: ago(v.at),
          last_seen_at: ago(v.at - v.engaged),
          engaged_ms: v.engaged,
          device_type: os === 'iOS' || os === 'Android' ? 'mobile' : 'desktop',
          os,
          browser,
          country,
          city,
          is_bot: false,
          is_qualified: true,
        })
        .select('id')
        .single()
      if (visit.error)
        throw new Error(
          `visit failed for ${spec.client}: ${visit.error.message}`,
        )

      await db.from('page_views').insert(
        v.pages.map(([page, seconds]) => ({
          visit_id: visit.data.id,
          proposal_id: id,
          page_number: page,
          engaged_ms: seconds * 1000,
          view_count: 1,
          first_seen_at: ago(v.at),
          last_seen_at: ago(v.at - v.engaged),
        })),
      )

      for (const type of v.events ?? []) {
        await db.from('events').insert({
          visit_id: visit.data.id,
          type,
          created_at: ago(v.at - v.engaged),
        })
      }
    }

    seeded.push({ id, token, client: spec.client })
  }

  return { owner, seeded }
}

async function teardown(owner) {
  const { data: proposals } = await db
    .from('proposals')
    .select('storage_path')
    .eq('owner_id', owner.id)
  const paths = (proposals ?? []).map((p) => p.storage_path).filter(Boolean)
  if (paths.length) await db.storage.from('proposals').remove(paths)
  await db.auth.admin.deleteUser(owner.id)
}

/** Cookies a signed-in browser would hold, built by the library that owns them. */
async function sessionCookies(owner) {
  const { data, error } = await createClient(
    url,
    publishable,
  ).auth.signInWithPassword({
    email: owner.email,
    password: PASSWORD,
  })
  if (error) throw new Error(`could not sign in demo user: ${error.message}`)

  const written = []
  const client = createServerClient(url, publishable, {
    cookies: { getAll: () => [], setAll: (c) => written.push(...c) },
  })
  await client.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  })

  return written.map(({ name, value }) => ({
    name,
    value,
    domain: 'localhost',
    path: '/',
    expires: -1,
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
  }))
}

// ---------------------------------------------------------------------------
// Framing
// ---------------------------------------------------------------------------

/** The two grounds the card is painted on. Everything else is shared. */
const THEMES = {
  light: {
    ink: '#1a1815',
    kicker: '#68625a',
    grid: '#1a1815',
    gridOpacity: 0.03,
    background: `
      radial-gradient(1200px 620px at 50% -8%, #ffffff 0%, rgba(255,255,255,0) 62%),
      radial-gradient(900px 700px at 88% 108%, #f1efeb 0%, rgba(241,239,235,0) 60%),
      linear-gradient(168deg, #fdfcfb 0%, #f8f7f4 58%, #f2f0ec 100%)`,
    chrome: 'linear-gradient(#fbfaf8, #f4f2ee)',
    chromeEdge: 'rgba(26,24,21,.10)',
    windowEdge: 'rgba(26,24,21,.12)',
    windowFill: '#ffffff',
    dot: '#cbc6bd',
    pillFill: 'rgba(255,255,255,.9)',
    pillEdge: 'rgba(26,24,21,.09)',
    pillInk: '#726b62',
    shadow: `0 1px 1px rgba(41,33,24,.04),
             0 12px 26px -10px rgba(41,33,24,.14),
             0 44px 80px -26px rgba(41,33,24,.24)`,
  },
  dark: {
    ink: '#f0ede7',
    kicker: '#a39c90',
    grid: '#f0ede7',
    gridOpacity: 0.035,
    background: `
      radial-gradient(1200px 620px at 50% -8%, #221f1a 0%, rgba(34,31,26,0) 62%),
      radial-gradient(900px 700px at 88% 108%, #2a2318 0%, rgba(42,35,24,0) 60%),
      linear-gradient(168deg, #171614 0%, #131211 56%, #0e0d0c 100%)`,
    chrome: 'linear-gradient(#232120, #1c1a18)',
    chromeEdge: 'rgba(240,237,231,.09)',
    windowEdge: 'rgba(240,237,231,.11)',
    windowFill: '#1a1917',
    dot: '#3b3733',
    pillFill: 'rgba(19,18,17,.7)',
    pillEdge: 'rgba(240,237,231,.09)',
    pillInk: '#a39c90',
    // Dark grounds swallow a drop shadow, so the window is lifted with a rim
    // of light on its top edge instead of a bigger blur underneath.
    shadow: `inset 0 1px 0 rgba(240,237,231,.07),
             0 20px 40px -14px rgba(0,0,0,.6),
             0 60px 110px -40px rgba(0,0,0,.8)`,
  },
}

/**
 * The 1920x1080 card the app screenshot is mounted on.
 *
 * Shot at deviceScaleFactor 2, so the file is 3840x2160 — comfortably over the
 * "1920x1080 or larger" floor and still well under 10MB as a PNG.
 *
 * The screenshot is placed at whatever size fits rather than cropped to a fixed
 * box: a cropped screenshot loses the bottom of the page, and a page that ends
 * early would otherwise be mounted with a strip of its own empty canvas below
 * the content. Each shot declares the viewport it wants, and the card scales it
 * down to fit — never up past a little, so nothing is soft.
 */
function card({ kicker, headline, image, chrome, width, height, theme }) {
  const t = THEMES[theme]
  const scale = Math.min(MAX_SHOT_W / width, MAX_SHOT_H / height)
  const w = Math.round(width * scale)
  const h = Math.round(height * scale)

  return `
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Newsreader:opsz,wght@6..72,400&display=block">
<style>
  * { box-sizing: border-box; margin: 0 }
  body {
    width: 1920px; height: 1080px; overflow: hidden;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-family: 'Geist', 'Helvetica Neue', Arial, sans-serif;
    color: ${t.ink};
    background: ${t.background};
  }
  /* A hairline grid, barely there — enough to stop 1920px of flat colour
     reading as an empty JPEG in a listing thumbnail. */
  body::before {
    content: ''; position: fixed; inset: 0;
    background-image:
      linear-gradient(${t.grid} 1px, transparent 1px),
      linear-gradient(90deg, ${t.grid} 1px, transparent 1px);
    background-size: 64px 64px;
    opacity: ${t.gridOpacity};
  }
  .caption { position: relative; text-align: center; margin-bottom: 26px }
  /* Matches the app: a plain sentence-case label, and the headline in the
     serif the site's headings use. */
  .kicker { font-size: 15px; font-weight: 500; color: ${t.kicker}; margin-bottom: 8px }
  .headline {
    font-family: 'Newsreader', Georgia, serif; font-weight: 400;
    font-size: 40px; letter-spacing: -.012em; line-height: 1.15;
  }
  .window {
    position: relative; width: ${w}px; border-radius: 13px; overflow: hidden;
    background: ${t.windowFill}; border: 1px solid ${t.windowEdge};
    box-shadow: ${t.shadow};
  }
  .bar {
    height: 36px; display: flex; align-items: center; gap: 8px; padding: 0 14px;
    background: ${t.chrome}; border-bottom: 1px solid ${t.chromeEdge};
  }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: ${t.dot} }
  .url {
    margin: 0 auto; padding: 3px 14px; border-radius: 999px;
    background: ${t.pillFill}; border: 1px solid ${t.pillEdge};
    font-size: 12px; color: ${t.pillInk};
  }
  .shot { display: block; width: ${w}px; height: ${h}px }
</style>
<div class="caption">
  <div class="kicker">${kicker}</div>
  <div class="headline">${headline}</div>
</div>
<div class="window">
  <div class="bar">
    <span class="dot"></span><span class="dot"></span><span class="dot"></span>
    <span class="url">${chrome}</span>
  </div>
  <img class="shot" src="data:image/png;base64,${image}" />
</div>
`
}

/** What is left for the window once the caption and its margins are paid for. */
const MAX_SHOT_W = 1400
const MAX_SHOT_H = 880

// ---------------------------------------------------------------------------
// The screens
// ---------------------------------------------------------------------------

/**
 * `viewport` is per shot rather than global. The app's shell is 1280px, so most
 * screens want 1440 and get sensible margins; the upload form constrains itself
 * far inside that, and at 1440 it sits in a third of the frame with two thirds
 * of empty canvas beside it.
 */
function shotList(flagship, unopened) {
  return [
    {
      file: '1-dashboard.png',
      path: '/dashboard',
      wait: 'h1',
      viewport: { width: 1440, height: 830 },
      chrome: 'getclosewatch.com/dashboard',
      kicker: 'The dashboard',
      headline: 'Every open proposal, ranked by who is actually reading it',
    },
    {
      file: '2-activity.png',
      path: `/proposals/${flagship.id}`,
      wait: 'h1',
      viewport: { width: 1440, height: 900 },
      chrome: 'getclosewatch.com/proposals/northwind-studio',
      kicker: 'Per-proposal activity',
      headline: 'Which pages they read, and how long they stayed on pricing',
      scrollTo: 'Activity',
    },
    {
      file: '3-visits.png',
      path: `/proposals/${flagship.id}`,
      wait: 'h1',
      viewport: { width: 1440, height: 900 },
      chrome: 'getclosewatch.com/proposals/northwind-studio',
      kicker: 'Reader-level detail',
      headline: 'One link per recipient, so a forward shows up as a new reader',
      scrollTo: 'Recent visits',
    },
    {
      file: '4-viewer.png',
      path: `/p/${flagship.token}`,
      wait: 'canvas',
      // No scroll, and a short viewport: the top of the first page is the
      // point of this frame, and an A4 page is taller than any viewport here.
      viewport: { width: 1440, height: 780 },
      // As the client: signed in, the owner gets the "this is your preview"
      // banner, which no client ever sees.
      signedOut: true,
      chrome: 'getclosewatch.com/p/9fZk…',
      kicker: 'What the client sees',
      headline:
        'The PDF you already send, with nothing to install or sign up for',
    },
    {
      file: '5-upload.png',
      path: '/proposals/new',
      wait: 'h1',
      viewport: { width: 1140, height: 760 },
      chrome: 'getclosewatch.com/proposals/new',
      kicker: 'Getting started',
      headline:
        'Upload the PDF, name the deal, send the link. That is the setup.',
      fillForm: true,
    },
    {
      file: '6-handoff.png',
      // Tidewater is the proposal with no reads: sent yesterday, never opened.
      // The banner says "now send this", so putting it on a proposal with five
      // visits and four minutes on pricing would contradict itself.
      path: `/proposals/${unopened.id}?sent=true`,
      wait: 'h1',
      viewport: { width: 1440, height: 720 },
      chrome: 'getclosewatch.com/proposals/tidewater-coffee',
      kicker: 'One link per recipient',
      headline:
        'Name who it is going to, and the tracked link is waiting for you',
    },
  ]
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const browser = await chromium.launch()

// The PDF first: it is the file every seeded proposal points at.
const pdfPage = await browser.newPage()
await pdfPage.setContent(PROPOSAL_HTML, { waitUntil: 'load' })
const pdf = await pdfPage.pdf({ format: 'A4', printBackground: true })
await pdfPage.close()
const pdfPath = 'public/shots/sample-proposal.pdf'

const { owner, seeded } = await seed(pdf)
const flagship = seeded.find((p) => p.client === 'Northwind Studio')
console.log(`seeded ${seeded.length} proposals for ${owner.email}`)

const cookies = await sessionCookies(owner)
// Tidewater Coffee is seeded with a share link and no visits at all, which is
// the only honest state for a "now send this" banner.
const unopened = seeded.find((p) => p.client === 'Tidewater Coffee')
const shots = shotList(flagship, unopened)

try {
  for (const theme of ['light', 'dark']) {
    await mkdir(`${OUT}/${theme}`, { recursive: true })

    const context = await browser.newContext({
      deviceScaleFactor: 2,
      colorScheme: theme,
      timezoneId: 'America/Los_Angeles',
      locale: 'en-US',
    })
    await context.addCookies(cookies)

    // The app decides its theme from localStorage before first paint, so this
    // has to be written before any of its own scripts run. Matching
    // colorScheme above keeps form controls and scrollbars in the same theme.
    await context.addInitScript((wanted) => {
      try {
        localStorage.setItem('cw.theme', wanted)
      } catch {
        // Nothing to do; colorScheme above is the fallback.
      }
    }, theme)

    const page = await context.newPage()

    /** Waits for React to own the page, the way the e2e helper does. */
    async function ready(selector) {
      await page
        .locator(selector)
        .first()
        .waitFor({ state: 'attached', timeout: 30_000 })
      await page
        .waitForFunction(
          (sel) => {
            const node = document.querySelector(sel)
            return (
              !!node &&
              Object.keys(node).some((k) => k.startsWith('__reactFiber'))
            )
          },
          selector,
          { timeout: 30_000 },
        )
        .catch(() => {})
      await page.waitForTimeout(800)
    }

    const framerContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 2,
      colorScheme: 'light',
    })
    const framer = await framerContext.newPage()

    for (const shot of shots) {
      await page.setViewportSize(shot.viewport)
      if (shot.signedOut) {
        await context.clearCookies()
        // Signed out, this is a client read as far as the app knows. Keep it
        // from reaching the tracker so the frames shot after it — the dark
        // set included — show the same numbers as the ones before it.
        await page.route('**/api/track/**', (route) => route.abort())
      }
      await page.goto(`${BASE}${shot.path}`, { waitUntil: 'domcontentloaded' })
      await ready(shot.wait)

      // The devtools launcher floats over the bottom-right corner of every page
      // in dev, which is squarely inside the frame. Added after hydration
      // rather than before: this app server-renders the whole document, so a
      // style tag put in <head> ahead of time is discarded when React adopts it.
      await page.addStyleTag({
        content: '[data-testid="tanstack_devtools"]{display:none!important}',
      })

      if (shot.fillForm) {
        // A form full of grey placeholders reads as an unfinished feature. This
        // fills it in the way a user would, right up to the point of submitting,
        // which is also the only state where the file field says a filename.
        // By placeholder rather than by label: each label wraps its hint text
        // as well as its name, so an accessible-name match is fragile here.
        await page
          .getByPlaceholder('Brand identity, Q3')
          .fill('Website redesign — Q4')
        await page.getByPlaceholder('Acme Studio').fill('Northwind Studio')
        // The optional recipient. Filled, because a named one is what makes the
        // form hand back a link on submit, and the shot after this is that link.
        await page.getByPlaceholder('Jordan at Acme').fill('Jordan Reyes')
        await page.getByPlaceholder('12,000').fill('39000')
        await writeFile(pdfPath, pdf)
        await page.locator('input[type="file"]').setInputFiles(pdfPath)
        // The last field filled keeps its focus ring and, being a number input,
        // its spinner arrows. Neither is a state worth photographing.
        await page.evaluate(() => document.activeElement?.blur())
        await page.waitForTimeout(600)
      }

      // Share links are rendered from VITE_PUBLIC_URL, which in dev is the dev
      // server. Nothing about a localhost URL is true of the product, so the
      // origin is swapped in the DOM for the shot only.
      await page.evaluate(() => {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
        )
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (n.nodeValue?.includes('localhost:3000')) {
            n.nodeValue = n.nodeValue.replace(
              /https?:\/\/localhost:3000/g,
              'https://getclosewatch.com',
            )
          }
        }
      })

      // By heading rather than by pixel offset, so a section added above
      // one of these does not silently push it out of frame.
      if (shot.scrollTo) {
        await page.evaluate((text) => {
          const heading = [...document.querySelectorAll('h2, h3')].find(
            (el) => el.textContent?.trim() === text,
          )
          if (heading) {
            window.scrollTo(
              0,
              heading.getBoundingClientRect().top + window.scrollY - 88,
            )
          }
        }, shot.scrollTo)
        await page.waitForTimeout(500)
      }

      if (shot.scroll) {
        await page.evaluate((y) => window.scrollTo(0, y), shot.scroll)
        await page.waitForTimeout(500)
      }

      const raw = await page.screenshot({ type: 'png' })

      if (shot.signedOut) {
        await page.unroute('**/api/track/**')
        await context.addCookies(cookies)
      }

      await framer.setContent(
        card({
          kicker: shot.kicker,
          headline: shot.headline,
          chrome: shot.chrome,
          image: raw.toString('base64'),
          width: shot.viewport.width,
          height: shot.viewport.height,
          theme,
        }),
        { waitUntil: 'load' },
      )
      await framer.evaluate(() => document.fonts.ready)
      await framer.screenshot({
        path: `${OUT}/${theme}/${shot.file}`,
        type: 'png',
      })
      console.log(`wrote ${OUT}/${theme}/${shot.file}`)
    }

    await context.close()
    await framerContext.close()
  }
} finally {
  await teardown(owner)
  await rm(pdfPath, { force: true })
  await browser.close()
  console.log('demo account deleted')
}
