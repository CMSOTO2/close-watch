import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Eye, EyeOff } from 'lucide-react'
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
import {
  EMPTY_READ,
  applyFlush,
  pagesSeen,
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
    return () => tracker.stop()
  }, [])

  const seconds = read.engagedMs / 1000

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
      <div ref={pagesRef} className="flex flex-col gap-4">
        {SAMPLE_PAGES.map((page) => (
          <article
            key={page.page}
            data-page={page.page}
            className="rounded-lg border border-line bg-surface px-6 py-7 shadow-sm sm:px-9 sm:py-10"
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

            {page.lines && (
              <table className="mt-6 w-full max-w-md text-[13px]">
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

      <aside ref={panelRef} className="scroll-mt-20 lg:sticky lg:top-20">
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
              label: 'Pages',
              value: `${pagesSeen(read)}/${SAMPLE_PAGE_COUNT}`,
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
          One read, in one sitting, by one person. A real proposal also earns
          points for being opened again days later and for reaching a second
          reader — the forward is the strongest signal there is, and this demo
          will not invent one it did not see.
        </p>
      </div>

      <Button asChild size="lg">
        <Link to="/login">Track a real one</Link>
      </Button>
    </div>
  )
}
