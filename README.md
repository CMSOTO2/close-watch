# Closewatch

[![CI](https://github.com/CMSOTO2/close-watch/actions/workflows/ci.yml/badge.svg)](https://github.com/CMSOTO2/close-watch/actions/workflows/ci.yml)

Proposal tracking for agencies. Upload the proposal PDF you already send. Get a link that
tells you when the client opened it, how long they spent on pricing, and whether they
forwarded it to someone else.

Live at [getclosewatch.com](https://getclosewatch.com).

## Setup

```bash
pnpm install
cp .env.example .env
```

Create a Supabase project, then fill in `.env`:

- `VITE_SUPABASE_URL` from Project settings → API
- `VITE_SUPABASE_PUBLISHABLE_KEY` — the `sb_publishable_…` key. Safe in the browser
  because RLS is on every table
- `SUPABASE_SECRET_KEY` — the `sb_secret_…` key. Server only, never prefixed with
  `VITE_`, and it bypasses RLS entirely
- `IP_HASH_SALT` any long random string
- `VITE_PUBLIC_URL` the public origin used to build share links (defaults to
  `http://localhost:3000`)
- `VITE_CF_BEACON_TOKEN` (optional) the Cloudflare Web Analytics site token. See
  [Traffic](#traffic) below
- `RESEND_API_KEY` (optional) the `re_…` key from Resend. The first-qualified-open
  email stays disabled until this is set. `EMAIL_FROM` sets the sender and defaults
  to `onboarding@resend.dev`, which only delivers to your own Resend account address
  until you verify a domain
- `SIGNUP_NOTIFY_TO` (optional) your own address. Set it and you get an email the
  first time each new account reaches a session; leave it empty and signups pass
  unannounced

To let returning users sign in with Google, enable the Google provider under
Authentication → Providers in the Supabase dashboard and add
`<project-url>/auth/v1/callback` to the authorised redirect URIs of your Google
OAuth client. Magic-link sign-in works without this.

Apply the schema with `supabase db push`, or paste the files in
`supabase/migrations/` into the SQL editor in order.

```bash
pnpm dev              # http://localhost:3000
pnpm build
pnpm lint
pnpm test             # unit
pnpm test:e2e         # end-to-end, needs .env and starts its own dev server
pnpm test:e2e:ui      # the same, in Playwright's watch-and-time-travel UI
pnpm test:e2e:headed  # watch it drive a real browser window
```

A failing end-to-end test keeps its trace and video; the reporter prints the
`show-trace` command to open it. Passing runs keep neither, on purpose, because
a trace is well over a megabyte. `--trace on` overrides that for one run.

`pnpm test` and `pnpm lint` and `pnpm build` also run on every push through
`.github/workflows/ci.yml`, which matters because `wrangler deploy` publishes the
working tree rather than a branch. A push that touches only Markdown skips it:
the repo is private, so minutes are metered, and about a quarter of the commits
here are documentation alone.

The end-to-end tests are a separate workflow that runs weekly and on demand
rather than per push. Installing a browser and waiting out a real read costs
about four billed minutes, which per push would not fit the free allowance.

The end-to-end tests are the three paths where a break would be silent: a proposal
that cannot be sent, a read that is never recorded, and a free plan that forgets to
stop at two. They make their own accounts under `@e2e.closewatch.test` in whatever
Supabase project `.env` points at, which today is the same one production uses, and
delete them afterwards. Read the comments in `e2e/support/app.ts` before touching
them: these pages are server-rendered, and filling a form before React has adopted
it fails in a way that looks like a broken form rather than a race.

## Screenshots

`node scripts/product-shots.mjs` regenerates the six launch screenshots in
`public/shots/`, light and dark, at 3840x2160 — the 16:9 shape product
directories crop everything else down to. It needs `pnpm dev` running in another
terminal. Each screen is shot at the width the shell was designed for and then
mounted on a 16:9 card, because a screenshot captured at 1920x1080 directly is
mostly empty margin.

The account it photographs is fabricated: a demo owner under
`@demo.closewatch.test` is created, seeded with proposals and the reading
activity behind their intent scores, shot, and deleted. Nothing survives the run.
The client-view frame is shot signed out, with its tracking beacon blocked, so it
shows what a client sees and records no read.

The site's in-page screenshots, `public/images/closewatch-*.webp` and their
`-dark` twins, are these cards scaled to 1600x900. Re-export them after a run
whenever the UI changes. The filenames stay the same, so no page needs editing.

Once your project exists, replace the hand-written schema types:

```bash
pnpm dlx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts
```

## Deploy

```bash
pnpm run deploy   # build, then wrangler deploy
```

`run` is not optional there: `pnpm deploy` is pnpm's own workspace command and will not
reach the script.

`wrangler.jsonc` points the Worker at the `getclosewatch.com` custom domain, so a deploy
serves both the app and `/p/:token` from it. It publishes the working tree, not a branch,
and the Worker's secrets have to exist before the first deploy.

## Traffic

Visits to the app's own pages are counted by Cloudflare Web Analytics. Create the site
in the Cloudflare dashboard under Analytics & Logs → Web Analytics → Add a site
(`getclosewatch.com`), copy the site token out of the JS snippet it shows, put it in
`VITE_CF_BEACON_TOKEN`, and deploy. The token is a public identifier, not a secret: it
ships in the client bundle, which is why it is a `VITE_` variable and why changing it
needs a rebuild rather than a `wrangler secret put`.

Use the manual snippet, not the automatic setup. Automatic injection only happens for
responses the edge rewrites on the way out of an origin, and this site is a Worker.

The beacon does not run on `/p/:token`. Those visits are the product's own measurement
and belong on the proposal's activity page, not in an aggregate that also counts the
account holder reloading their dashboard. It also keeps the privacy policy's promise to
readers literally true.

Web Analytics does not log query strings, so `?utm_source=…` on a link posted somewhere
buys nothing. Paths are logged, which is what `/r/$source` is for: post
`getclosewatch.com/r/hn` in a Hacker News thread and `/r/reddit` in a Reddit one, and
each shows up as its own row under Top pages. Any word works, `/r/whatever` included, so
keep the spelling consistent or the same thread lands in two rows.

Those paths serve the landing page rather than redirecting to `/`. A redirect returns no
HTML, so the beacon never runs and the visit is never counted, which was the entire
point. Every `/r/…` page carries a canonical link to `/` so search engines do not treat
them as duplicates of the home page.

Referrers are logged too and need no special link, but they go missing often enough to
be worth the belt and braces: apps that open links in a webview, a paste into a DM, a
client that strips the header.

`public/og.png` is the card every scraper shows. It is generated too:

```bash
python3 scripts/generate-og-image.py   # renders scripts/og-image.html at 1200x630
```

Edit `scripts/og-image.html`, rerun, and commit the PNG. Headless Chrome does the
drawing so the card uses the site's real webfonts, which are embedded in
`scripts/og-fonts.css` by `scripts/fetch-og-fonts.py` rather than fetched: Chrome
photographs the page the instant it paints, and fonts still in flight produce a card
with no words on it. Scrapers cache the image hard, so if the card changes, share the
link with a `?v=2` once to make them look again.

The PNG icons in `public/` are generated, not hand-drawn. If the mark changes, rerun
`python3 scripts/generate-icons.py` rather than exporting from a design tool: SVG
converters routinely fill the mark's stroked ring and turn it into a blob.

## What is here

The whole MVP loop: magic-link and Google sign-in, a profile for your sender name, PDF
upload to private storage, per-recipient share links, the public tracked viewer with
download and print, engagement ingest, intent scoring, per-proposal activity, the
first-qualified-open email, and a signup notification to you.

Around it: a dashboard that sorts by intent and can group by client, search, heat
filtering, keyboard navigation, a "since you last looked" diff, one-click link copying,
won/lost outcomes that keep their tracking history, toasts and confirmations on the
actions that deserve them, and a light/dark design system.

Billing: a free plan capped at two live proposals by a restrictive RLS policy rather than
by application code, Stripe Checkout for Solo, Stripe's billing portal for changing or
cancelling it, and a webhook that is the only thing allowed to write the table the paywall
reads. Live means sent: a proposal counts once it has a share link, so drafts you are
still preparing are free.

Public surface: a landing page, a live demo, an about page, three comparison pages and two
audience pages, the `/proposal-tracking` pillar and twenty-two guides under `/guides`, a
privacy policy, terms and a DPA (the first two linked from Google's OAuth consent screen),
and the brand mark and favicons. Run `node scripts/check-guides.mjs` before deploying a
guide.

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before changing anything under
`src/lib/analytics/`. The tracking rules there are the reason the numbers can be trusted,
and they are easy to break by accident.

## Docs

- [Architecture](docs/ARCHITECTURE.md) — stack, tracking design, security model
- [Browsers](docs/BROWSERS.md) — what the viewer owes every reader, and where the app degrades
