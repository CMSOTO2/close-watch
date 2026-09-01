# Closewatch

Upload the proposal PDF you already send. Get a link that tells you when the client opened
it, how long they spent on pricing, and whether they forwarded it to someone else.

Live at [getclosewatch.com](https://getclosewatch.com). The name is settled; the
alternatives that were considered are in [docs/NAMING.md](docs/NAMING.md).

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
- `RESEND_API_KEY` (optional) the `re_…` key from Resend. The first-qualified-open
  email stays disabled until this is set. `EMAIL_FROM` sets the sender and defaults
  to `onboarding@resend.dev`, which only delivers to your own Resend account address
  until you verify a domain

To let returning users sign in with Google, enable the Google provider under
Authentication → Providers in the Supabase dashboard and add
`<project-url>/auth/v1/callback` to the authorised redirect URIs of your Google
OAuth client. Magic-link sign-in works without this.

Apply the schema with `supabase db push`, or paste the files in
`supabase/migrations/` into the SQL editor in order.

```bash
pnpm dev        # http://localhost:3000
pnpm build
pnpm lint
pnpm test
```

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
serves both the app and `/p/:token` from it. It publishes the working tree, not a branch:
see [docs/PRODUCTION.md](docs/PRODUCTION.md) for the secrets that have to exist on the
Worker first.

The PNG icons in `public/` are generated, not hand-drawn. If the mark changes, rerun
`python3 scripts/generate-icons.py` rather than exporting from a design tool: SVG
converters routinely fill the mark's stroked ring and turn it into a blob.

## What is here

The whole MVP loop: magic-link and Google sign-in, a profile for your sender name, PDF
upload to private storage, per-recipient share links, the public tracked viewer with
download and print, engagement ingest, intent scoring, per-proposal activity, and the
first-qualified-open email.

Around it: a dashboard that sorts by intent and can group by client, search, heat
filtering, keyboard navigation, a "since you last looked" diff, one-click link copying,
won/lost outcomes that keep their tracking history, toasts and confirmations on the
actions that deserve them, and a light/dark design system.

Public surface: a landing page, a privacy policy and terms (both linked from Google's
OAuth consent screen), and the brand mark and favicons.

See [docs/PRODUCTION.md](docs/PRODUCTION.md) for what is still operational rather than
built.

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before changing anything under
`src/lib/analytics/`. The tracking rules there are the reason the numbers can be trusted,
and they are easy to break by accident.

## Docs

- [Positioning](docs/POSITIONING.md) — market, competitors, target customer, pricing
- [MVP](docs/MVP.md) — scope, what is deliberately excluded, sequencing
- [Architecture](docs/ARCHITECTURE.md) — stack, tracking design, security model
- [Production](docs/PRODUCTION.md) — the checklist before a real launch
- [Launch](docs/LAUNCH.md) — validation, first hundred users, failure modes
- [Naming](docs/NAMING.md) — candidates and how to rename
