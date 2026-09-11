import type { Guide } from './types'

/**
 * DRAFT: deliberately not registered in index.ts or the sitemap.
 *
 * Every other guide describes behaviour; this one states facts about data
 * handling that a reader may rely on, so the owner reads it against /privacy
 * and /dpa before it goes live. One question in particular is flagged for a
 * qualified opinion rather than answered here: whether the one-year `cw_vid`
 * return-visit cookie needs consent under ePrivacy/PECR. The page states what
 * the cookie does and does not claim either way.
 *
 * To publish: import it in index.ts, add it to GUIDES, and add its path to
 * routes/sitemap[.]xml.ts.
 */
export const guide: Guide = {
  slug: 'is-proposal-tracking-legal',
  stage: 'reading',
  title: 'Is Proposal Tracking Legal, and Does the Client Know?',
  description:
    'Tracking views of a proposal you sent is standard practice and generally lawful. What varies is disclosure and data handling, especially under the GDPR in the UK and EU.',
  dek: 'The question every tracking tool avoids. What is recorded, what the client is told, and where the law actually bites.',
  datePublished: '2026-09-11',
  dateModified: '2026-09-11',
  body: `In most places, yes: seeing when a proposal you sent was opened is standard sales practice and generally lawful. What varies is how the data is handled and whether readers are told. In the UK and EU the GDPR applies to what is recorded about readers. Closewatch tells every reader on the page, and stores IP addresses only as a salted hash. This is not legal advice.

Many tools answer "does the client know?" with a reassuring no. That is the wrong thing to be proud of, and it is the part of this question that matters most.

## The tracking is not the legal question. The data is.

Knowing that a document you sent was opened is not, on its own, unusual or unlawful. Read receipts, delivery confirmations and document portals have done versions of it for decades.

The legal questions come from what gets recorded about the person reading: their IP address, their device, how long they spent, and whether it is tied to their name. Those are personal data in many jurisdictions, and personal data comes with rules about telling people, keeping it no longer than needed, and letting them object.

## What changes in the UK and EU

The GDPR, and the UK's version of it, applies when you process personal data about people there, and a reader's IP address and reading behaviour can count. A few consequences follow.

**Someone has to be responsible.** When you send a proposal through a tracking tool, you decide who receives it and why, which makes you the controller of the readers' data. The tool is your processor, acting on your instructions. Closewatch sets this out in its [data processing agreement](/dpa), which applies to every account.

**You need a lawful basis.** For tracking engagement with a business proposal sent to a business contact, senders commonly rely on legitimate interests. Whether that fits your situation is for you, or your adviser, to decide.

**People should be told.** Transparency is a core principle, which is the strongest argument for disclosing tracking on the document itself.

**Cookies have their own rules.** Separate laws (the ePrivacy rules in the EU, PECR in the UK) govern storing identifiers on someone's device. Closewatch sets one first-party cookie on a reader's browser, holding a random identifier, so that a return visit is counted as the same reader rather than a new one. It lasts a year and cannot be read by JavaScript. Whether a cookie like that needs consent in your circumstances is a question for your own advice.

Some industries, including legal, healthcare and the public sector, may carry stricter rules again.

## Does the client know?

On most tracking tools, not unless you tell them. The link opens a document, and nothing on the page mentions that the visit is being recorded.

Closewatch does it differently, and on every link: one line above the first page reads "This document is tracked. The sender is told when it is opened, which pages are read, and whether it is downloaded or printed", followed by a link to exactly what is recorded. It is a single line that scrolls away with the page, not a banner, and there is no setting that hides it.

The reasoning is simple. A reader who finds out later that they were tracked without being told stops trusting the sender. A reader told up front mostly does not mind, because a view count on a document they were sent is not private in the way their email is.

## What Closewatch records, exactly

When someone opens a Closewatch link, it stores:

- When the link was opened, when the reader was last active, and how many separate times they came back.
- How many seconds of visible attention each page received, and whether the last page was reached.
- Whether the PDF was downloaded or printed.
- The browser, operating system and device type, and the referring address if the browser sent one.
- A one-way salted hash of the IP address, truncated, and the country and city its network resolves to. The address itself is never stored.
- Whether the visit looked automated, so bots and link previews can be excluded.

It does not learn the reader's name or email address from the visit. The only name attached to a link is the one the sender typed, and additional readers appear as "Reader 2", "Reader 3". The page a reader is sent runs no analytics or advertising scripts. Twelve months after a visit, the hashed IP address, the city and the referring link are stripped automatically. The full list is in the [privacy policy](/privacy).

## What if a reader objects?

They can ask the sender to revoke the link, which stops any further recording immediately, or write to Closewatch directly, and the visits behind that link are removed. Links also stop working on their own 60 days after they are created.

## Is it ethical?

Tracked document links have been standard in sales for over a decade, and being told that a document you received was opened is not a privacy harm in the way reading someone's messages would be. Where it goes wrong is secrecy: tracking that is hidden, then revealed by a follow-up that knows too much.

The honest version costs almost nothing. Say it on the page, keep less than you could, and never mention the data in the follow-up. "I saw you spent four minutes on pricing" is the sentence that makes tracking feel creepy; offering payment terms without saying why does not.

## Where this answer runs out

This is a general explanation, not legal advice, and privacy law differs by country and sector. If your clients are in regulated industries, or you are unsure what disclosure your jurisdiction requires, ask someone qualified. As an account holder you are the one who decides who receives a link, so any disclosure obligation that applies to you is yours to meet.

## Where Closewatch fits

Closewatch tracks the proposal PDF you already send and shows you opens, time per page, return visits and new readers, with scanner and bot visits filtered out. It tells every reader that the document is tracked, stores IP addresses only as a hash, and deletes everything recorded against a proposal when you delete it. It is $19 a month, flat.

For what the reading data means once you have it, see [how to know if a client read your proposal](/guides/how-to-know-if-client-read-proposal).

## Frequently asked questions

### Is it legal to track if someone opened my proposal?

In most places, tracking views of a document you sent is lawful and common in sales. What matters legally is the personal data involved, such as IP addresses and reading behaviour, and how it is disclosed, kept and protected. In the UK and EU the GDPR applies. This is general information, not legal advice.

### Does the client know if I track my proposal?

On most tracking tools, no, unless you tell them. On Closewatch, yes: every link shows a line at the top saying the document is tracked and what the sender is told, with a link to exactly what is recorded. There is no setting to hide it.

### Do I need consent to track a proposal under the GDPR?

Not necessarily consent specifically, since the GDPR allows other lawful bases, and senders of business proposals commonly rely on legitimate interests. Cookie rules are separate and can require consent for some cookies. Which applies to you depends on your circumstances, so check with an adviser if your clients are in the UK or EU.

### What data does proposal tracking collect?

Typically when the document was opened, time spent on each page, return visits, device and browser type, and some form of network location. Closewatch also records downloads and prints, stores the IP address only as a salted hash, and does not learn a reader's name or email address from their visit.

### Is it ethical to track proposals without telling the client?

It is common, but it is the version most likely to backfire. A client who later realises they were tracked without being told tends to trust the sender less. Disclosing it on the document costs almost nothing, and most readers accept it without comment.

### Can a client stop their proposal views being tracked?

They can ask the sender to revoke the link, which stops recording immediately, or ask the tracking provider to remove the visits. With Closewatch, a reader can write in directly and the visits behind that link are deleted. Reading a downloaded copy offline is never tracked.
`,
}
