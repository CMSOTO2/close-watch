import type { Guide } from './types'

/**
 * Every number in this guide is copied from src/lib/analytics/intent.ts.
 * Change a weight or threshold there and this page is wrong until it is
 * changed here too.
 */
export const guide: Guide = {
  slug: 'how-to-score-proposal-engagement',
  stage: 'reading',
  title: 'How to Score Proposal Engagement',
  description:
    'A proposal engagement score adds reading signals into one number with reasons. Closewatch publishes its whole model: every signal, weight and threshold.',
  dek: 'A score is only useful if you can see how it was made. The complete model Closewatch uses, with worked examples and its known limits.',
  datePublished: '2026-09-11',
  dateModified: '2026-09-11',
  body: `Give each reading signal points and add them up. Closewatch's model gives up to 25 for time on pricing, 25 for several readers, 20 each for repeat opens, close reading and taking it offline, 15 for a return on a later day and 8 for reaching the end. Under 30 is cold; 65 and above is hot.

The point of a score is not the number. It is sorting your proposals by which one needs you today, with the reasons attached so you know what to say. A score you cannot see inside is a horoscope. So here is the whole model.

## Only real reads count toward a proposal engagement score

Before anything is scored, the input is cleaned. A visit counts only after three seconds of visible attention. Known bots and link-preview fetchers are excluded. Time accrues only while the page is visible, the window has focus, and there has been activity in the last minute. A return within 30 minutes continues the same visit. A proposal with no qualifying visit scores 0.

## The proposal engagement scoring model

| Signal | Threshold | Points |
|---|---|---|
| Repeat opens | 2 visits / 3 visits / 4 or more | 10 / 15 / 20 |
| Several readers | 2 distinct readers / 3 or more | 18 / 25 |
| Depth of reading | 8 / 20 / 45 seconds per page | 5 / 12 / 20 |
| Time on pricing | 15 / 40 / 90 seconds | 10 / 18 / 25 |
| Reached the last page | yes | 8 |
| Taken offline | downloaded / printed / both | 15 / 18 / 20 |
| Came back | 4 or more hours later / 24 or more hours later | 8 / 15 |

Add the points and cap the total at 100. **Cold** is under 30, **warm** is 30 to 64, and **hot** is 65 and above. Each signal that earned points is listed next to the score in plain words, such as "2m 14s on pricing" or "Came back on a later day", largest first.

## Four rules that make it fair

**Depth is measured per page, with a ceiling.** Time is divided by the number of pages so a short proposal is not punished against a long one, but the divisor stops at 12 pages. The argument of a proposal is in its first dozen pages; past that are appendices nobody reads in full. Without the ceiling, an 80-page document would need an hour of reading to count as read closely.

**A second reader is reported as a reader, not a forward.** A new browser opening the link usually means it was shared, but it is also what the same person on a phone looks like. The label says what was observed, and you, who know who you sent it to, make the inference.

**Downloading and printing are capped together.** They are two halves of one act. Scored separately they would add up to enough to make a barely read proposal look warm.

**A return is measured by the gap, not the count.** Several visits in one sitting are covered by the visit count. A return after hours, or on another day, means someone went away and came back, and earns its own points.

## Two proposal engagement scores, worked through

**A proposal running hot.** A 12-page proposal, opened three times (15), by a second reader (18), with 70 seconds on pricing (18), six minutes of reading in all, which is 30 seconds per page (12), and a return the next day (15). Total 78: hot.

**A proposal that is not.** The same proposal, opened once for 40 seconds. That is about 3 seconds per page, under the 8-second threshold, and nowhere near 15 seconds on pricing. Total 0: cold, with the reason "opened" and nothing else. The next step is a resend or a question, not a closing call.

## Building your own proposal engagement score

You can run the same model in a spreadsheet. One row per proposal, one column per signal from the table above, a points formula for each, and a total capped at 100. The hard part is not the arithmetic; it is getting clean inputs. Opens that include email scanners, or time that counts a background tab, will score every proposal warm and make the whole exercise useless.

If you change the weights, change them for a reason you can say out loud. The value of a rules-based score is that when it gets one wrong, you can see which rule did it.

## What the model gets wrong

The weights are judgement, not fitted to outcomes. They reflect what tends to come before a decision, but they have not been tested against a large set of won and lost deals, and nobody should claim a score like this predicts wins until it has been. Closewatch records won and lost next to every proposal's reading history, which is the data that would let the weights be tested.

It also knows nothing outside the document: the budget, the politics, the competitor. A hot score means act now. It does not mean the answer will be yes.

## Where Closewatch fits

Closewatch scores every proposal with this model, shows the reasons next to the number, and sorts your dashboard by it so the proposal that needs you is at the top. On Solo, $19 a month flat, it emails you once when a proposal turns hot. Two read proposals are free.

![The Closewatch dashboard: five open proposals sorted by engagement score, two hot, one warm and two cold, each with the signal behind it](/images/closewatch-proposal-dashboard-ranked-by-intent.webp "The dashboard, sorted by this score. Sample data.")

For the individual signals, see [what proposal analytics is and what to measure](/guides/what-is-proposal-analytics) and [what repeat opens mean](/guides/client-opened-proposal-multiple-times).

## Frequently asked questions

### What is a proposal engagement score?

A single number that combines reading signals, such as repeat opens, time on pricing, several readers and return visits, to show how actively a proposal is being considered. Its main use is sorting proposals so you know which one to follow up first. A good score shows the reasons behind the number.

### How is Closewatch's intent score calculated?

Each signal earns points: up to 20 for repeat opens, 25 for several readers, 20 for depth of reading, 25 for time on pricing, 8 for reaching the last page, 20 for downloading or printing, and 15 for a return on a later day. The total is capped at 100. Under 30 is cold, 30 to 64 warm, 65 and above hot.

### What is a good proposal engagement score?

In Closewatch's model, 65 or above is hot, which in practice takes several signals together: no single one gets there on its own. Warm, 30 to 64, usually means real reading without a decision yet. The reasons matter more than the number, because they tell you what to say.

### Can I score proposal engagement in a spreadsheet?

Yes. List your proposals as rows, give each signal a column and a points rule, and cap the total. The hard part is clean data: without filtering out email scanners and background-tab time, every proposal looks engaged and the score stops discriminating.

### Does an engagement score predict whether I will win the deal?

Not reliably, and be wary of any tool that says it does. Closewatch's weights reflect what tends to come before a decision but have not yet been tested against a large set of outcomes. Use the score to decide who to call first, not to forecast revenue.

### How do you score an RFP?

That is the buyer's side of the table, and a different job. An RFP is usually scored against weighted criteria set before responses arrive, such as approach, experience, price and risk, with several evaluators rating each on a fixed scale and the totals compared. Proposal engagement scoring is the sender's side: measuring how a proposal was read.
`,
}
