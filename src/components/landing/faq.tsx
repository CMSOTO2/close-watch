import { ChevronDown } from 'lucide-react'
import { PDF_MAX_MB, SHARE_LINK_TTL_DAYS } from '#/constants'

/**
 * Every answer here is checked against what the code does: the three-second
 * qualification line, the link TTL, the size cap. Each reads from the same
 * constants where there is one, so the page cannot quietly start lying when a
 * limit changes.
 */
const QUESTIONS: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: 'Does my client have to install or sign up for anything?',
    a: (
      <>
        No. They get a normal link and the proposal opens in their browser. No
        account, no plugin, no app. As far as they are concerned you sent them a
        PDF.
      </>
    ),
  },
  {
    q: 'Will they know they are being tracked?',
    a: (
      <>
        Yes. The viewer carries a line saying the sender is told when the
        document was opened, which pages were read, and whether it was
        downloaded or printed, with a link to exactly what is recorded. It is
        one quiet line above the first page, not a banner.
        <br />
        <br />
        That is deliberate. A proposal you are proud of does not need to be read
        in secret, and the conversation it opens &mdash; &ldquo;let me know if
        the pricing page needs work&rdquo; &mdash; is the same one you would
        have had anyway, from the other end. It is also the difference between a
        tool a client would shrug at and one they would resent finding out about
        later.
      </>
    ),
  },
  {
    q: 'How do you know a real person read it and not a scanner?',
    a: (
      <>
        Two filters. Known bots and link-preview fetchers are identified and
        excluded outright, and a visit only counts once it has accumulated{' '}
        <strong className="font-semibold text-ink">
          three seconds of visible attention
        </strong>
        , the line between a scanner fetching a page and a person reading it.
        Everything on your dashboard is drawn from those qualified reads only.
      </>
    ),
  },
  {
    q: 'How can you tell it was forwarded?',
    a: (
      <>
        You create one link per recipient. If a link you sent to one person is
        opened by a second and third distinct reader, it travelled, which
        usually means it reached someone with budget authority. That is the
        strongest single signal Closewatch scores, and the one worth acting on
        fastest.
      </>
    ),
  },
  {
    q: 'What is the intent score, really?',
    a: (
      <>
        A rules-based tally rather than a model, and it shows its working.
        Repeat opens, time on your pricing page, depth of read normalised by
        document length, forwarding, downloads and prints each add a fixed
        number of points. Every proposal lists the reasons behind its own score.
        A number on its own is a horoscope; &ldquo;they came back Tuesday and
        spent four minutes on pricing&rdquo; is something you can act on before
        lunch.
      </>
    ),
  },
  {
    q: 'Can I take a link back?',
    a: (
      <>
        Any link can be revoked the moment you want it gone, and it stops
        opening immediately. Links also expire on their own after{' '}
        {SHARE_LINK_TTL_DAYS} days, so an old one cannot circulate forever.
        Revoking keeps everything it already recorded.
      </>
    ),
  },
  {
    q: 'What happens to a deal that falls through?',
    a: (
      <>
        Mark it lost and it moves to Closed, out of your pipeline, keeping every
        visit, reader and page it collected. What a deal you did not win was
        read for is worth knowing, and you can reopen it if the client comes
        back.
      </>
    ),
  },
  {
    q: 'What happens when I hit the free limit?',
    a: (
      <>
        Nothing you have already sent stops working. Two proposals can be active
        at once on the free plan; a third needs one of them closed, or a paid
        plan. Links you have already sent keep tracking either way, because a
        proposal going quiet on your side is not a reason to break a link
        sitting in a client&rsquo;s inbox.
      </>
    ),
  },
  {
    q: 'What can I upload?',
    a: (
      <>
        Any PDF up to {PDF_MAX_MB} MB. Closewatch reads the page count on upload
        so it can measure attention page by page; tag which page is your pricing
        and it will track that one specifically.
      </>
    ),
  },
]

export function Faq() {
  return (
    <div className="mt-8 border-t border-line">
      {QUESTIONS.map(({ q, a }, i) => (
        /*
         * Native <details> rather than a useState accordion, for reasons that
         * are not about saving a hook: the answers stay in the HTML whether or
         * not they are open, so a search engine reads them and ctrl-F finds
         * them; keyboard and screen-reader behaviour is the browser's, already
         * correct; and it works before any JavaScript arrives. The shared
         * `name` makes it exclusive, so opening one closes the rest, which is
         * the single-open behaviour hand-rolled accordions reach for JS to get.
         */
        <details
          key={q}
          name="faq"
          open={i === 0}
          className="group border-b border-line"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 transition-colors hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
            <h3 className="text-[15px] font-medium tracking-[-0.008em]">{q}</h3>
            <ChevronDown
              aria-hidden
              className="size-4 shrink-0 text-ink-3 transition-transform group-open:rotate-180"
            />
          </summary>
          <p className="max-w-[68ch] pb-5 text-[14px] leading-relaxed text-ink-2">
            {a}
          </p>
        </details>
      ))}
    </div>
  )
}
