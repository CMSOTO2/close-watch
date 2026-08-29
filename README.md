# Closewatch

Upload the proposal PDF you already send. Get a link that tells you when the client opened
it, how long they spent on pricing, and whether they forwarded it to someone else.

Working name. See [docs/NAMING.md](docs/NAMING.md).

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

## What is here

Magic-link and Google sign-in, PDF upload to private storage, per-recipient share
links, the public tracked viewer, engagement ingest, intent scoring, and the dashboard
with per-proposal detail and activity analytics. The "first qualified open" email
notification is the main piece still to build.

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before changing anything under
`src/lib/analytics/`. The tracking rules there are the reason the numbers can be trusted,
and they are easy to break by accident.

## Docs

- [Positioning](docs/POSITIONING.md) — market, competitors, target customer, pricing
- [MVP](docs/MVP.md) — scope, what is deliberately excluded, sequencing
- [Architecture](docs/ARCHITECTURE.md) — stack, tracking design, security model
- [Launch](docs/LAUNCH.md) — validation, first hundred users, failure modes
- [Naming](docs/NAMING.md) — candidates and how to rename
