/**
 * What the /vs/… pages say about the products they name.
 *
 * Three rules govern everything in this file, and they are not stylistic.
 *
 * A comparison page is read by people who already use the other product. Every
 * claim here is one they can check in about ten seconds, so an unfair one costs
 * more than the page earns. `betterWhen` exists for that reason: it is the
 * honest case for the competitor, written to be genuinely persuasive rather
 * than as a straw man, and it is the reason the rest of the page is believable.
 *
 * Nothing here describes a feature Closewatch does not have. The comparison is
 * structural — a builder against a tracker, seats against a flat price — and
 * structure does not go stale in a month.
 *
 * Prices move. They carry a checked date, they are stated as a floor rather
 * than a promise, and each product links to its own pricing page so a reader
 * who cares can see today's number. Re-check them when the date below is more
 * than a couple of quarters old, or drop the prices rather than let them rot.
 * The same figures appear in the two roundup guides and in the pillar's FAQ;
 * change them everywhere at once.
 *
 * `intro`, `details` and `faqs` are markdown, rendered by the same component
 * as the guides, so they can link into the guide library in a sentence rather
 * than in a list of related links. `faqs` starts with the
 * "## Frequently asked questions" heading and uses ### for each question, the
 * same as the guides.
 */

export const PRICES_CHECKED = 'September 2026'

export type Competitor = {
  slug: 'proposify' | 'pandadoc' | 'docsend'
  /** The product's own name, spelled the way they spell it. */
  name: string
  /** Fills "…is a proposal builder", "…is a document platform". */
  category: string
  pricingUrl: string
  /** Stated as a floor. Never as "they cost X". */
  price: string
  /** The <title>. Carries "alternative", which is what gets typed. */
  title: string
  description: string
  socialTitle: string
  /** The small label above the H1. */
  kicker: string
  /** The H1. Carries the phrase the page is meant to rank for. */
  h1: string
  /** One sentence, on the card and under the H1. The whole argument. */
  wedge: string
  /** The argument under the fold, in markdown. */
  intro: string
  /** The honest case for them. Written to be convincing. */
  betterWhen: Array<string>
  /** The honest case for us. */
  usWhen: Array<string>
  /** Rows of the table. `them` is what they do, `us` is what we do. */
  table: Array<{ row: string; them: string; us: string }>
  /** Sections after the table, in markdown: how it works, price, switching. */
  details: string
  /** The FAQ, in markdown. See the note at the top of the file. */
  faqs: string
}

export const COMPETITORS: Record<Competitor['slug'], Competitor> = {
  proposify: {
    slug: 'proposify',
    name: 'Proposify',
    category: 'a proposal builder',
    pricingUrl: 'https://www.proposify.com/pricing',
    price: 'from around $19/user/mo',
    title: 'Closewatch vs Proposify: a Proposify alternative',
    description:
      'A Proposify alternative for designed PDFs. Proposify is a proposal builder with analytics attached; Closewatch tracks the proposal you already make.',
    socialTitle: 'Closewatch vs Proposify',
    kicker: 'Closewatch vs Proposify',
    h1: 'The Proposify alternative for proposals you already design',
    wedge:
      'Proposify asks you to write your proposals in Proposify. Closewatch tracks the one you already designed.',
    intro: `Proposify is a good product with a real cost of entry, and the cost is not the price. It is an authoring tool first: templates, a content library, a drag-and-drop editor, and analytics on the documents you build inside it. To get Proposify's analytics you have to move your proposals into its editor and keep them there.

For an agency that is often the wrong trade. Your proposals come out of InDesign, Figma, Docs or Canva, they carry your typography and your case studies, and they look like your work because you made them look like your work. Rebuilding that inside somebody else's editor to find out whether a client opened it is a large price for a small answer.

Closewatch is a Proposify alternative for that case, and only that case. It has no editor and will never ask you to adopt one. You upload the PDF you were about to email, you get a link per recipient, and everything after that is [proposal tracking](/proposal-tracking): who opened it, how long they spent on your pricing page, and whether it was forwarded to somebody who did not receive it from you.`,
    betterWhen: [
      'You want the proposal itself to be a template your whole team works from, with a content library so nobody rewrites the same case study twice.',
      'You need e-signature and approval steps inside the same tool that produced the document.',
      'Your proposals are largely text and would genuinely be better as a web document than as a PDF.',
      'You are standardising how a growing team writes proposals, which is a real problem an editor solves and a tracker does not.',
    ],
    usWhen: [
      'Your proposals are designed, they are a PDF, and the design is part of how you win work.',
      'You already know how to write a proposal. What you do not know is what happened after you sent it.',
      'You want to start this afternoon rather than migrate a library of templates first.',
      'You are two to fifteen people and paying for an authoring tool is hard to justify when one person writes every proposal.',
    ],
    table: [
      {
        row: 'Where the proposal is made',
        them: 'In their editor, from their templates',
        us: 'Wherever you make it now. Upload the PDF',
      },
      {
        row: 'What you change to start',
        them: 'Rebuild your proposals in the editor',
        us: 'Nothing. Send a link instead of an attachment',
      },
      {
        row: 'Reading signal',
        them: 'Section-level analytics on their documents',
        us: 'Page attention, pricing dwell, forwarding, prints',
      },
      {
        row: 'What it tells you to do',
        them: 'Shows you a chart',
        us: 'Scores intent and sorts your pipeline by it',
      },
      { row: 'E-signature', them: 'Yes', us: 'No. Sign wherever you sign now' },
      { row: 'Free plan', them: 'Trial', us: 'Yes, two proposals being read' },
    ],
    details: `## How Closewatch tracks a proposal without an editor

Closewatch starts where Proposify's editor would. You export the proposal as a PDF from whatever you designed it in, upload it, and type the name of the person it is going to. Closewatch gives you a link for that person, and you paste it into your own email where the attachment would have gone.

![The Closewatch new-proposal form, with a title, a client name, the person it is going to, a deal value and the proposal PDF](/images/closewatch-upload-proposal-pdf.webp "Setting up a proposal in Closewatch. Sample data.")

When the client opens the link, the PDF shows in their browser exactly as you designed it, with one line above the first page saying the document is tracked. Closewatch records the time spent on every page. It reads the text of each page when you upload, so it knows which one is pricing without you tagging it.

![Closewatch attention report for a sample proposal, showing ten minutes on the pricing page, two minutes on scope, and three readers](/images/closewatch-attention-report-time-per-page-pricing.webp "Time on each page of a tracked proposal, with the pricing page highlighted. Sample data.")

Proposify's analytics measure much the same thing: time in each section of a document built in Proposify. The difference between the two is not what gets measured. It is what you had to change to measure it.

## Proposify vs Closewatch on price

On [Proposify's pricing page](https://www.proposify.com/pricing) in September 2026, Basic is $19 per user a month billed annually, or $29 billed monthly, and Team is $41 per user a month billed annually. Both come with a 14-day trial and neither is free. Closewatch is $19 a month, billed monthly, for unlimited proposals, and free for two proposals being read at a time.

For one person on annual billing, the two cost the same. Proposify costs more as a team grows, because it is priced per user. Closewatch has a single login per account today, so if five people need to send from their own seats, Proposify is the one of the two that has them.

## Switching from Proposify to Closewatch

Nothing needs migrating. Proposals already sent from Proposify keep their tracking there until the deals close. For the next proposal, send the PDF you designed elsewhere, or export one from Proposify, and upload it to Closewatch.

What you give up is Proposify's: the template library, e-signature and approvals. If you use those every week, stay on Proposify. If you were rebuilding a designed PDF in Proposify only to see whether the client read it, [how to track a PDF proposal](/guides/track-pdf-proposals) explains why the PDF on its own tells you nothing, and what a tracked link records instead.

## Proposify, PandaDoc or DocSend?

They answer the same question three ways. Proposify and PandaDoc are builders: you write the proposal in them, and tracking comes with it. Closewatch is also a [PandaDoc alternative](/vs/pandadoc) for people who want the tracking without the contracts and signatures. DocSend is a tracker like Closewatch, built for every kind of document, and Closewatch is the [DocSend alternative](/vs/docsend) for people who only send proposals; [DocSend alternatives](/guides/docsend-alternatives) compares the trackers on price. For nine tools side by side, including where Closewatch loses, see [the best proposal tracking software in 2026](/guides/best-proposal-tracking-software).

To see Closewatch's proposal tracking before uploading anything, [try the demo](/demo). It runs on you: read a sample proposal, then open the report your reading produced.`,
    faqs: `## Frequently asked questions

### Is Proposify good?

Yes, for what it is built for. Proposify is a mature proposal builder with templates, a content library, e-signature, and document analytics from its entry plan. It suits a team that wants everyone writing proposals from the same templates. It suits you less if your proposals are designed elsewhere, because its tracking covers documents built in its editor.

### How much does Proposify cost?

On Proposify's pricing page in September 2026: Basic is $19 per user a month billed annually, or $29 monthly, and Team is $41 per user a month billed annually, or $49 monthly. Business is priced on request. There is a 14-day free trial and no free plan.

### Is Closewatch cheaper than Proposify?

For one person on annual billing, they are level at $19 a month, and Closewatch is also $19 billed monthly against Proposify's $29. Closewatch has a free plan, and Proposify has a 14-day trial. For a team, Proposify is priced per user while Closewatch is a flat price with one login.

### Does Closewatch have e-signature?

No. Closewatch tracks the proposal and stops there. Most people who use it already sign contracts in another tool and do not want to pay for signing twice. If you need the proposal and the signature in the same place, Proposify has both.

### Can I use Closewatch and Proposify together?

Yes, though most people settle on one. Some teams keep Proposify for proposals they build from templates and use Closewatch for designed ones, such as a rebrand pitch laid out in InDesign. Each tool tracks its own links, so the reading data stays in two places.`,
  },

  pandadoc: {
    slug: 'pandadoc',
    name: 'PandaDoc',
    category: 'an all-in-one document platform',
    pricingUrl: 'https://www.pandadoc.com/pricing/',
    price: 'from around $49/seat/mo',
    title: 'Closewatch vs PandaDoc: a lighter PandaDoc alternative',
    description:
      'PandaDoc is a document and e-signature platform priced per seat. Closewatch tracks the proposal PDF you already send, on a flat price.',
    socialTitle: 'Closewatch vs PandaDoc',
    kicker: 'Closewatch vs PandaDoc',
    h1: 'A lighter PandaDoc alternative for proposal tracking',
    wedge:
      'PandaDoc is a document platform with tracking in it. Closewatch is the tracking, without the platform.',
    intro: `PandaDoc solves a bigger problem than the one you probably have. It is a document platform: build the document, route it for approval, get it signed, sync it to the CRM, collect payment against it. Proposal tracking is one feature inside that, and the feature is fine.

The cost of that scope is that PandaDoc is priced and shaped for a sales team. Seats add up, the setup is a project rather than an afternoon, and a two-to-fifteen-person agency ends up paying platform money to answer a question that is not a platform-sized question.

Closewatch is a lighter PandaDoc alternative that answers the one question. You keep the PDF you already produce, you keep whatever you use to get things signed, and you get back a scored list of which client is actually reading and which one has gone quiet. If you outgrow that and need contracts, approvals and CRM sync, PandaDoc is a reasonable place to go.`,
    betterWhen: [
      'You need legally binding e-signature and an audit trail in the same tool that produced the document.',
      'Proposals are one of several document types you send, alongside contracts, SOWs and order forms.',
      'You have a sales team rather than a founder and two account leads, and per-seat pricing buys real collaboration.',
      'You want the proposal tied into a CRM so the pipeline updates itself.',
    ],
    usWhen: [
      'One or two people send every proposal and seats are pure overhead.',
      'You already have somewhere to get things signed and do not want a second one.',
      'The question you actually have is whether the client read it, not how to route it for approval.',
      'You want to be running today, not after a configuration project.',
    ],
    table: [
      {
        row: 'Scope',
        them: 'Documents, e-signature, workflow, CRM sync',
        us: 'What happened after you sent the proposal',
      },
      {
        row: 'Pricing shape',
        them: 'Per seat',
        us: 'Flat, and free for two proposals being read',
      },
      {
        row: 'Time to first answer',
        them: 'A setup project',
        us: 'Upload a PDF, send the link',
      },
      {
        row: 'Reading signal',
        them: 'Opens and time in the document',
        us: 'Page attention, pricing dwell, forwarding, prints',
      },
      {
        row: 'What it tells you to do',
        them: 'Notifies you it was viewed',
        us: 'Scores intent and shows its working',
      },
      { row: 'E-signature', them: 'Yes', us: 'No. Sign wherever you sign now' },
    ],
    details: `## What PandaDoc's tracking includes, plan by plan

PandaDoc spreads tracking across its plans. The free plan is for e-signature. Starter, from $19 per seat a month billed annually, adds real-time notifications when a document is viewed. Detailed document analytics start on Business, at $49 per seat a month billed annually. Those figures come from a public pricing tracker last verified in July 2026, and features move between plans, so check [PandaDoc's pricing page](https://www.pandadoc.com/pricing/) before you buy.

For a three-person agency that wants PandaDoc's analytics, that is $147 a month. Closewatch's proposal analytics are on every plan, including the free one: time on each page, time on pricing, return visits, new readers, downloads and prints. Solo is $19 a month, flat.

## How Closewatch tracks a proposal without the platform

With PandaDoc, the document is built in PandaDoc. With Closewatch, it is built wherever you build it now. Export the PDF, upload it, and send each person their own link. When they open it, the PDF appears as you designed it, with a line saying it is tracked, and Closewatch records the visit.

![What a client sees when they open a Closewatch link: the proposal as designed, download and print buttons, and a line saying the document is tracked](/images/closewatch-tracked-proposal-viewer-disclosure.webp "What the client sees. The tracking is disclosed above the first page. Sample data.")

Every visit feeds a score. Closewatch combines repeat opens, new readers, time per page, time on pricing, a return on a later day, and downloads and prints into one number from 0 to 100, labelled cold, warm or hot, with the reasons written next to it. The dashboard sorts every open proposal by that score, so the one to follow up today is at the top. The whole model, weights included, is in [how to score proposal engagement](/guides/how-to-score-proposal-engagement).

![The Closewatch dashboard: five open proposals ranked by intent, two hot, one warm and two cold, each with the signal behind it](/images/closewatch-proposal-dashboard-ranked-by-intent.webp "Every open proposal, ranked by who is reading it. Sample data.")

## Signing without PandaDoc

The part of PandaDoc people are most reluctant to give up is e-signature, and Closewatch does not replace it. If you sign a handful of documents a month, PandaDoc's own free plan covers signing. If you need more, a dedicated e-signature tool is priced on its own. DocuSign's Personal plan is $11 a month billed annually for one user, on [DocuSign's pricing page](https://ecom.docusign.com/plans-and-pricing/esignature) in September 2026. Plenty of agencies sign the contract that follows the proposal wherever their contracts already live.

## PandaDoc, Proposify or DocSend?

PandaDoc and Proposify are both builders, and Proposify is the narrower of the two: proposals rather than every document type. If a builder is what you want, the [Proposify alternative](/vs/proposify) page explains when Proposify is the better buy, and when Closewatch is. DocSend is a tracker, like Closewatch, and Closewatch is the cheaper [DocSend alternative](/vs/docsend) for proposals; the trackers are compared in [DocSend alternatives](/guides/docsend-alternatives). For the whole field, see [the best proposal tracking software in 2026](/guides/best-proposal-tracking-software).

If you run an agency, [proposal tracking for agencies](/proposal-tracking-for-agencies) covers what changes when there are nine proposals out across six clients. Or [try the demo](/demo) and see the tracking report before you sign up.`,
    faqs: `## Frequently asked questions

### Is PandaDoc actually free?

PandaDoc has a free plan, and it is for e-signature: upload a document and collect signatures, up to a limit on how many you send. Templates, the full editor, real-time view notifications and document analytics are on the paid plans, from $19 per seat a month billed annually. PandaDoc is free for signing, not for proposal tracking.

### Is DocuSign or PandaDoc cheaper?

For signing only, PandaDoc, because it has a free e-signature plan and DocuSign does not. For one paid user, DocuSign Personal at $11 a month billed annually costs less than PandaDoc Starter at $19. For a team, PandaDoc Starter at $19 per seat is below DocuSign Standard at $30 per user. DocuSign prices are from its pricing page in September 2026.

### Does PandaDoc track when a proposal is opened?

Yes. PandaDoc's Starter plan notifies you in real time when a document is viewed, and its Business plan adds detailed document analytics. Both cover documents sent through PandaDoc. A PDF you designed elsewhere and email as an attachment is not tracked by PandaDoc or by anything else.

### Is Closewatch a replacement for PandaDoc's e-signature?

No. Closewatch has no e-signature, contracts or CRM sync. It replaces PandaDoc's tracking, for people who have a proposal they like and already have somewhere to sign. If you need all of those in one tool, PandaDoc is the better choice.

### How long does Closewatch take to set up?

A few minutes. Upload the proposal PDF, type the name of the person it is going to, and copy the link into your email. There are no templates to build and nothing to connect, and the client needs no account to open it.`,
  },

  docsend: {
    slug: 'docsend',
    name: 'DocSend',
    category: 'a document sharing and tracking tool',
    pricingUrl: 'https://www.docsend.com/pricing/',
    price: 'from around $10/user/mo',
    title: 'Closewatch vs DocSend: a cheaper DocSend alternative',
    description:
      'DocSend is the brand in document tracking, priced per user with no free plan. Closewatch is narrower, scores intent, and starts free.',
    socialTitle: 'Closewatch vs DocSend',
    kicker: 'Honest comparison',
    h1: 'Closewatch vs DocSend',
    wedge:
      'DocSend does more than Closewatch and costs more than Closewatch. The question is whether you need the rest of it.',
    intro: `This is the honest one, because DocSend is in the same category rather than a different one. Upload a document, send a tracked link, see what the reader did. Dropbox [bought DocSend in 2021](https://techcrunch.com/2021/03/09/dropbox-to-acquire-secure-document-sharing-startup-docsend-for-165m/) for $165 million, it has been at this for years, and it does things Closewatch does not: data rooms, NDA gating before a reader gets in, file requests, and a whole practice around fundraising decks that has made DocSend the default in venture.

What that breadth costs is focus and money. DocSend is a general document tool used for proposals; Closewatch is a proposal tool. The difference shows up in what you get back. DocSend reports activity faithfully. Closewatch turns activity into a scored, sorted pipeline: which client to call today, and the specific reasons behind the number, so a score is an argument rather than a horoscope.

The other difference is the price and the front door. DocSend is priced per user with no free plan, so evaluating it is a purchase decision. Closewatch is free with all the tracking switched on, and the free plan does not count a proposal until a client opens it. You can put a real proposal through it this week and find out whether the answer is worth anything to you before you pay.

If you are choosing between several tools rather than these two, [DocSend alternatives](/guides/docsend-alternatives) compares six of them on price and fit, including where Closewatch is the wrong pick.`,
    betterWhen: [
      'You need a data room, or NDA acceptance before a reader can open the document.',
      'You are sending fundraising decks to investors, where DocSend is the format everyone already expects.',
      'You want one tool for every document your company sends, not one shaped around proposals.',
      'You are already deep in Dropbox and the billing and admin being in one place is worth real money.',
    ],
    usWhen: [
      'Proposals are the document that matters, and a general file-sharing tool is more than you need.',
      'You want a pipeline ordered by who to chase, not a list of documents with view counts.',
      'You want the reasons behind the score, because the reasons are what you act on.',
      'Per-user pricing with no free plan is a hard sell for a five-person agency, and Standard, the plan most teams end up on, is $45 a seat.',
    ],
    table: [
      {
        row: 'Built for',
        them: 'Any document, decks especially',
        us: 'Proposals, and nothing else',
      },
      {
        row: 'Reading signal',
        them: 'Opens, time per page, forwarding',
        us: 'The same, scored into one number with its reasons',
      },
      {
        row: 'How the list is ordered',
        them: 'By document',
        us: 'By intent, grouped under the client',
      },
      {
        row: 'Data rooms and NDA gating',
        them: 'Yes',
        us: 'No',
      },
      {
        row: 'Pricing shape',
        them: 'Per user',
        us: 'Flat, and free for two proposals being read',
      },
      { row: 'Free plan', them: 'No', us: 'Yes, two proposals being read' },
    ],
    details: `## Where DocSend's tracking and Closewatch's differ

DocSend and Closewatch both record each visit to a tracked document: when it was opened, how long the reader spent on each page, and whether they came back. The difference is what happens next. DocSend shows that activity per document. Closewatch scores each proposal from it, cold, warm or hot with the reasons listed, and sorts the dashboard so the proposal that needs a follow-up today sits at the top.

![The Closewatch dashboard: five open proposals ranked by intent, two hot, one warm and two cold, each with the signal behind it](/images/closewatch-proposal-dashboard-ranked-by-intent.webp "Every open proposal, ranked by who is reading it. Sample data.")

Closewatch also filters before it counts. Corporate email gateways open links on arrival to scan them, and a tracker that counts those reports a machine as your client. Closewatch excludes known bots and link previews and counts a visit only after three seconds of visible attention.

## How Closewatch shows a forwarded proposal

Both tools are built on a link per recipient. When a browser that has never opened a Closewatch link appears, Closewatch labels it Reader 2, Reader 3 and so on, next to the name of the person you sent it to, and on Solo it emails you when it happens. It calls this a new reader rather than a confirmed forward, because your contact on their phone looks the same. [How to tell if a client forwarded your proposal](/guides/did-my-client-forward-my-proposal) explains how to tell the two apart.

![Closewatch recent visits on a sample proposal: two readers the proposal was forwarded to, one who printed and downloaded it, and the named link it was sent on](/images/closewatch-forwarded-proposal-new-readers.webp "New readers on a forwarded proposal, and the named link each came through. Sample data.")

## What DocSend costs a small team

On DocSend's pricing page in September 2026: Personal from $10 per user a month, Standard from $45 per user a month, Advanced from $150 a month for three users, and Advanced Data Rooms from $180 a month, all billed yearly. There is no free plan, only a trial. A five-person agency on Standard pays $2,700 a year.

Closewatch is $19 a month flat, or $228 a year, and free for two proposals being read at a time. It has one login per account today, so that comparison holds for a team where one or two people send the proposals, which is most small agencies.

## Moving from DocSend to Closewatch

Nothing moves on its own, and nothing needs to. Leave the links you have already sent live in DocSend until those deals close, and send the next proposal through Closewatch. If you also use DocSend for investor decks or a data room, keep it for those. Closewatch only does proposals.

## DocSend, Proposify or PandaDoc?

If what you are really weighing is a proposal builder, the [Proposify alternative](/vs/proposify) and [PandaDoc alternative](/vs/pandadoc) pages cover those, and both explain when the builder is the better buy. [The best proposal tracking software in 2026](/guides/best-proposal-tracking-software) ranks nine tools by who each one suits. For the idea underneath all of them, read [what proposal tracking is and what it cannot tell you](/proposal-tracking), or [try the demo](/demo) and see the report a reader produces.`,
    faqs: `## Frequently asked questions

### Are DocSend and Dropbox the same?

No, but they are the same company. Dropbox bought DocSend in 2021, and DocSend is now a Dropbox product with its own plans and pricing, separate from Dropbox storage. Dropbox's own tracking for shared files, Send and Track, was discontinued in March 2025, so document tracking at Dropbox now means DocSend.

### Is there a free version of DocSend?

No. DocSend offers a free trial, not a free plan. Its cheapest plan, Personal, starts at $10 per user a month billed yearly. Papermark, HummingDeck and Closewatch all have free plans; they are compared in [DocSend alternatives](/guides/docsend-alternatives).

### What does DocSend do that Closewatch does not?

Data rooms, NDA acceptance before a reader can open a document, email verification of every viewer, and tracking for any kind of document, including investor decks. If you need any of those, DocSend is the better tool. Closewatch only tracks proposals.

### Does Closewatch filter out email security scanners?

Yes. Closewatch excludes known bots and link-preview fetchers outright, and counts a visit only after three seconds of visible attention on the page. A corporate security gateway opening your link on arrival is not reported as your client reading it.

### Can I send an investor deck through Closewatch?

You can upload any PDF, but Closewatch is built around proposals. The page tags, the pricing signal and the scoring all assume one. For a fundraising deck, DocSend is the format investors expect, and it is the better choice.`,
  },
}
