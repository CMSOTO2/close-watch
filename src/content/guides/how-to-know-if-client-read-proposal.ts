import type { Guide } from './types'

export const guide: Guide = {
  slug: 'how-to-know-if-client-read-proposal',
  title: 'How to Know If a Client Read Your Proposal',
  description:
    'Four ways to tell whether a client opened your proposal, ranked by what actually works. A tracked link shows opens, time spent, pages read and return visits. An emailed PDF shows nothing.',
  dek: 'Four methods, ranked by what actually works, and why an emailed PDF gives you nothing at all.',
  datePublished: '2026-09-10',
  dateModified: '2026-09-11',
  body: `The reliable way is to send the proposal as a tracked link instead of an email attachment. A tracking tool then shows you when the client opened it, how long they spent, which pages they read, whether they reached the pricing section, and how many times they came back. An emailed PDF gives you none of this: once it leaves your outbox, it is a file on someone else's computer.

Everything else is guesswork, and most of it is worse guesswork than people realize.

## The four options, ranked

### 1. Tracked proposal links

You upload the proposal and share a link instead of the file. When the client opens it, the page loads from your tracker, which records the session.

What you get: the moment it was opened, total time spent, time per page, return visits, and whether they reached pricing. Some tools notify you in real time.

What you do not get: certainty about who is behind the click if the link circulates. A tool can tell you a link was opened by a second distinct browser, a strong hint it was forwarded, but not who that second reader was. Good tools are upfront about that limit instead of dressing an inference up as a fact.

This is the only method that tells you what was actually read rather than what was received.

### 2. Email open tracking

A pixel embedded in the email fires when the message renders. Mailtrack, Streak, HubSpot and Yesware all work this way.

The problem is that it tracks the email, not the proposal. A client can open your message, see the attachment, and never open it. You get a green tick and learn nothing about the document itself.

It also breaks constantly. Apple Mail Privacy Protection pre-loads every remote image whether or not the message is ever opened, so it reports opens that never happened. Gmail and Outlook block remote images by default for many users, so real opens go unrecorded. Corporate security scanners open every message on arrival, hours before a person does.

Useful as a rough signal that your email did not bounce. Not a read receipt for a proposal. See [proposal tracking vs email open tracking](/guides/proposal-tracking-vs-email-open-tracking) for the full case.

### 3. Read receipts

Outlook and some Gmail accounts can request a read receipt. The recipient gets a prompt asking whether to send one.

Most people decline. Many mail clients suppress the prompt before the recipient ever sees it. And even a returned receipt only confirms the email was opened, not the attachment.

### 4. Analytics built into a proposal builder

If you build the proposal inside Proposify, PandaDoc or Qwilr, tracking comes with it. This works well, and it is the right answer if you also want templates, an editor and e-signatures in one place. See [Closewatch vs Proposify](/vs/proposify) for that trade-off in full.

The catch is that you have to build the proposal in their editor. If your proposals live in Figma, Canva, Google Docs or a designed InDesign PDF, moving them is real work for a small answer.

## Can you tell if someone read a PDF you emailed?

No. Once a PDF leaves your outbox as an attachment, it is a file on someone else's computer. There is no callback, no receipt, no open event. Nothing you embed in a standard PDF changes this reliably: a remote image meant to "phone home" on open is blocked by Adobe Reader and most modern viewers by default.

If you need to know whether a PDF was read, you have to change how you deliver it, not what is inside it: serve it as a link rather than an attachment.

## What the signals actually mean

Knowing it was opened is the boring part. The useful information is in the pattern.

**Opened once, under 30 seconds.** They skimmed for the price and stopped. Usually a budget mismatch, occasionally a bad first page.

**Opened once, several minutes, reached the end.** Genuine consideration. This is your best follow-up window and it closes fast.

**Opened, then opened again a couple of days later.** Someone is thinking about it, or has shown it to a colleague. A return visit is one of the strongest positive signals you get without the client saying anything, since nobody reopens a proposal they have mentally rejected.

**A link you sent to one person turns into two or three distinct readers.** Often the proposal is being circulated internally. Ask who else is involved in the decision, and you will usually be right, though the same person on a second device or a cleared browser looks identical, so treat it as a strong hint rather than a fact.

**Long time on the pricing page.** They are working out whether they can afford it or comparing you to a quote. Follow up with payment terms or scope options rather than more features.

**Never opened after four days.** Not a rejection. Most commonly the email got buried. Resend with a different subject line before you assume anything. See [how long to wait after sending a proposal](/guides/how-long-to-wait-after-sending-proposal) for the fuller timing case.

**Opened repeatedly but no reply.** Interest without authority, usually. Your contact likes it and cannot approve it alone.

## Should you tell the client?

Closewatch's answer is yes, and it does this for you by default: the viewer carries one quiet line above the first page saying the sender is told when the document is opened, which pages were read, and whether it was downloaded or printed, with a link to exactly what is recorded. It is a disclosure, not a banner, and it is on by default rather than something you have to remember to add.

The reasoning holds beyond this one product. Tracked document links are standard practice in sales and have been for a decade. Nothing about a view count is private to the recipient in the way message content would be. But recipients increasingly notice, and being upfront about it costs nothing. It also changes the conversation for the better: "let me know if the pricing page needs work" is a conversation you would have had anyway, just from the other end.

## How Closewatch tells a real read from a scanner

Ask this of any tool before you trust its numbers, because it is the difference between real data and a dashboard that flatters you. Corporate email security gateways open links automatically to scan them for threats, and an unfiltered tool will report that scan as your client opening the proposal.

Closewatch filters two ways: known bots and link-preview fetchers are excluded outright, and a visit only counts once it has held three seconds of visible attention on the page, the line between something fetching a page and someone reading it. Everything on the dashboard is built from qualified reads only.

## How to set this up with Closewatch

1. Make the proposal however you already make it: Google Docs, Figma, Canva, Word, InDesign, whatever produces a PDF.
2. Upload that PDF to Closewatch.
3. Send the Closewatch link in place of the attachment.
4. Get notified when it opens.
5. Check page-level engagement before you follow up.

Closewatch is $19 a month, flat, with no per-seat pricing, and does not require rebuilding the proposal in a new editor. Two proposals can be live and read at once on the free plan, with all the tracking and an email on first open; Solo adds emails when a client comes back, a new reader opens it, or it turns hot. If you want the proposal builder as well as the tracking, Proposify or PandaDoc will suit you better, and both start around $19 per user per month. See [pricing](/#pricing) for the full breakdown.

## Frequently asked questions

### How long should I wait before following up on a proposal?

Three to five business days if it has been opened, sooner if you see a return visit, since that is when the client is actively thinking about it. If it has not been opened after four days, resend rather than chase: the most likely explanation is that the email got buried, not that the client isn't interested.

### Does email open tracking tell me if they read the proposal?

No. It tells you the email was rendered, which is a different event. Apple Mail Privacy Protection reports opens that never happened, image blocking hides opens that did, and corporate scanners open everything automatically. It is a weak signal about the message and no signal at all about the document.

### Can I track a proposal without the client creating an account?

Yes. On Closewatch the link opens like any other web page: no account, no plugin, no app on the recipient's side. As far as they are concerned, you sent them a document.

### What if the client forwards my proposal to someone else?

Closewatch counts distinct readers on each link: a browser that has not opened it before, marked the first time it does. So the dashboard reports "opened by a second reader" rather than claiming a forward outright, because that is what was actually observed. You know who you sent the link to and the tool does not, so the inference is yours to make, but when one link turns into three readers in an afternoon, it usually went round the room.

### Is it worth paying for proposal tracking if I only send a few proposals a month?

If a single proposal is worth more than a few hundred dollars, knowing whether it was read changes when and how you follow up, and that changes close rates. Below that value, and at high volume with small deal sizes, the honest answer is probably not.
`,
}
