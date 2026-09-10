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
  /** One sentence, on the card and under the H1. The whole argument. */
  wedge: string
  /** Two or three paragraphs under the fold. Plain strings, no markup. */
  body: Array<string>
  /** The honest case for them. Written to be convincing. */
  betterWhen: Array<string>
  /** The honest case for us. */
  usWhen: Array<string>
  /** Rows of the table. `them` is what they do, `us` is what we do. */
  table: Array<{ row: string; them: string; us: string }>
}

export const COMPETITORS: Record<Competitor['slug'], Competitor> = {
  proposify: {
    slug: 'proposify',
    name: 'Proposify',
    category: 'a proposal builder',
    pricingUrl: 'https://www.proposify.com/pricing',
    price: 'from around $19/mo',
    title: 'Closewatch vs Proposify: a Proposify alternative',
    description:
      'Proposify is a proposal builder with analytics attached. Closewatch tracks the proposal PDF you already design, with no editor to move into.',
    socialTitle: 'Closewatch vs Proposify',
    wedge:
      'Proposify asks you to write your proposals in Proposify. Closewatch tracks the one you already designed.',
    body: [
      'Proposify is a good product with a real cost of entry, and the cost is not the price. It is an authoring tool first: templates, a content library, a drag-and-drop editor, and analytics on the documents you build inside it. To get the analytics you have to move your proposals into their editor and keep them there.',
      'For an agency that is often the wrong trade. Your proposals come out of InDesign, Figma, Docs or Canva, they carry your typography and your case studies, and they look like your work because you made them look like your work. Rebuilding that inside somebody else’s editor to find out whether a client opened it is a large price for a small answer.',
      'Closewatch does not have an editor and will never ask you to adopt one. You upload the PDF you were about to email, you get a link per recipient, and everything after that is measurement: who opened it, how long they spent on your pricing page, whether it was forwarded to somebody who did not receive it from you.',
    ],
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
    wedge:
      'PandaDoc is a document platform with tracking in it. Closewatch is the tracking, without the platform.',
    body: [
      'PandaDoc solves a bigger problem than the one you probably have. It is a document lifecycle tool: build it, route it for approval, get it signed, sync it to the CRM, bill against it. Proposal tracking is one feature inside that, and the feature is fine.',
      'The cost of that scope is that it is priced and shaped for a sales team. Seats add up, the setup is a project rather than an afternoon, and a two-to-fifteen-person agency ends up paying platform money to answer a question that is not a platform-sized question.',
      'Closewatch answers the one question. You keep the PDF you already produce, you keep whatever you use to get things signed, and you get back a scored list of which client is actually reading and which one has gone quiet. If you outgrow that and need contracts, approvals and CRM sync, PandaDoc is a reasonable place to go.',
    ],
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
  },

  docsend: {
    slug: 'docsend',
    name: 'DocSend',
    category: 'a document sharing and tracking tool',
    pricingUrl: 'https://www.docsend.com/pricing/',
    price: 'from around $45/user/mo',
    title: 'Closewatch vs DocSend: a cheaper DocSend alternative',
    description:
      'DocSend is the brand in document tracking, priced per user with no free plan. Closewatch is narrower, scores intent, and starts free.',
    socialTitle: 'Closewatch vs DocSend',
    wedge:
      'DocSend does more than Closewatch and costs more than Closewatch. The question is whether you need the rest of it.',
    body: [
      'This is the honest one, because DocSend is in the same category rather than a different one. Upload a document, send a tracked link, see what the reader did. It is Dropbox-owned, it has been at this for years, and it does things Closewatch does not: data rooms, NDA gating before a reader gets in, file requests, and a whole practice around fundraising decks that has made it the default in venture.',
      'What that breadth costs is focus and money. DocSend is a general document tool used for proposals; Closewatch is a proposal tool. The difference shows up in what you get back. DocSend reports activity faithfully. Closewatch turns activity into a scored, sorted pipeline: which client to call today, and the specific reasons behind the number, so a score is an argument rather than a horoscope.',
      'The other difference is the price and the front door. DocSend is priced per user with no free plan, so evaluating it is a purchase decision. Closewatch is free with all the tracking switched on, and the free plan does not count a proposal until a client opens it, which means you can put a real proposal through it this week and find out whether the answer is worth anything to you before you pay.',
    ],
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
      'Per-user pricing with no free plan is a hard sell for a five-person agency, and $45 a seat buys a lot of other software.',
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
  },
}
