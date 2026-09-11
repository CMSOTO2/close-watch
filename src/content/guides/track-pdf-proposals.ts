import type { Guide } from './types'

export const guide: Guide = {
  slug: 'track-pdf-proposals',
  title: 'How to Track a PDF Proposal',
  description:
    'An emailed PDF cannot be tracked, and nothing embedded in the file changes that. Send it as a link instead. Three ways to do that, and what each one can see.',
  dek: 'You cannot track a PDF attachment. You can track a PDF you send as a link, and the three ways of doing that see very different amounts.',
  datePublished: '2026-09-11',
  dateModified: '2026-09-11',
  body: `You cannot track a PDF proposal sent as an email attachment, and nothing you embed in the file changes that reliably. To track a PDF proposal, send it as a link: upload it to a tracking tool such as Closewatch ($19 a month), DocSend or Papermark, and the tool records opens, time per page and return visits.

The mistake most people make is trying to change what is inside the PDF. What has to change is how the PDF is delivered.

## Why an attached PDF cannot be tracked

A PDF attachment is a copy of a file. Once it leaves your outbox, it sits on the client's computer or in their mail provider's storage, and opening it involves nobody but them and their PDF viewer. There is no server for the open to be reported to.

Email open tracking does not fill the gap. A tracking pixel reports that the email was rendered, not that the attachment was opened, and Apple Mail Privacy Protection, image blocking and corporate security scanners make even that unreliable. See [proposal tracking vs email open tracking](/guides/proposal-tracking-vs-email-open-tracking) for why.

## Why the tricks inside the PDF do not work

Two techniques get suggested repeatedly. Both fail in practice.

**A remote image or link that phones home.** The idea is to make the PDF fetch something from your server when it opens. Adobe Acrobat and Reader show a security warning when a document tries to connect to the internet, and many recipients click block, or never see the prompt because their IT policy suppresses it. Most other viewers never make the request at all.

**JavaScript embedded in the PDF.** Acrobat can run document JavaScript, but it is restricted and often disabled by corporate policy. The viewers most people actually use (the ones built into Chrome, Edge and Firefox, Apple Preview, the Gmail and Outlook previews) either ignore it or run a small subset for form fields, in a sandbox with no way to reach your server.

Even when either trick fires, it tells you the file was opened on some device at some point. It cannot tell you which pages were read, for how long, or whether the reader came back. And a PDF that tries to contact the internet looks exactly like the malicious PDFs security teams train staff to report.

## The three ways to track a PDF proposal properly

All three work the same way underneath: the client opens a web page, and the page records what happens.

### 1. A document tracking tool

Upload the PDF you already made, get a link, send the link. The tool displays the document in the browser and records each session.

**You see:** when it opened, total time, time on each page, return visits, and on most tools a count of distinct readers. Some also record downloads and prints.

**Examples:** Closewatch, DocSend, Papermark, HummingDeck.

**Best for:** anyone whose proposals already live in Google Docs, Word, Figma, Canva or InDesign, and who does not want to rebuild them.

### 2. A proposal builder

Build the proposal in the tool's own editor instead of exporting a PDF. Tracking comes with it, usually alongside templates, pricing tables and e-signatures.

**You see:** broadly the same reading data as a tracking tool, and often signing status too.

**Examples:** Proposify, PandaDoc, Qwilr, Better Proposals.

**Best for:** teams that want the editor, the templates and the signature in one place, and are willing to move their proposals into it. The catch is that last part: an existing designed PDF has to be rebuilt.

### 3. DIY: host the PDF and add analytics

Put the PDF on your own website or a file host and send the URL.

**You see:** that the file was requested, and roughly when. That is all. When a browser opens a PDF directly, it uses its built-in viewer, and your analytics script never runs inside it. You get a single hit per request, with no time spent, no pages read, and no way to separate the client from a security scanner that fetched the link on arrival.

**Best for:** confirming that a link was clicked at all, at no cost. Google Drive and Dropbox links fall into the same bucket: they can show views or downloads in some plans and setups, not reading.

## Side by side

| | Tracking tool | Proposal builder | DIY hosted PDF |
|---|---|---|---|
| Keep your existing PDF | Yes | No, rebuild it | Yes |
| Opened, and when | Yes | Yes | Roughly |
| Time on each page | Yes | Yes | No |
| Return visits | Yes | Yes | Unreliable |
| Filters security scanners | Varies, ask | Varies, ask | No |
| Templates and e-signature | Rarely | Yes | No |
| Typical cost | Free to $65/month | $13 to $49 per user/month | Free |

## The trade-off of sending a link

A link is not always the easier thing to receive.

Some procurement teams and some older clients want an attachment they can file, and a few corporate filters are wary of links to domains they have not seen before. If a client asks for the file, let them have it: most tracking tools include a download button. A download is itself a useful signal, but after that the copy on their machine is as untracked as any attachment.

Tracking also cannot see what happens off the page. A proposal printed and discussed in a meeting shows up as a print, not as the forty minutes of discussion.

## How to set it up with Closewatch

1. Export your proposal as a PDF from whatever you made it in.
2. Upload it to Closewatch. It guesses which page is pricing, which is the summary and so on from the text, and you correct anything it got wrong.
3. Copy the share link and send it in place of the attachment.
4. Get an email the first time a real person reads it.
5. Before following up, check which pages they read and how long they spent on pricing.

Closewatch only counts a visit after three seconds of visible attention, and excludes known bots and link-preview fetchers, so a security gateway opening every link on arrival is not reported as your client. The recipient needs no account and no plugin. The viewer tells them in one line that the sender can see opens and pages read.

It is $19 a month, flat, and two read proposals can be live at once on the free plan. It does not build proposals or collect signatures; if you need those as well, a builder like Proposify or PandaDoc will suit you better.

## Frequently asked questions

### Can you tell if someone opened a PDF you emailed?

No. A PDF sent as an attachment gives you no signal when it is opened, because opening it involves only the recipient's own device. Email open tracking reports the message being rendered, not the file. The only reliable way to know is to send the PDF as a link through a tool that records the visit.

### Can I add tracking to a PDF file itself?

Not reliably. Adobe Reader warns before a document contacts the internet and often blocks it under corporate settings, and the browser, Apple Preview and email preview viewers most people use never let a PDF reach an outside server. Even when they fire, they only report that the file was opened, not what was read, and they look like the techniques used in malicious PDFs.

### Does Google Drive show who viewed my PDF?

Only in limited cases, and only views, not reading. Drive's activity view depends on the account type and sharing settings, and it does not show time spent, pages read or return visits. It answers whether the link was opened, which is a much smaller question than whether the proposal was read.

### Will the client know the PDF is being tracked?

With a tracking tool, the client opens a web page instead of a file, which most people notice. Closewatch goes further and says so in one line on the viewer, with a link to exactly what is recorded. Being upfront costs nothing, and tracked document links have been standard in sales for years.

### Does the client need an account to open a tracked PDF?

Not on Closewatch, and not on most tracking tools. The link opens in any browser, on desktop or phone, with no sign-up, plugin or app. Some tools let the sender require an email address before viewing, which adds friction and is worth leaving off for proposals.

### Can I still let the client download the PDF?

Yes. Closewatch shows download and print buttons on the viewer and records when either is used, since taking a proposal offline is a meaningful signal in itself. Anything that happens to the downloaded copy afterwards is invisible, the same as an attachment.
`,
}
