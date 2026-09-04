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
  constants.ts                shared constants (upload caps, bucket, sections, TTL, query keys)
  styles.css                  the whole design system: raw palette -> shadcn tokens, both themes
  router.tsx                  router + query client wiring
  lib/
    pdf.ts                    pdfjs worker setup, shared by viewer and upload
    local-date.ts             dates that survive the SSR/browser timezone split (see below)
    supabase/
      client.ts               browser client (publishable key)
      server.ts               request-scoped client + admin client
      types.ts                schema types, regenerate with the Supabase CLI
    proposals/
      create.ts               server fn: upload PDF, create proposal
      detail.ts               server fn: single proposal for the owner (incl. owner name)
      mutations.ts            server fns: share links, page sections, won/lost/reopen, delete
      link-status.ts          live vs revoked vs expired, and how they are counted
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
    brand-mark.tsx            the mark and wordmark, drawn as SVG
    account-menu.tsx          avatar disclosure: signed-in email, settings, sign out
    page-container.tsx        the single 1280 shell every page centres on
    theme-toggle.tsx          light/dark toggle + the pre-paint script
    toast.tsx                 provider and hook; neutral / good / danger
    confirm-dialog.tsx        modal used for destructive actions
    legal-page.tsx            shared chrome for the privacy policy and terms
    pdf-viewer.tsx            client-side pdfjs renderer + download/print toolbar
    proposal-activity.tsx     per-proposal activity panel
    auth/                     sign-in form, Google button, field, zod schemas
    dashboard/                the proposal list, split by concern:
                                sorting / search / grouping / totals   pure, tested
                                since-last-visit  what moved since you last left
                                use-list-keys     j/k navigation
                                proposal-row, closed-row, client-group, list-controls,
                                summary-strip, heat-meter, copy-link-button
    landing/                  product shots, FAQ, scroll-into-view hook
    ui/button.tsx             the one shadcn primitive in use
  routes/
    index.tsx                 landing page
    privacy.tsx, terms.tsx    linked from the footer, sign-in, and Google's consent screen
    login.tsx                 login route shell (renders components/auth)
    auth.callback.ts          PKCE code exchange (magic link and OAuth)
    _authed.tsx              auth guard + app header
    _authed.dashboard.tsx     proposal list
    _authed.settings.tsx      profile: sender name shown to recipients
    _authed.proposals.new.tsx     upload + create
    _authed.proposals.$id.tsx     proposal detail, share links, activity
    p.$token.tsx              public viewer
    api/track.$visitId.ts     engagement ingest (+ fires the first-open email)
public/                       favicon.svg (theme-aware) + PNG fallbacks
scripts/generate-icons.py     redraws the PNG icons from the mark's geometry
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

## Design system

`styles.css` is the whole of it. A raw palette is declared first, then the shadcn semantic
tokens point at it with `var()`, so `.dark` redefines only the raw values and every
primitive follows. Dark is designed rather than inverted: surfaces warm toward brown-black
and the brass lifts to a legible gold.

Two rules that are easy to break:

- **Everything is layered on purpose.** Unlayered CSS outranks Tailwind's `@layer
  utilities`, so a bare `a { color: inherit }` silently beats `text-primary-foreground` on
  every link-styled button. New base and component rules go inside `@layer`.
- **Pairs are chosen, not inherited.** `--bar`/`--bar-lead` and `--mark-tile`/`--mark-ink`
  exist because a fill and a text colour want different things from one value: text has to
  clear AA on the page, a fill has to separate from its neighbour. Tokens that borrowed
  from each other produced a chart whose neutral bar out-shouted its emphasis bar, and a
  logo at 1.56:1 against its own tile.

## SSR runs in a different timezone from the browser

The server is a Cloudflare Worker, and workerd's clock is UTC. The browser is wherever the
owner is. Any date formatted with the ambient timezone therefore renders differently on the
two sides and tears hydration. `lib/local-date.ts` formats both sides in UTC and re-renders
in the real zone after hydration, through `useSyncExternalStore`'s server snapshot. Use it
for dates rather than `toLocaleDateString`.

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

`SECURITY DEFINER` helpers that RLS policies call live in the `private` schema, not in
`public`. Both halves of that are forced: they have to be definer because they read rows the
caller cannot see, and `authenticated` has to hold EXECUTE because a policy expression is
evaluated as the querying role. In `public` those two facts together publish the function as
a PostgREST RPC, which is how `sent_proposal_count` briefly let a signed-in user read another
account's pipeline size given a uuid. Revoking EXECUTE is not the fix — it disables the
policy and every insert fails. Moving the function out of the exposed schema is. The rule is
not that definer functions are dangerous, it is that a definer function in `public` is a
public API whether or not anyone meant to publish one.

Sign-in carries a destination through the round-trip, and that destination is attacker
controlled, so `safeNext` in `src/lib/auth-redirect.ts` is a boundary rather than a
convenience. It rejects anything that is not a path on this origin, and specifically
rejects `//evil.example` and `/\evil.example`, which read as paths to a naive check and as
another origin to the browser. That is the open redirect, and it is worth a test file of
its own because the failure is invisible: the redirect works, it just works for somebody
else. The destination rides in a short-lived cookie rather than in the Supabase redirect
URL — a query string there has to match the project's redirect allow list, and when it does
not, Supabase falls back to the Site URL without the code and sign-in breaks outright.

`SECURITY DEFINER` Postgres functions have `EXECUTE` revoked from `anon` and `authenticated`
so PostgREST does not expose them as RPCs (`handle_new_user`, and `rls_auto_enable`, the
event-trigger that auto-enables RLS on new tables). `record_engagement` is definer too but is
only ever called by the ingest endpoint through the service-role client.

## Decisions worth revisiting later

**pdfjs behaves differently on WebKit, and only the upload path cares.** The recipient
viewer calls `getPage` and `render`; the upload form additionally walks every page calling
`getTextContent` to guess page sections, and that is the part that fails on WebKit. It
degrades to untagged pages rather than throwing, because the tagger is a convenience and
the upload is the product. `src/lib/promise-with-resolvers.ts` polyfills an API pdfjs v6
calls unguarded in class fields; it was not the cause of that failure but it is a real gap
below Safari 17.4. See [BROWSERS.md](BROWSERS.md) for what is established and what is
still guesswork.

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

Two of its rules look like arbitrary constants and are not. Both were added after a real
80-page proposal opened once for 43 seconds came back warm, on reasons that were entirely
"Printed it" and "Downloaded a copy".

- **`DEPTH_PAGE_CAP` caps the divisor at twelve pages.** Depth is engaged time per page, and
  dividing by the true page count is right up to a point and absurd past it: at 45s a page an
  80-page document needed an hour of reading before it counted as read closely. Nobody spends
  that, so on long documents the depth signal was dead and the score fell to whatever the
  forward and offline signals said. Twelve is where a proposal's argument tends to end and its
  appendices begin. Removing the cap does not make the score stricter, it makes long proposals
  unscoreable.
- **Printing and downloading are capped together at 20.** Separately they were 18 and 15, and
  33 clears the warm floor of 30 on its own, so someone who saved and printed a document they
  had barely read came back warm on no reading at all. They are two halves of one act.

A third constant lives in `classify.ts`. **`PRICING_SPREAD_SHARE` demotes density-only pricing
pages** when they run to more than a quarter of a document of eight pages or more. Amounts
beside short labels are a price table on one page and a rate card across thirty; the same
80-page proposal came back with 30 pages tagged pricing, which made "time on pricing" mean
time on the numeric half of the deck. Pages that name a pricing word are never demoted,
because the owner's own headings are better evidence than the classifier is.
