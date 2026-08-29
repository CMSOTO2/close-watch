# Architecture

## Stack

- TanStack Start (React 19, SSR) with TanStack Router and TanStack Query
- TypeScript, Tailwind v4, shadcn/ui
- Supabase for Postgres, Auth, and Storage
- Cloudflare for hosting

## Layout

```
src/
  env.ts                      zod-validated env, split public/server
  lib/
    supabase/
      client.ts               browser client (publishable key)
      server.ts               request-scoped client + admin client
      types.ts                schema types, regenerate with the Supabase CLI
    analytics/
      bots.ts                 email-scanner detection, UA parsing
      tracker.ts              viewer-side engagement tracking
      begin-visit.ts          server fn: opens a viewing session
      summaries.ts            server fn: dashboard aggregation
      intent.ts               buying-intent scoring
    auth.ts                   session lookup
  routes/
    index.tsx                 landing
    login.tsx                 magic link
    auth.callback.ts          PKCE code exchange
    _authed.tsx               auth guard
    _authed.dashboard.tsx     proposal list
    p.$token.tsx              public viewer
    api/track.$visitId.ts     engagement ingest
supabase/migrations/          schema, RLS, ingest function
```

## How tracking works

1. A client opens `/p/:token`. The route loader calls `beginVisit`, which runs server-side.
2. `beginVisit` validates the token, sets an httpOnly visitor cookie, and creates a `visits`
   row. If the same visitor was here in the last thirty minutes it resumes that row instead
   of creating a new one, so a refresh does not read as a second visit.
3. The user agent is checked against known email gateways and preview bots. A match sets
   `is_bot` but still records the row, because "your email gateway scanned it" is useful
   context and silently dropping data makes debugging impossible.
4. The viewer renders each page to a canvas and hands those elements to the tracker.
5. The tracker accrues time in 500ms ticks, but only while the tab is visible, the window
   has focus, and there has been input within the last sixty seconds. An IntersectionObserver
   attributes each tick to whichever page occupies most of the viewport.
6. Every ten seconds, and on `pagehide`, the accumulated time is flushed to
   `/api/track/:visitId` via `sendBeacon`.
7. The ingest endpoint re-validates the share token, then calls `record_engagement`, which
   does the increments in SQL so concurrent beacons cannot clobber each other. Once a visit
   crosses three seconds of visible time it is marked `is_qualified`.
8. The dashboard counts only visits that are both non-bot and qualified.

## Security model

Public viewers never touch Postgres directly. The viewer loader and the ingest endpoint are
the only two callers of the service-role client, and both authorise by share token before
doing anything. Every other query runs through the request-scoped client under RLS, where a
row is visible only to the profile that owns the proposal it belongs to.

Auth uses `getUser()` rather than `getSession()`. `getSession()` trusts the cookie contents;
`getUser()` verifies the JWT with Supabase. On routes that gate other people's proposal data
that difference matters.

PDFs live in a private storage bucket. The viewer gets a one-hour signed URL, never a public
one. Viewer IPs are salted and hashed before storage, and the raw IP is never written.

## Decisions worth revisiting later

**Client-side PDF rendering.** Fast to build, no worker infrastructure. The costs are mobile
performance on long documents and the fact that the whole file reaches the browser, so
per-page gating is impossible. Move to server-side rasterisation when either becomes a real
complaint.

**Aggregation in TypeScript.** `summaries.ts` pulls rows and reduces them in memory. Fine at
MVP volume and much easier to read than the equivalent SQL. Push it down when a single
account has thousands of visits.

**Rules-based intent scoring.** `intent.ts` is deterministic and explainable, and the reasons
it emits are the actual product. Replace the weights with something learned only after there
is outcome data to learn from, and keep emitting reasons either way.
