import type { Guide } from './types'

export const guide: Guide = {
  slug: 'what-is-proposal-analytics',
  stage: 'reading',
  title: 'Proposal Analytics: What It Is and What to Measure',
  metaTitle: 'What Is Proposal Analytics? What to Measure',
  description:
    'Proposal analytics turns tracking data into follow-up decisions. The eight metrics worth measuring, the ones that mislead, and how it differs from tracking.',
  dek: 'Tracking records what the client did. Analytics decides what it means. The metrics worth watching, and the ones that flatter you.',
  datePublished: '2026-09-11',
  dateModified: '2026-09-11',
  body: `Proposal analytics is what you do with proposal tracking data: turning opens, time per page, return visits and new readers into a decision about when and how to follow up. Tracking is the mechanism; analytics is the interpretation. Eight metrics are worth measuring, and time on the pricing page is usually the most telling.

## Tracking, analytics and proposal management

Three terms get used interchangeably, and they describe different things.

| Term | What it covers | Example question it answers |
|---|---|---|
| Proposal management | Writing, designing, approving and signing proposals | Is the proposal ready to send? |
| Proposal tracking | Recording what happens after it is sent | Was it opened, and for how long? |
| Proposal analytics | Interpreting that record | Should I call today, and about what? |

Most tools do tracking well and leave analytics to you: they show a chart and let you decide. The value is in the decision. See [what proposal tracking is and how it works](/proposal-tracking) for the mechanism itself.

## The eight metrics worth measuring

| Metric | What it tells you | Watch out for |
|---|---|---|
| Qualified opens | Whether a real person read it | Raw opens that include scanners and refreshes |
| Distinct readers | Whether it was shared | The same person on a second device |
| Total engaged time | How seriously it was read | Time counted while the tab sat in the background |
| Time per page | What they cared about | Long documents diluting the average |
| Time on pricing | Whether the number is being tested | A long visit that was someone copying figures |
| Reached the last page | Whether they read to the end | Skimming to the end in seconds |
| Return visits, and the gap | Whether it stayed on their mind | Refreshes counted as returns |
| Downloads and prints | Whether it was taken offline | Losing sight of the copy afterwards |

The "watch out for" column is where tools differ most. Closewatch counts a visit only after three seconds of visible attention, excludes known bots and link previews, accrues time only while the page is visible and in use, and treats a return within 30 minutes as the same visit.

For more on the individual signals, see [what a long time on your pricing page means](/guides/time-spent-on-proposal-pricing-page), [what repeat opens mean](/guides/client-opened-proposal-multiple-times), and [whether you can tell if a proposal was downloaded](/guides/can-you-tell-if-someone-downloaded-a-proposal).

## Metrics that mislead

**Email open rate.** A pixel in the covering email measures the message, not the proposal, and Apple Mail Privacy Protection inflates it. See [proposal tracking vs email open tracking](/guides/proposal-tracking-vs-email-open-tracking).

**Raw view counts.** A security scanner, a refresh and a genuine read all count as one view each unless the tool separates them.

**Averages across very different proposals.** A 3-page quote and a 40-page proposal do not share a sensible "average time". Compare like with like.

## From metrics to a decision

Eight numbers are still eight numbers. The step that makes analytics useful is combining them into a judgement about which proposal needs attention first, with the reasons attached so you know what to say.

One way is a points-based engagement score: each signal earns points, and the total sorts your pipeline. Closewatch publishes its whole model, weights and thresholds included. See [how to score proposal engagement](/guides/how-to-score-proposal-engagement).

## Analytics across all your proposals

Over months, the same data answers bigger questions: what share of your proposals get opened at all, how quickly, and which reading patterns came before the deals you won. That last one is the most valuable, and it needs outcomes recorded next to the reading data. Closewatch records won and lost against every proposal's reading history, though it does not yet turn that into a report. See [how to find out why you lost a proposal](/guides/find-out-why-you-lost-a-proposal).

## What proposal analytics cannot tell you

It measures behaviour, not intent. Four minutes on pricing can be a client building a case for you or drafting a polite no. And with a handful of proposals a month, patterns take time to mean anything: three losses in a row can be coincidence. Treat the numbers as reasons to act sooner and ask better questions, not as predictions.

## Where Closewatch fits

Closewatch records all eight metrics above from the PDF you already send, filters out bots and scanners before counting anything, and combines the signals into a cold, warm or hot score with the reasons listed. It is $19 a month, flat, with two read proposals free. It does not build proposals.

## Frequently asked questions

### What is proposal analytics?

Proposal analytics is the interpretation of proposal tracking data: using signals such as opens, time per page, time on pricing, return visits and new readers to decide when and how to follow up. Tracking records what happened; analytics works out what it means for the deal.

### What is the difference between proposal tracking and proposal analytics?

Tracking is the mechanism: sending a proposal as a link so the tool can record opens, time and pages. Analytics is what you do with that record: deciding which signals matter, what they suggest, and which proposal to act on first.

### What proposal metrics should I track?

Qualified opens, distinct readers, total engaged time, time per page, time on the pricing page, whether the last page was reached, return visits and the gap between them, and downloads or prints. Time on pricing and a return on a later day are usually the most telling.

### What is a good proposal open rate?

There is no reliable industry benchmark, and figures quoted online usually mix email opens with document opens. Measure your own: the share of your proposals opened within a few days, compared over time. A falling rate usually points at delivery or subject lines, not the proposal itself.

### Do proposal builders include analytics?

Most do. Proposify includes document tracking from its entry plan, Qwilr includes analytics with a history limit on its Starter plan, and PandaDoc puts detailed document analytics on its Business plan. The catch is that analytics only covers proposals built in their editors.

### How do I get analytics on a PDF proposal?

Send it as a link through a tracking tool instead of attaching it. An emailed PDF produces no data at all once it leaves your outbox. A tracker such as Closewatch, DocSend or Papermark shows the PDF in the browser and records the session.
`,
}
