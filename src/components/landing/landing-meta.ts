import { socialMeta } from '#/lib/seo'

// Kept apart from landing-page.tsx so the routes' head() can import it without
// dragging the whole landing page into the entry chunk every page downloads.
// The router splits a route's component into its own chunk, but only if
// nothing outside the component imports from the same module.

// Two titles, on purpose. The tab and the search result answer what someone
// types into Google when they have this problem — "proposal tracking software
// for agencies" — while the H1 stays the hook, because a page that opens with
// its own category name sells nothing. Google reads the title for intent and
// the page for whether it delivers on it.
const TITLE = 'Proposal Tracking Software for Agencies | Closewatch'
const DESCRIPTION =
  'Proposal tracking for agencies: turn the PDF you already send into a link that shows who opened it, how long they spent on pricing, and who they forwarded it to.'

// The card, on the other hand, is read in a feed by someone who was not
// looking for anything. Hook first, audience second.
const SOCIAL_TITLE = 'Proposal tracking built for agencies'
const SOCIAL_DESCRIPTION =
  'Stop guessing whether they read it. See which client opened the proposal, how long they spent on pricing, and whether it reached the person who signs.'

// The landing page is the one URL that gets pasted into a chat or a search
// result, so it carries its own title and description rather than inheriting
// the app's bare "Closewatch".
//
// og:url is the home page even on /r/hn and the rest. Without it a scraper
// keys the card off whatever URL it was handed, and the same page shared from
// three threads becomes three unrelated cards.
export function landingMeta() {
  return [
    { title: TITLE },
    { name: 'description', content: DESCRIPTION },
    ...socialMeta({
      title: SOCIAL_TITLE,
      description: SOCIAL_DESCRIPTION,
      path: '/',
    }),
  ]
}
