# Browsers

Two surfaces with completely different obligations, and conflating them is the mistake to
avoid.

## The viewer is not negotiable

`/p/:token` is opened by someone else's client, on whatever they happen to be holding,
usually from an email, often on a phone. They did not choose this product and will not
install anything for it. A proposal that does not open is a deal the sender loses, and they
will blame the tool that promised to tell them who read it.

So the viewer has no browser requirements and never will. It must never show a "please use
a different browser" notice, never gate on a feature check, and never degrade in a way the
reader can see. If something there only works in some browsers, it does not ship.

It is also the lighter path, which helps: the viewer calls `getPage` and `render` and
nothing else. The text extraction that causes the trouble below is not on it.

## The app is allowed to be a bit fussier

The signed-in side is used by the person paying, usually at a desk, and can lean on more.
It still has to work everywhere; it is just allowed to be better in some places than
others.

## What actually degrades today

**Automatic page tagging, on WebKit.** Uploading reads the text of every page with pdfjs to
guess which page is pricing, which is scope, and so on. On WebKit that extraction can fail
partway. When it does, the upload still completes and the pages arrive untagged — the owner
picks a section per page, exactly as they did before the classifier existed.

Nothing else is known to differ. The upload itself, the dashboard, the tracking and the
viewer behave the same everywhere.

**Say "WebKit", not "Safari", and mean it.** Every browser on iOS is WebKit underneath
because Apple requires it, so Chrome and Firefox on an iPhone are Safari's engine wearing
somebody else's icon. Telling an iPhone user to switch browsers is advice that cannot
work, and offering it makes the product look like it does not understand its own platform.
The honest version of that sentence is "use a computer for this part", not "use Chrome".

## What is established, and what is not

Established:

- Uploading worked on iOS before `3eeaf32` (2026-09-01) and stopped after it. That commit
  replaced a `numPages` read with a walk of every page calling `getTextContent`, so text
  extraction is the trigger.
- The same file uploads fine from a desktop Chrome.
- The viewer never calls `getTextContent`, so none of this touches the reader.

Not established, and worth saying plainly rather than guessing at again:

- **Which** pdfjs call fails on WebKit. Two theories have already been wrong.
  `Promise.withResolvers` was ruled out by "it worked a few days ago" — a missing API does
  not heal. Routing the worker through our own module to polyfill its scope turned out to
  break the dev server and fix nothing.
- Whether desktop Safari fails against production. The only Safari failure observed so far
  was against the dev server, and that one has a dev-only explanation (below).

The failure is logged as `[upload] page text extraction failed` with the original error
attached. That console line, from a device where it actually happens, is what would settle
it. Remote-inspect an iPhone from a Mac: iPhone Settings → Apps → Safari → Advanced → Web
Inspector on, open the site in Safari on the phone, plug it in, then Mac Safari → Develop →
the phone. Only Safari can be inspected this way; the other iOS browsers cannot, which is
its own small joke given they are the same engine.

## A dev-only symptom that looks like the bug

Safari against `pnpm dev` always logs this:

```
Cannot load http://localhost:3000/@vite/client due to access control checks.
Importing a module script failed.
Warning: Setting up fake worker.
```

Vite injects an import of `/@vite/client` into the pdfjs worker file in dev, and WebKit
refuses that import inside a module worker. pdfjs falls back to running the worker on the
main thread. It is noise: the production build carries no such import, and the fallback
works. Do not go chasing it, and do not let it stand in for a real reproduction.

The Cloudflare RUM errors in the same console are the analytics beacon rejecting a
`localhost` origin. Also noise.

## What was tried and dropped

Pacing the extraction on WebKit — a time budget, a yield between pages, periodic
`doc.cleanup()` — was written and then removed. Two reasons, and the second is the real
one.

Playwright's WebKit reads all eighty pages of the reference document in under a second and
matches Chromium character for character, so the engine is not the problem and there was
nothing to optimise *for*. That left the theory that a phone's memory ceiling and main
thread watchdog are what differ, which is plausible, untested, and not something any
emulator here can exercise. Tuning against a cause nobody has confirmed buys slower
uploads everywhere and a pile of code that cannot be justified when someone asks why it is
there.

So the loop is the same in every browser, it keeps whatever it read, it never throws, and
Safari gets a sentence on the upload form instead. If the real error ever turns up in a
console, revisit with evidence.

## Rules

1. The viewer gets no browser requirements, ever.
2. Anything on the upload path that needs more than a page count degrades rather than
   throws. The page tagger is a convenience; the upload is the product.
3. Do not tell anyone on iOS to change browsers. There is only one engine there.
4. Do not put a browser recommendation on a marketing page. "Works best in Chrome" reads as
   "half-built" to the person deciding whether to trust it with a client relationship.
