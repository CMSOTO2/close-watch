import type { Guide } from './types'

export const guide: Guide = {
  slug: 'can-you-tell-if-someone-downloaded-a-proposal',
  stage: 'reading',
  title: 'Can You Tell If Someone Downloaded a Proposal?',
  description:
    'You cannot see downloads of an emailed attachment. A tracked link can record them. What a download means, what it hides, and whether you can stop one.',
  dek: 'Only if you sent a link. What a download tells you, and what it stops telling you once the copy leaves the browser.',
  datePublished: '2026-09-11',
  dateModified: '2026-09-11',
  body: `Not if you emailed it as an attachment: the file is already on their device, so there is no download to see. If you sent a link, a tracking tool can record it. Closewatch records every download and print from its viewer, including the browser's own print command, and treats either as a buying signal.

## An attachment has nothing to download

An emailed PDF is already a copy on the recipient's computer or in their mail provider's storage. Saving it, opening it, printing it and forwarding it all happen on their side, with no signal back to you. The same is true of opening it: see [how to track a PDF proposal](/guides/track-pdf-proposals) for why nothing embedded in the file changes that.

## Cloud storage links tell you little

A Google Drive, OneDrive or Dropbox link sits in between. Depending on the plan and the account type, these services may show that a file was viewed, and some show activity to people within the same organisation. None of them is built to tell a salesperson which client downloaded a proposal and when.

Dropbox did offer file tracking through a feature called Send and Track, and discontinued it on 31 March 2025, including its tracking analytics.

## A tracking tool can record it

When a proposal is sent as a tracked link, the document is shown in the browser by the tool, and saving a copy goes through the tool too, so it can be recorded.

Closewatch shows a download button and a print button on its viewer and records every use of either. It also records printing from the browser's own print command, not only from its button. Both appear on the proposal's activity, and both feed its engagement score: a download adds 15 points, a print 18, and both together 20.

![What a client sees when they open a Closewatch link: the proposal as designed, download and print buttons, and a line saying the document is tracked](/images/closewatch-tracked-proposal-viewer-disclosure.webp "The download and print buttons on a tracked proposal. Using either is recorded. Sample data.")

## What a download usually means

Taking a proposal offline is a deliberate step past reading:

- **Keeping it.** Someone wants it on file, often to compare with other quotes.
- **Printing it.** To mark it up or bring it to a meeting, which often means it is being discussed with others.
- **Passing it on.** Downloading to attach to an internal email is a common way a proposal reaches whoever signs.

Printing is the more committed of the two, which is why Closewatch weighs it slightly higher.

## What happens after the download is invisible

A download is the last thing a tracker sees of that copy. If it is opened again offline, printed later, or attached to an internal email, none of it can be recorded. A proposal that stops showing new visits right after a download may be circulating as a file.

That is the honest trade of letting clients download: you gain a useful signal and lose sight of the copy.

## Can you stop someone downloading a proposal?

Partly, with some tools. Google Drive lets the owner stop viewers downloading, printing and copying a shared file, and some document tracking tools offer download controls. None of it stops a screenshot.

Closewatch does not currently let you switch downloads off. Clients can always save or print a copy, and each time they do, it is recorded. If blocking downloads matters more to you than seeing them, a tool with download controls will suit you better.

## What to do when you see a download

Follow up sooner rather than later, and assume the proposal may be in front of more people than your contact. A short offer helps: "If it would be useful to walk anyone else through it, I am happy to." If the download came right after a long visit to pricing, lead with terms or options.

As with every tracking signal, do not mention that you saw it.

## Where Closewatch fits

Closewatch turns the proposal PDF you already have into a tracked link, and records opens, time per page, return visits, new readers, downloads and prints, including the browser's own print. It is $19 a month, flat, with two read proposals free. It does not block downloads, and it cannot see a copy once it has been saved.

For what the other signals mean, see [how to know if a client read your proposal](/guides/how-to-know-if-client-read-proposal). For whether to send a file or a link in the first place, see [should you send a proposal as a PDF or a link](/guides/send-proposal-as-pdf-or-link).

## Frequently asked questions

### Can you see if someone downloaded a PDF you emailed?

No. An emailed PDF is already a copy on the recipient's device, so there is no download event to see, and opening, saving or forwarding it sends nothing back. Only a proposal sent as a tracked link can record downloads.

### Does Google Drive show who downloaded a file?

Not in a way that is useful for proposals. Depending on the account type, Drive may show viewing activity, mainly to people within the same organisation, but it is not built to tell you when a client downloaded your proposal. A tracking tool records that directly.

### Is it a good sign if a client downloads my proposal?

Usually. Saving or printing a proposal is a deliberate step past reading: to keep it, compare it, mark it up, or share it with a colleague. It often means the proposal is being taken seriously and discussed. It is still not a decision.

### Can I stop a client downloading my proposal?

Some tools let you, and Google Drive can stop viewers downloading, printing and copying a shared file. Nothing stops a screenshot. Closewatch does not block downloads; it records them instead, including prints from the browser's own print command.

### Does printing a proposal count as a download?

In Closewatch they are recorded separately, and both count. A print is weighed slightly higher than a download in the engagement score, because printing to mark up or bring to a meeting is usually the more committed of the two.

### Can something be downloaded without you knowing?

Yes, almost always. An emailed attachment, a file on a shared drive, or a PDF opened straight from a website can be saved with no signal to the sender. A tracked link is the exception: Closewatch records downloads and prints from its viewer, including the browser's own print command. A screenshot is invisible to every tool.

### Can you tell if someone downloads a Google Doc?

Not as the sender, in most cases. Google's [Activity dashboard](https://support.google.com/a/answer/7573825) shows who viewed a Docs, Sheets or Slides file, on Google Workspace accounts and depending on the admin's settings. It does not report downloads. A Workspace admin can see downloads in the Drive audit log, which a sender outside the client's organisation cannot reach.
`,
}
