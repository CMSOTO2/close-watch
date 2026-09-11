import type { Guide } from './types'

export const guide: Guide = {
  slug: 'did-my-client-forward-my-proposal',
  stage: 'reading',
  title: 'How to Tell If a Client Forwarded Your Proposal',
  description:
    'An emailed PDF gives no sign of a forward. A tracked link does: a browser that has never opened it before. How to read it, and tell it from a phone.',
  dek: 'A forward is often the moment a proposal reaches the person who signs. What you can actually see, and what you cannot.',
  datePublished: '2026-09-11',
  dateModified: '2026-09-11',
  body: `With an emailed PDF, you cannot tell. With a tracked link, the signal is a new reader: a browser that has never opened it before. Closewatch reports it as "opened by a second reader", not as a confirmed forward, because the same person on a phone looks identical. Send each stakeholder their own link and the signal sharpens.

## Why a forward matters more than an open

An open tells you your contact looked at the proposal. A forward tells you the decision has left their desk. In most service engagements above a few thousand dollars, the person you sent the proposal to is not the only person who has to agree to it, and often not the one who controls the budget.

That makes a forward one of the most useful things you can learn after sending. It is also the moment a proposal is most exposed: it arrives in front of someone who was not on your calls, with none of the context, and gets judged on whatever survives the trip.

## What you can see with an attachment: nothing

A forwarded attachment is a copy of a file travelling from one inbox to another. Nothing about that journey reaches you.

Email open tracking does not help much either. If your covering email carried a tracking pixel, a forwarded copy can fire that pixel again from someone else's mail app, and most email trackers report that as your original recipient opening it a second time. You learn that something happened, with the wrong name attached.

## What a tracked link shows

A tracked link travels with the email that carries it. When anyone opens it, the tracker records the visit, so the question becomes whether that visit came from a browser that has opened the link before.

Closewatch answers that with a first-party cookie set the first time a browser opens a link. A browser without it is counted as a new reader and labelled Reader 2, Reader 3 and so on, next to the name you gave the link. A second reader is one of the heaviest signals in Closewatch's intent score, and three or more is heavier still, because circulation is usually what a decision in progress looks like.

## Forward or phone? Reading the pattern

A new reader is an observation, not a fact about who it was. Your contact on their phone, in a second browser, in a private window, or after clearing cookies looks exactly like a colleague. Timing and behaviour help you tell the difference, though none of them is proof.

| What you see | Most likely | What to do |
|---|---|---|
| A new reader the same evening, a short visit, the same pages as before | Your contact on their phone | Nothing yet |
| A new reader the next business day who goes straight to pricing and stays | Someone who controls the budget | Offer to walk them through it |
| Two or three new readers within an hour | Shared in a meeting or a thread | Ask who else is involved |
| A new reader weeks after everything went quiet | The proposal resurfacing | Re-engage with something new |

You know who you sent the link to, and the tool does not. The inference is yours to make.

## Make the signal sharper: one link per person

The cleanest fix is to stop sending one link to a group. Closewatch lets you create as many share links on a proposal as you like, each labelled with the person it is for. Send your contact their link and the finance lead theirs.

Then each read belongs to a named person, and a new reader on your contact's link is much more likely to be someone they passed it to. It also tells you who has not opened theirs, which is often the more useful fact.

## What to do once it has been forwarded

Do not say you saw it. "I noticed you forwarded my proposal" turns a helpful signal into an uncomfortable conversation, and it tells the client something about the link they did not know to ask about.

Instead, act on what a forward usually means:

- **Ask who else is weighing in.** "Is there anyone else who should be part of this decision? Happy to walk them through it."
- **Give your contact something to pass upward.** A one-page summary with the outcome, the price and the timeline travels better than a fifteen-page document.
- **Make the pricing page stand on its own.** It is the page most likely to be read without you there to explain it.

## What this cannot tell you

A new reader is never named. Closewatch does not learn a reader's name or email address from their visit, so it cannot tell you who the second reader was, only that there was one.

A forward that happens after a download is invisible. If your contact downloads the PDF and emails the file, that copy is as untracked as any attachment. Closewatch records the download itself, which is often the first hint.

And a proposal printed and handed round a meeting table shows up as a print, not as five readers.

## Where Closewatch fits

Closewatch counts distinct readers on every link and marks the first time a new one appears. On the dashboard that is free; on Solo, $19 a month flat, it also emails you when it happens, with the subject "A new reader opened" and the proposal's title. It will not claim a forward it cannot see, and it does not ask your client for an email address before they read, which keeps the link as easy to open as an attachment.

For what the other reading signals mean, see [how to know if a client read your proposal](/guides/how-to-know-if-client-read-proposal). For what to say next, see the [proposal follow-up email templates](/guides/proposal-follow-up-email-templates).

## Frequently asked questions

### Can I see who my proposal was forwarded to?

Not by name, with Closewatch or most tracking tools that do not ask readers to identify themselves. You can see that a new browser opened the link, when, and what it read. The only way to name every reader is to require an email address before viewing, which some tools offer and which adds friction for the client.

### Does opening a proposal on a phone count as a second reader?

Yes. A phone is a different browser from a laptop, so it looks like a new reader until proven otherwise. That is why Closewatch reports "opened by a second reader" and leaves the conclusion to you. Short visits that repeat pages already read are usually the same person.

### Can a client forward a tracked proposal link?

Yes, the link works for whoever has it, the same way an attachment does. If you need to stop that, revoke the link, which stops it working immediately. Closewatch links also expire on their own 60 days after they are created.

### Is it a good sign if my proposal was forwarded?

Usually. People do not circulate proposals they have already rejected. A forward generally means your contact is building a case internally, which is when helping them, with a summary or a call with the wider group, has the most effect on the outcome.

### Should I send separate proposal links to each decision maker?

If you know who they are, yes. Separate links tell you who has read it and who has not, and they make a genuine forward much easier to spot. It costs a minute of setup per person.

### Can I tell if a forwarded PDF attachment was opened?

No. A PDF attachment gives no signal when it is opened, whether by the original recipient or by anyone they forward it to. The only way to see forwarding is to send the proposal as a link.
`,
}
