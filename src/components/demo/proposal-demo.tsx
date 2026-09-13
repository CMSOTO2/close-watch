import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Download, Eye, EyeOff, Printer } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { startTracker } from '#/lib/analytics/tracker'
import { formatDuration, scoreIntent } from '#/lib/analytics/intent'
import { SECTION_LABELS } from '#/constants'
import { cn } from '#/lib/utils'
import {
  SAMPLE_CLIENT,
  SAMPLE_PAGES,
  SAMPLE_PAGE_COUNT,
  SAMPLE_TITLE,
} from './sample'
import { SAMPLE_FILE_NAME, sampleProposalBlob } from './sample-file'
import {
  EMPTY_READ,
  applyFlush,
  pagesRead,
  pricingMs,
  toIntentInput,
} from './readout'
import type { DemoRead } from './readout'

/**
 * The demo: read a proposal as the client, then see what the sender sees.
 *
 * Nothing here reaches the database. The visitor is not a visit, no share link
 * is spent, and no row is written — the same tracker that drives the real
 * viewer is handed a local sink instead of the ingest endpoint, and the score
 * comes out of the same `scoreIntent` the dashboard reads. So the readout is
 * not a mock-up of the product's output; it is the product's output, run on
 * the visitor's own reading.
 */
export function ProposalDemo() {
  const [read, setRead] = useState<DemoRead>(EMPTY_READ)
  const [revealed, setRevealed] = useState(false)
  const pagesRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLElement | null>(null)
  const trackerRef = useRef<ReturnType<typeof startTracker> | null>(null)

  useEffect(() => {
    const tracker = startTracker({
      visitId: 'demo',
      token: 'demo',
      getPageElements: () =>
        Array.from(
          pagesRef.current?.querySelectorAll<HTMLElement>('[data-page]') ?? [],
        ),
      // Straight into React state rather than over the wire.
      sink: (payload) => setRead((prev) => applyFlush(prev, payload)),
      // Twice a second, so the counter reads as a clock rather than jumping in
      // ten-second steps. The measurement underneath is unchanged.
      flushMs: 500,
    })
    trackerRef.current = tracker
    return () => {
      trackerRef.current = null
      tracker.stop()
    }
  }, [])

  const seconds = read.engagedMs / 1000

  /**
   * Save the sample proposal. A real file, because the report is about to
   * award points for having downloaded it.
   */
  function downloadSample() {
    const url = URL.createObjectURL(sampleProposalBlob())
    const a = document.createElement('a')
    a.href = url
    a.download = SAMPLE_FILE_NAME
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    trackerRef.current?.recordDownload()
  }

  /**
   * Print it, through an off-screen same-origin frame — the same route the real
   * viewer takes, and the reason the event is recorded only once the dialog has
   * actually been asked for.
   */
  function printSample() {
    const url = URL.createObjectURL(sampleProposalBlob())
    const frame = document.createElement('iframe')
    frame.setAttribute('aria-hidden', 'true')
    frame.style.cssText =
      'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
    frame.src = url
    frame.onload = () => {
      try {
        frame.contentWindow?.focus()
        frame.contentWindow?.print()
        trackerRef.current?.recordPrint()
      } catch {
        // A blocked print is not a print, and must not score like one.
      }
      setTimeout(() => {
        frame.remove()
        URL.revokeObjectURL(url)
      }, 60_000)
    }
    document.body.appendChild(frame)
  }

  function reveal() {
    setRevealed(true)
    // On a phone the panel is below six full pages of proposal, so revealing
    // it from the bar at the bottom of the screen has to take you there too.
    requestAnimationFrame(() =>
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      {/* The bottom padding is the sticky reveal bar's seat. That bar floats
          over the document on a phone, and without room reserved for it the
          last thing you read on every page was underneath it. Only while the
          bar is there, and only on the layout that has one. */}
      <div
        ref={pagesRef}
        // min-w-0 for the same reason as the landing page's feature rows: the
        // priced table on page five has a min-content width of its own, and a
        // grid track floored at that took the demo sideways on a 320px phone.
        // Capped, because the aspect ratio above works against itself as the
        // column grows: a wider page is a taller box *and* needs fewer lines
        // for the same words, so the two move apart at once. Measured fill per
        // page ran 72% at a phone's 390px, 34% at 640 and 26% at the 824 this
        // was reaching on a desktop — pages three-quarters empty at the width
        // most visitors see, which is not what a proposal looks like.
        //
        // 700px is also the readable measure. Minus the padding that is a
        // ~630px column, near 100 characters a line; uncapped it was ~750px
        // and 120, about double what anyone reads comfortably. At this width
        // the box is 906px, so it still fills a laptop window and time is
        // still credited at 1:1.
        className={cn(
          'mx-auto flex w-full min-w-0 max-w-[700px] flex-col gap-4',
          !revealed && 'pb-16 lg:pb-0',
        )}
      >
        {SAMPLE_PAGES.map((page) => (
          <article
            key={page.page}
            data-page={page.page}
            // The aspect ratio is not styling. Time is credited to a page in
            // proportion to
            // how much of the window it holds (see pageWeights), and the real
            // viewer renders a page at its natural aspect ratio, so a portrait
            // page is as tall as the window or taller and earns close to a
            // second per second. These are article cards sized by their text:
            // 217-407px against an 873px window, so no page here could earn
            // more than 47% and most earned under 40%. That is not a slower
            // bar, it is a different product — PAGE_READ_MS is 3s of weighted
            // time, so a page took nearly eight real seconds to count as read
            // instead of three, and the intent score the demo exists to show
            // came out deflated for someone who had genuinely read it.
            //
            // US Letter, which is what the real viewer arrives at on its own:
            // it sets aspectRatio from the PDF's natural dimensions, so this is
            // the same rule rather than a number picked to make the bar move.
            // At this width that is 1066px against an 873px window, so a page
            // fills it exactly as a real one does.
            className="flex aspect-[8.5/11] flex-col rounded-lg border border-line bg-surface px-6 py-7 shadow-sm sm:px-9 sm:py-10"
          >
            <div className="flex items-baseline justify-between gap-4">
              <p className="kicker text-brand">{page.kicker}</p>
              <p className="font-mono text-[11px] text-ink-3">
                {page.page} / {SAMPLE_PAGE_COUNT}
              </p>
            </div>

            <h3
              className={cn(
                'mt-3 font-display font-semibold tracking-[-0.02em]',
                page.page === 1 ? 'text-2xl sm:text-3xl' : 'text-xl',
              )}
            >
              {page.title}
            </h3>

            <div className="mt-4 flex flex-col gap-3">
              {page.body.map((paragraph) => (
                <p
                  key={paragraph}
                  className="max-w-[62ch] text-[13px] leading-relaxed text-ink-2"
                >
                  {paragraph}
                </p>
              ))}
            </div>

            {page.page === SAMPLE_PAGE_COUNT && (
              <div className="mt-7 flex flex-wrap items-center gap-2 border-t border-line-soft pt-5">
                <p className="mr-1 text-[13px] text-ink-3">
                  What a client does next:
                </p>
                <Button size="sm" variant="outline" onClick={downloadSample}>
                  <Download aria-hidden />
                  Download
                </Button>
                <Button size="sm" variant="outline" onClick={printSample}>
                  <Printer aria-hidden />
                  Print
                </Button>
              </div>
            )}

            {page.lines && (
              <table className="mt-6 w-full max-w-md table-fixed text-[13px]">
                <tbody>
                  {page.lines.map((line, i) => {
                    const isTotal = i === page.lines!.length - 1
                    return (
                      <tr
                        key={line.item}
                        className={cn(
                          'border-t border-line-soft',
                          isTotal && 'border-t-line font-semibold text-ink',
                        )}
                      >
                        <td className="py-2 pr-4 text-ink-2">{line.item}</td>
                        <td className="py-2 text-right tnum text-ink">
                          {line.amount}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </article>
        ))}
      </div>

      <aside
        ref={panelRef}
        className="min-w-0 scroll-mt-20 lg:sticky lg:top-20"
      >
        <SenderPanel
          read={read}
          seconds={seconds}
          revealed={revealed}
          onReveal={reveal}
        />
      </aside>

      {/* Phones only. The panel stacks under the whole proposal there, and a
          reveal button you reach after six pages of scrolling is a reveal
          button nobody presses. Goes away once it has been used. */}
      {!revealed && (
        <div className="pointer-events-none sticky bottom-3 z-20 flex justify-center lg:hidden">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-line bg-surface/95 py-2 pl-4 pr-2 shadow-lg backdrop-blur">
            <span className="text-[13px] tnum text-ink-2">
              {seconds < 1 ? '0s' : formatDuration(seconds)}
            </span>
            <Button size="sm" className="rounded-full" onClick={reveal}>
              <Eye aria-hidden />
              What the sender sees
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function SenderPanel({
  read,
  seconds,
  revealed,
  onReveal,
}: {
  read: DemoRead
  seconds: number
  revealed: boolean
  onReveal: () => void
}) {
  const intent = scoreIntent(toIntentInput(read))
  const forwarded = scoreIntent(toIntentInput(read, new Date(), true))
  const pricingSeconds = pricingMs(read) / 1000

  if (!revealed) {
    return (
      <div className="rounded-lg border border-line bg-surface p-5 shadow-sm">
        <p className="kicker text-brand">You are the client</p>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
          Read it the way you would read one that landed in your inbox. Skim,
          stop where you would stop, close the tab if you want.
        </p>

        <div className="mt-5 rounded-md border border-line bg-canvas px-3.5 py-3">
          <p className="kicker">Time on the page</p>
          <p className="mt-1 font-display text-2xl font-semibold tnum">
            {seconds < 1 ? '0s' : formatDuration(seconds)}
          </p>
          <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-ink-3">
            <EyeOff aria-hidden className="mt-0.5 size-3 shrink-0" />
            Switch tabs and watch it stop. Time only counts while you are
            actually looking, which is the whole reason the number is worth
            anything.
          </p>
        </div>

        <Button className="mt-5 w-full" onClick={onReveal}>
          <Eye aria-hidden />
          Show me what the sender sees
        </Button>
        <p className="mt-2.5 text-[11px] leading-relaxed text-ink-3">
          Nothing here is stored. No account, no cookie, no row in
          anyone&rsquo;s database — close the tab and it is gone.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-line bg-surface p-5 shadow-sm">
        <p className="kicker text-brand">What the sender sees</p>
        <p className="mt-2 font-display text-base font-semibold tracking-tight">
          {SAMPLE_CLIENT}
        </p>
        <p className="text-[13px] text-ink-2">{SAMPLE_TITLE}</p>

        <dl className="mt-4 grid grid-cols-3 gap-2">
          {[
            {
              label: 'Time',
              value: seconds < 1 ? '0s' : formatDuration(seconds),
            },
            {
              // "Read", not "seen", and it means it: a page counts once it has
              // held your attention for three seconds, so scrolling past one
              // does not earn it.
              label: 'Pages read',
              value: `${pagesRead(read)}/${SAMPLE_PAGE_COUNT}`,
            },
            {
              label: 'On pricing',
              value: pricingSeconds < 1 ? '—' : formatDuration(pricingSeconds),
            },
          ].map((t) => (
            <div
              key={t.label}
              className="rounded-md border border-line bg-canvas px-2.5 py-2"
            >
              <dt className="kicker">{t.label}</dt>
              <dd className="mt-1 font-display text-base font-semibold tnum">
                {t.value}
              </dd>
            </div>
          ))}
        </dl>

        <h4 className="kicker mt-5">Attention by page</h4>
        <ul className="mt-2.5 space-y-1.5">
          {SAMPLE_PAGES.map((page) => {
            const ms = read.pageMs[page.page] ?? 0
            const max = Math.max(1, ...Object.values(read.pageMs))
            const isPricing = page.section === 'pricing'
            return (
              <li key={page.page} className="flex items-center gap-2">
                <span className="w-20 shrink-0 truncate text-[11px] text-ink-2">
                  {SECTION_LABELS[page.section]}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      isPricing ? 'bg-bar-lead' : 'bg-bar',
                    )}
                    style={{ width: `${(ms / max) * 100}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-[11px] tnum text-ink-3">
                  {ms >= 1000 ? formatDuration(ms / 1000) : '—'}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="rounded-lg border border-line bg-surface p-5 shadow-sm">
        <div className="flex items-baseline justify-between gap-3">
          <p className="kicker text-brand">Intent</p>
          <p className="font-display text-2xl font-semibold tnum">
            {intent.score}
            <span className="text-sm font-medium text-ink-3">/100</span>
          </p>
        </div>
        <ul className="mt-3 flex flex-col gap-1.5">
          {intent.signals.map((s) => (
            <li
              key={s.label}
              className="flex items-baseline justify-between gap-3 text-[13px]"
            >
              <span className="text-ink-2">{s.label}</span>
              <span className="shrink-0 tnum text-ink-3">+{s.points}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[11px] leading-relaxed text-ink-3">
          Everything above is something you actually did. One person, one
          sitting — so no forward and no return, which are the two biggest
          signals there are.
        </p>
      </div>

      {/* Forwarding cannot be demonstrated by one visitor in one tab, and it
          is the signal the product is really built around. Shown as an
          explicit projection rather than folded into the score above, because
          a demo that quietly credits you with a forward you did not make is
          the exact dishonesty this product sells against. */}
      <div className="rounded-lg border border-dashed border-line bg-surface/60 p-5">
        <p className="kicker text-ink-3">If it were forwarded</p>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="font-display text-xl font-semibold tnum text-ink-2">
            {intent.score}
          </p>
          <span aria-hidden className="text-ink-3">
            &rarr;
          </span>
          <p className="font-display text-xl font-semibold tnum text-brand">
            {forwarded.score}
          </p>
          <span className="text-[11px] text-ink-3">
            +{forwarded.score - intent.score} points
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-3">
          One link per recipient is how that is seen: a link sent to one person,
          opened by a second reader. Usually that is a forward to whoever signs,
          and sometimes it is your contact on their phone — the dashboard
          reports the reader and leaves the rest to you. Either way this number
          is a projection, not something you did.
        </p>
      </div>

      <Button asChild size="lg">
        <Link to="/login" search={{ mode: 'signup' }}>
          Track a real one
        </Link>
      </Button>
    </div>
  )
}
