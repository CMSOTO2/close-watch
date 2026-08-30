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
  constants.ts                shared constants (upload caps, bucket, sections, query keys)
  router.tsx                  router + query client wiring
  lib/
    pdf.ts                    pdfjs worker setup, shared by viewer and upload
    supabase/
      client.ts               browser client (publishable key)
      server.ts               request-scoped client + admin client
      types.ts                schema types, regenerate with the Supabase CLI
    proposals/
      create.ts               server fn: upload PDF, create proposal
      detail.ts               server fn: single proposal for the owner (incl. owner name)
      mutations.ts            server fns: share links, page sections, delete
    analytics/
      bots.ts                 email-scanner detection, UA parsing
      tracker.ts              viewer-side engagement tracking (incl. download/print)
      begin-visit.ts          server fn: opens a viewing session
      summaries.ts            server fn: dashboard aggregation
      proposal-analytics.ts   server fn: per-proposal activity, download/print counts
      intent.ts               buying-intent scoring (download/print are signals)
    notify/
      first-open.ts           server-side first-qualified-open email (Resend)
    profile.ts                server fns: read/update the sender's display name
    auth.ts                   session lookup
  components/
    auth/
      login-form.tsx          sign-in/up form: password, magic link, Google
      google-button.tsx       Google OAuth button
      auth-field.tsx          shared input + error line
      validation.ts           zod schemas for the auth forms
    pdf-viewer.tsx            client-side pdfjs renderer + download/print toolbar
    proposal-activity.tsx     per-proposal activity panel
    confirm-dialog.tsx        modal used for destructive actions
  routes/
    index.tsx                 landing
    login.tsx                 login route shell (renders components/auth)
    auth.callback.ts          PKCE code exchange (magic link and OAuth)
    _authed.tsx               auth guard + header/sign out
    _authed.dashboard.tsx     proposal list
    _authed.settings.tsx      profile: sender name shown to recipients
    _authed.proposals.new.tsx     upload + create
    _authed.proposals.$id.tsx     proposal detail, share links, activity
    p.$token.tsx              public viewer
    api/track.$visitId.ts     engagement ingest (+ fires the first-open email)
supabase/migrations/          schema, RLS, ingest fn, share-link lock, bucket limit,
                              first-open flag, definer-function lockdown
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
9. Download and print are recorded as their own `events` rows (the viewer's toolbar buttons,
   plus the browser's own print). They show on the proposal, and both feed the intent score —
   taking a proposal offline is a deliberate buying signal.

## The first-open email

On the same qualifying flush, the ingest endpoint calls `notifyFirstOpen`. It sends the
owner one email the first time a real, non-bot, qualified open happens. Once-only is enforced
by claiming `proposals.first_open_notified_at` atomically (`update … where it is null`), so
concurrent beacons cannot double-send; a failed send rolls the claim back so a later open
retries. The whole thing is best-effort inside a `try/catch` — a notification hiccup never
breaks the viewer's 204. It is gated on `RESEND_API_KEY` and does nothing until that is set,
which keeps local and CI runs silent. Resend is called over its HTTP API, so it works from
the Cloudflare Worker with no SMTP.

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

`SECURITY DEFINER` Postgres functions have `EXECUTE` revoked from `anon` and `authenticated`
so PostgREST does not expose them as RPCs (`handle_new_user`, and `rls_auto_enable`, the
event-trigger that auto-enables RLS on new tables). `record_engagement` is definer too but is
only ever called by the ingest endpoint through the service-role client.

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
