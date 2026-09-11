import { guide as bestTrackingSoftware } from './best-proposal-tracking-software'
import { guide as clientNotResponding } from './client-not-responding-to-proposal'
import { guide as clientSaysTooExpensive } from './client-says-proposal-too-expensive'
import { guide as clientNeedsToThink } from './client-says-they-need-to-think-about-it'
import { guide as didClientForward } from './did-my-client-forward-my-proposal'
import { guide as docsendAlternatives } from './docsend-alternatives'
import { guide as whyYouLost } from './find-out-why-you-lost-a-proposal'
import { guide as reachDecisionMaker } from './get-proposal-to-decision-maker'
import { guide as howLongToWait } from './how-long-to-wait-after-sending-proposal'
import { guide as howToEmailAProposal } from './how-to-email-a-proposal'
import { guide as howToKnowIfClientRead } from './how-to-know-if-client-read-proposal'
import { guide as isClientInterested } from './how-to-tell-if-client-is-interested'
import { guide as pricingPageTime } from './time-spent-on-proposal-pricing-page'
import { guide as followUpTemplates } from './proposal-follow-up-email-templates'
import { guide as proposalTrackingVsEmailOpenTracking } from './proposal-tracking-vs-email-open-tracking'
import { guide as pdfOrLink } from './send-proposal-as-pdf-or-link'
import { guide as trackPdfProposals } from './track-pdf-proposals'
import type { Guide, GuideStage } from './types'

/**
 * The stages a sent proposal passes through, in order, and how the index
 * labels them. A stage with no guides yet is simply not shown, so 'closing'
 * waits here for its first one rather than being a heading over nothing.
 */
export const STAGES: ReadonlyArray<{
  key: GuideStage
  label: string
  blurb: string
}> = [
  {
    key: 'sending',
    label: 'Sending it',
    blurb: 'How to deliver a proposal so you can see what happens next.',
  },
  {
    key: 'reading',
    label: 'Is it being read?',
    blurb: 'What you can know once it lands, and what the signals mean.',
  },
  {
    key: 'silence',
    label: 'When it goes quiet',
    blurb: 'Why clients stop replying, and how to tell which reason it is.',
  },
  {
    key: 'follow-up',
    label: 'Following up',
    blurb: 'When to write, and what to say when you do.',
  },
  {
    key: 'negotiating',
    label: 'When they come back',
    blurb: 'Objections, pricing, and getting to a decision.',
  },
  {
    key: 'closing',
    label: 'Won or lost',
    blurb: 'Closing the deal, and learning from the ones that got away.',
  },
  {
    key: 'choosing',
    label: 'Choosing a tool',
    blurb: 'Honest comparisons, including where Closewatch is the wrong pick.',
  },
]

/**
 * Newest first — this is the order the index page lists them in.
 *
 * Each entry is a question with a real, checkable answer, not a landing page.
 * If a topic can't say something a general-purpose model couldn't already
 * generate, it belongs as an FAQ line on an existing page instead of a guide
 * of its own.
 */
export const GUIDES: Array<Guide> = [
  bestTrackingSoftware,
  docsendAlternatives,
  howToEmailAProposal,
  pricingPageTime,
  isClientInterested,
  clientNeedsToThink,
  reachDecisionMaker,
  whyYouLost,
  didClientForward,
  clientSaysTooExpensive,
  followUpTemplates,
  pdfOrLink,
  clientNotResponding,
  howLongToWait,
  trackPdfProposals,
  howToKnowIfClientRead,
  proposalTrackingVsEmailOpenTracking,
]

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug)
}
