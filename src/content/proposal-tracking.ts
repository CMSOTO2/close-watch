import type { Guide } from './guides/types'

/**
 * The /proposal-tracking pillar: the page that defines the category the rest
 * of the site sells in, and links down to every guide.
 *
 * Shaped like a guide, and held to the same content rules (answer block under
 * 60 words, description at most 160 characters, five to eight FAQs), but not
 * one of them: it lives at the root, not under /guides, and has no stage. The
 * route renders the list of every guide under the body, grouped by stage, so
 * the links down stay complete as guides are added.
 *
 * Prices here are the same ones as in the two tool comparisons and in
 * components/compare/competitors.ts. Re-check them together.
 */
export const pillar: Omit<Guide, 'slug' | 'stage'> = {
  title: 'Proposal Tracking: See When Clients Open and Read Your Proposals',
  metaTitle: 'Proposal Tracking: See Who Reads Your Proposal',
  description:
    'Proposal tracking shows when a client opens your proposal, which pages they read, how long they spend and whether they come back. How it works, and its limits.',
  dek: 'What proposal tracking is, what it can and cannot tell you, and what to look for in a tool. Written by the people who make one, so read the limits section first.',
  datePublished: '2026-09-11',
  dateModified: '2026-09-11',
  body: `Proposal tracking replaces the email attachment with a link you control. When the client opens it, you see when, how long they spent, which pages they read, whether they reached your pricing, and how often they came back. Closewatch does this for $19 a month, flat, with proposals you have already made.

## What proposal tracking is

You upload a proposal, the tool gives you a link, and you send the link instead of the file. The proposal opens in the client's browser, served by the tracker, which records what happens while it is on screen.

That is the whole mechanism. Everything else is what the tool does with the data.

Proposal tracking is a post-send tool. It has nothing to do with writing or designing the proposal. Proposal builders such as Proposify, PandaDoc and Qwilr bundle creation and tracking together. Trackers such as Closewatch, DocSend and Papermark do only the second half, and work with whatever you already make. The trackers are compared in [DocSend alternatives](/guides/docsend-alternatives); a tracker against a builder is the subject of the [Proposify alternative](/vs/proposify) and [PandaDoc alternative](/vs/pandadoc) comparisons. See [how to track a PDF proposal](/guides/track-pdf-proposals) for why an emailed attachment cannot be tracked at all.

## What you can see

**Opens.** When the proposal was first opened, and every visit after that. See [how to know if a client read your proposal](/guides/how-to-know-if-client-read-proposal).

**Time, page by page.** Total time, and how it divides across pages. Far more useful than the open itself.

**Time on pricing.** Worth watching on its own, because it is where the number gets tested. See [what a long time on your pricing page means](/guides/time-spent-on-proposal-pricing-page).

**Return visits.** Whether they came back, and when. See [what it means when a client opens your proposal multiple times](/guides/client-opened-proposal-multiple-times).

**New readers.** Whether a browser that has never opened the link before appears, which usually means it was shared. See [how to tell if a client forwarded your proposal](/guides/did-my-client-forward-my-proposal).

**Downloads and prints.** Whether someone took it offline. See [can you tell if someone downloaded your proposal](/guides/can-you-tell-if-someone-downloaded-a-proposal).

Turning those into a decision about who to call is proposal analytics, a step past tracking. See [what proposal analytics is and what to measure](/guides/what-is-proposal-analytics).

![Closewatch attention report for a sample proposal: five opens, three readers, and time on each page, with ten minutes on pricing](/images/closewatch-attention-report-time-per-page-pricing.webp "Proposal tracking in practice: opens, readers, and time on each page. Sample data.")

## What proposal tracking will not tell you

Most pages about proposal tracking oversell it, so this section comes before the rest.

**It does not tell you who a new reader is.** A second browser opening your link usually means it was forwarded, but your contact on their phone looks the same. It is a strong hint, not a fact.

**It does not tell you why.** A 20-second visit can be a budget problem, a weak first page, or a phone call that interrupted them.

**It does not measure intent.** Someone can read every page closely and still choose a competitor.

**It can be fooled by machines.** Corporate email security gateways open links on arrival to scan them. A tool that does not filter them reports a scan as your client reading. Closewatch excludes known bots and link previews outright, counts time only while the page is visible and in use, and counts a visit only after three seconds of that.

## Proposal tracking vs email open tracking

Email open tracking fires a hidden image when the email renders. It tells you about the message, not the proposal, and it is unreliable: [Apple Mail Privacy Protection](https://www.apple.com/legal/privacy/data/en/mail-privacy-protection/) reports opens that never happened, and image blocking hides ones that did. Proposal tracking records the document itself. See [proposal tracking vs email open tracking](/guides/proposal-tracking-vs-email-open-tracking) for the full comparison.

## Who it is for, and who it is not

**It is for** consultants and agencies sending proposals worth enough that the timing and content of a follow-up matters, typically several thousand dollars and up. It is most useful where one person owns the pipeline and the proposal is likely to be read by more than one decision maker. See [proposal tracking for agencies](/proposal-tracking-for-agencies) and [proposal tracking for fractional executives](/proposal-tracking-for-fractional-executives).

**It is not for** teams that need the proposal built, approved and signed in one system, which is a proposal management problem, or for anyone sending many small quotes where no single follow-up is worth much thought.

## What to look for in a tool

- **Page-level data, not just an open flag.** Knowing it was opened is the least useful thing a tracker tells you.
- **Scanner and bot filtering.** Ask how the tool tells a scan from a read. If the vendor has no answer, the open counts are not worth much.
- **No account for the client.** Anything that makes a client sign up to read your proposal costs you replies.
- **Your format, as it is.** If your proposals are designed PDFs, check they are shown as designed rather than converted.
- **A clear answer on what the client is told.** Closewatch tells every reader, in one line above the first page, that the document is tracked.
- **Pricing shape.** Per-user pricing gets expensive for a small team in a way flat pricing does not.

For the tools themselves, see [the best proposal tracking software in 2026](/guides/best-proposal-tracking-software).

## Where Closewatch fits

Closewatch is proposal tracking for consultants and small agencies. Upload the PDF you already send, share the Closewatch link instead of the attachment, and see opens, time per page, pricing time, return visits, new readers, downloads and prints, scored cold, warm or hot with the reasons listed. It is $19 a month, flat, and free for two proposals being read at a time.

![The Closewatch dashboard: five open proposals ranked by intent, two hot, one warm and two cold, each with the signal behind it](/images/closewatch-proposal-dashboard-ranked-by-intent.webp "Every open proposal, ranked by who is reading it. Sample data.")

It is deliberately not a proposal builder. If you want templates, an editor and e-signature in the same tool, Proposify or PandaDoc will serve you better. To see the report before signing up, [try the proposal tracking demo](/demo) on a sample proposal.

## Frequently asked questions

### How does proposal tracking work?

You upload your proposal to a tracking tool and send the link it creates instead of attaching the file. When the recipient opens the link, the document is shown in their browser by the tool, which records the visit, the time on each page, and any return visits. Nothing is installed on the client's side.

### Can the client tell the proposal is being tracked?

On Closewatch, yes, by design: a line above the first page says the document is tracked and what the sender is told, with a link to exactly what is recorded. On many other tools nothing on the page mentions it, so the client only knows if the sender tells them.

### Does proposal tracking work with PDFs?

Yes, as long as you send the PDF as a link rather than an attachment. The tool displays the PDF in the browser and records the session, so the file itself does not change. An emailed PDF attachment cannot be tracked by any tool.

### How much does proposal tracking cost?

On vendors' pricing pages in September 2026: Papermark has a free plan; HummingDeck starts at $10 a month; DocSend at $10 per user a month, with its popular Standard plan at $45; Better Proposals at $13 and Proposify at $19 per user a month; Closewatch at $19 a month flat, with a free plan.

### Is proposal tracking the same as proposal analytics?

Closely related, not the same. Tracking is the mechanism that records what the client did with the proposal. Analytics is interpreting that record: which signals matter, what they predict, and when to follow up. Most tools do the first well and leave the second to you.

### Does the client need an account to open a tracked proposal?

Not on Closewatch or most tracking tools. The link opens in any browser on any device, with no sign-up, plugin or app. Some tools can require an email address before viewing, which names every reader but adds a step that costs replies.
`,
}
