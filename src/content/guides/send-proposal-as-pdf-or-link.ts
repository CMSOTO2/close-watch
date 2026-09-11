import type { Guide } from './types'

export const guide: Guide = {
  slug: 'send-proposal-as-pdf-or-link',
  stage: 'sending',
  title: 'Should You Send a Proposal as a PDF or a Link?',
  description:
    'Send a link to see what happens after you hit send; attach a PDF if the client asks or files everything. What each one costs, and the middle path between them.',
  dek: 'The choice decides what you can know about the proposal once it leaves your outbox. Most people make it by habit.',
  datePublished: '2026-09-11',
  dateModified: '2026-09-11',
  body: `Send a link if you want to know what happens after you hit send; attach a PDF if the client asks for one. A link shows whether it was read, can be revoked, and dodges mail servers' 20-25 MB attachment limits. An attachment cannot be tracked but works offline. For most senders, a link with a download option wins.

Most people send a PDF because it is what they have always done. That is a reasonable default, but it is a choice with a cost, and the cost only shows up later, when the client goes quiet and you have no idea why.

## Side by side

| | PDF attachment | Tracked link |
|---|---|---|
| Know if it was opened | No | Yes |
| Which pages were read, and for how long | No | Yes |
| Know if it was forwarded | No | A strong hint |
| Works offline | Yes | Once downloaded |
| Size limits | Mail server limits, often 10-25 MB | The tool's upload limit |
| Can be withdrawn after sending | No | Yes, revoke the link |
| Familiar to every client | Yes | Nearly |
| Can trip a corporate link filter | Rarely | Occasionally |

## When a PDF attachment is the right call

**The client asked for one.** Procurement teams, legal departments and some public-sector buyers want a file they can store with the contract. Send them what they asked for.

**The client files everything.** Some buyers keep every quote in a folder for comparison. A link that expires in two months is a poor fit for a document they expect to open in a year.

**You are sending a formal tender.** Bid portals and formal RFP responses come with their own rules on format, and those win.

**The deal is small and quick.** For a low-value quote the client will accept or decline within a day, knowing whether they read it changes little.

## When a link is the right call

**You want to know whether it was read.** An attachment gives you nothing once it leaves your outbox. A link tells you when it was opened, how long they spent, which pages they read, and whether they came back. See [how to know if a client read your proposal](/guides/how-to-know-if-client-read-proposal) for what that data means.

**The proposal is large.** Gmail caps attachments at 25 MB, and many corporate mail servers cap lower. A designed proposal with photography exceeds that easily, and an oversized attachment either bounces or gets silently converted into a cloud link anyway.

**You may need to withdraw it.** Pricing changes, a mistake on page 9, a deal that falls through: a link can be revoked, and an attachment lives in someone's inbox indefinitely.

**The proposal will circulate.** A link shows you when it reaches someone new. An attachment forwarded to three colleagues looks exactly like one that was never opened. See [how to tell if a client forwarded your proposal](/guides/did-my-client-forward-my-proposal).

## The middle path: a link, with the file on request

You do not have to choose between tracking and giving the client a file. Send the link in the email, and let the viewer offer a download button. Most clients read it in the browser; the ones who want a copy take one.

A download is itself a useful signal: someone wanted to keep it, print it or share it. Closewatch records downloads and prints alongside reads. After that the copy on their machine is as untracked as any attachment, which is the honest trade.

## What can go wrong with a link

**An unfamiliar domain can meet a corporate filter.** Some security gateways are cautious about links to domains they have not seen. It is uncommon, and a short message telling the client what to expect ("the proposal is at the link below; there is a download button if you want the PDF") helps more than anything else.

**Links expire.** Closewatch links stop working 60 days after they are created. If a decision runs longer than that, send a fresh link; the old one can be revoked at the same time.

**Some clients simply prefer files.** If a client asks for the PDF, send it. Winning the deal matters more than the reading data.

## How to write the email that carries the link

Keep the link near the top and say what it is, so it does not look like a marketing email. For more templates and subject lines, see [how to email a proposal to a client](/guides/how-to-email-a-proposal).

> **Subject:** Proposal: Q4 rebrand for Acme
>
> Hi Dana, here is the proposal we discussed: [link]
>
> It opens in your browser, and there is a download button if you would like the PDF. The summary is on page 2 and pricing on page 7. Happy to walk through it whenever suits.

## Where Closewatch fits

Closewatch turns the PDF you already have into a tracked link. Upload a proposal up to 25 MB, send the link instead of the attachment, and see opens, time per page, return visits, new readers, downloads and prints. The client needs no account and no plugin, and the viewer says in one line that the sender can see opens and pages read. Links last 60 days and can be revoked at any time. It is $19 a month, flat. It does not build the proposal or collect signatures.

For the technical detail on why an attached PDF cannot be tracked, see [how to track a PDF proposal](/guides/track-pdf-proposals).

## Frequently asked questions

### Is it unprofessional to send a proposal as a link?

No. Proposal builders, e-signature tools and document-sharing platforms have made proposal links common in sales for over a decade. What reads as unprofessional is an unexplained link from an unfamiliar domain, so say in the email what it is and that a PDF can be downloaded from it.

### What is the maximum attachment size for a proposal PDF?

Gmail allows attachments up to 25 MB, and Outlook and many corporate mail servers set lower limits, commonly 10 to 20 MB. A proposal with photography or embedded video can pass those easily. A link avoids mail server limits entirely; the only limit is the upload cap of the tool you use, which is 25 MB on Closewatch.

### Can the client download the proposal if I send a link?

On most tracking tools, yes. Closewatch shows download and print buttons on the viewer and records when either is used. Once downloaded, that copy behaves like an attachment: anything that happens to it afterwards cannot be seen.

### Should I attach the PDF and send a link as well?

Usually not. If the client can open the attachment, most will, and the link goes unused, so you lose the reading data without gaining anything. Send the link, mention the download button, and attach the file only if they ask.

### Does sending a proposal as a link affect email deliverability?

A single link to a reputable domain rarely causes problems, and large attachments carry their own risk of bouncing. The bigger factor is the email around it: a short, personal message that explains the link reads as a person writing, not a campaign.
`,
}
