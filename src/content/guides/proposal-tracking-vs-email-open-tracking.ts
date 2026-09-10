import type { Guide } from './types'

export const guide: Guide = {
  slug: 'proposal-tracking-vs-email-open-tracking',
  title: 'Proposal Tracking vs Email Open Tracking',
  description:
    'Email open tracking tells you a message was rendered. Proposal tracking tells you the document was read. Why the difference matters, and when the free pixel is enough.',
  dek: 'One measures the envelope. The other measures the letter. They get treated as the same product, and they are not.',
  datePublished: '2026-09-10',
  dateModified: '2026-09-10',
  body: `Email open tracking fires a pixel when your message renders, so it tells you the email was opened, not that the proposal was read. Proposal tracking serves the document itself from a link, so it records time spent, pages viewed and return visits. If you want to know whether the client read your pricing, only the second one answers that.

This page exists because the two get treated as the same product and they measure completely different events.

## How each one works

**Email open tracking** puts a 1x1 transparent image in the email body, hosted on the tracking service's server. When the client's mail app loads images, the request hits that server and gets logged as an open. Mailtrack, Streak, HubSpot Sales and Yesware all work this way.

**Proposal tracking** replaces the attachment with a link. The document is served in the browser by the tracking tool, which records the session directly: when it opened, how long it stayed open, which pages were viewed, and whether the same link is opened again later. Closewatch, DocSend and Papermark work this way, as do the tracking features inside Proposify and PandaDoc.

The first measures the envelope. The second measures the letter.

## Why email open tracking is less reliable than people think

Three things break it, and all three have gotten worse over the past few years.

**Apple Mail Privacy Protection.** On by default since 2021. Apple's servers pre-fetch every remote image in every message, whether or not the recipient ever opens it. Every email sent to an Apple Mail user can register as opened. These are false positives you cannot filter out from the outside.

**Image blocking.** Gmail and Outlook block remote images by default for many users and configurations. If the recipient never chooses to display images, a genuine open records as nothing. These are false negatives.

**Corporate security scanners.** Enterprise email gateways open messages and follow links on arrival to check them for threats. Your proposal can register as "opened" minutes after you sent it, by a machine, hours before a human sees it.

Between the false positives and false negatives, an open rate from pixel tracking is close to noise at the level of a single email. It has some value in aggregate across thousands of sends. For deciding whether to follow up on one proposal, it isn't usable.

## And the deeper problem

Even when it works perfectly, it measures the wrong thing.

You want to know whether the client read the proposal. Pixel tracking tells you the email containing the proposal was rendered on a screen. The client can open your email, glance at the subject, see there's an attachment, and close it. Green tick, no information.

## Side by side

| | Email open tracking | Proposal tracking |
|---|---|---|
| What it measures | Message rendered | Document read |
| Time spent reading | No | Yes |
| Which pages were read | No | Yes |
| Pricing section viewed | No | Yes |
| Return visits | Weak signal at best | Yes |
| Broken by image blocking | Yes | No |
| False opens from Apple MPP | Yes | No |
| Affected by security scanners | Yes | Filtered by tools that check for it (ask before you buy) |
| Works with an attached PDF | Only tracks the email | No, you send a link instead |
| Cost | Free to about $10/month | Roughly $13 to $49/month |

## When email open tracking is enough

Not everything needs the heavier tool.

If you send low-value quotes at volume and just want a rough sense of whether your emails are landing, pixel tracking is free and fine.

If the concern is deliverability rather than engagement, it answers the question well enough.

If your clients are the kind who won't click a link from an unfamiliar domain, an attachment plus a pixel may be the practical option.

## When you need proposal tracking

When the deal is worth enough that the timing of your follow-up matters.

When you want to know which sections landed, so the follow-up can be about something specific rather than "just checking in."

When return visits matter to you, and they should: reopening a proposal is one of the strongest positive signals a prospect gives you without saying anything.

When you need to know whether they looked at pricing before you decide how to respond to silence. See [how to know if a client read your proposal](/guides/how-to-know-if-client-read-proposal) for how to read that pattern.

## Can you use both?

Yes, and it's a reasonable setup. Pixel tracking on the covering email tells you roughly whether it arrived and was seen. The tracked link tells you what happened to the document. The two answer different questions and don't conflict.

## What about read receipts?

A third option, and the weakest. Outlook and some Gmail accounts can request one, the recipient gets a prompt, and most decline. Many mail clients suppress the prompt entirely. Even a returned receipt only confirms the email was opened.

Treat read receipts as unavailable rather than unreliable.

## Where Closewatch fits

Closewatch is proposal tracking, not email tracking. You upload the proposal you've already made, share the Closewatch link instead of attaching the file, and see opens, time spent, pages viewed, return visits and pricing-section views. $19 a month, flat, with two proposals free to send and have read at a time.

It doesn't do email open tracking, and there would be little point adding it: the pixel measures a problem this product doesn't try to solve.

## Frequently asked questions

### Does email open tracking work if the client blocks images?

No. Pixel-based tracking depends on the mail client loading a remote image. Gmail and Outlook block remote images by default in many configurations, so genuine opens go unrecorded. Apple Mail Privacy Protection creates the opposite problem by loading every image automatically and reporting opens that never happened.

### Can I tell if someone opened a PDF attachment?

No. A PDF sent as an attachment gives no signal once it leaves your outbox. Email open tracking only records the message being rendered, not the file being opened. To know whether the document itself was read, you have to send it as a tracked link instead.

### Is proposal tracking more accurate than email open tracking?

Yes, because it records the document session directly rather than inferring it from a loaded image. The main accuracy question that remains is whether the tool filters automated opens from corporate email security scanners, which is worth asking any vendor before you buy. Closewatch does this by requiring three seconds of genuine visible attention before a visit counts.

### Do I need both?

Usually not. If the deal size justifies proposal tracking, that covers the question you actually care about. Pixel tracking on the covering email adds a rough deliverability check and little else.
`,
}
