import { Check, Link2 } from 'lucide-react'
import { HeatMeter } from '#/components/dashboard/heat-meter'
import { useInView } from './use-in-view'
import { cn } from '#/lib/utils'

/**
 * The product shots on the landing page.
 *
 * These are built from the same tokens as the app rather than captured as
 * images, for two reasons that images cannot meet: they follow the reader's
 * theme the moment it changes, one set of markup instead of a light PNG and a
 * dark PNG that drift apart, and they cannot go stale, because a token or
 * spacing change lands here as well. They are also a fraction of the weight
 * and stay sharp at any zoom.
 *
 * The data is invented and says so; nothing here reads from the database.
 */

/** Chrome that says "this is a screenshot of an app" without faking a browser. */
function Frame({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <figure className={cn('min-w-0', className)}>
      <div className="overflow-hidden rounded-xl border border-line bg-canvas shadow-lg">
        <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-3 py-2">
          <span aria-hidden className="flex gap-1.5">
            <span className="size-2 rounded-full bg-ink-3/40" />
            <span className="size-2 rounded-full bg-ink-3/40" />
            <span className="size-2 rounded-full bg-ink-3/40" />
          </span>
          {/* min-w-0 so `truncate` can actually bite: a nowrap span in a flex
              row keeps its full text as a minimum width otherwise, and the
              label is the longest single string in the shot. */}
          <span className="kicker min-w-0 truncate">{label}</span>
        </div>
        <div className="p-3 sm:p-4">{children}</div>
      </div>
    </figure>
  )
}

type Row = {
  client: string
  title: string
  value: string
  band: 'hot' | 'warm' | 'cold'
  score: number
  metrics: string
  flag?: string
  flagTone?: 'hot' | 'warm'
}

const ROWS: Array<Row> = [
  {
    client: 'Northwind Studio',
    title: 'Brand identity',
    value: '$18,000',
    band: 'hot',
    score: 86,
    metrics: 'Viewed 4 times · 3m 20s engaged · 3 readers',
    flag: 'Opened by 3 readers',
    flagTone: 'hot',
  },
  {
    client: 'Halden & Co',
    title: 'Website rebuild',
    value: '$24,500',
    band: 'warm',
    score: 54,
    metrics: 'Viewed twice · 1m 09s engaged · 1 reader',
    flag: 'Printed it',
    flagTone: 'warm',
  },
  {
    client: 'Meridian Labs',
    title: 'Q3 retainer',
    value: '$9,000',
    band: 'cold',
    score: 12,
    metrics: 'Not opened yet',
  },
]

/** The list, which is the thing the product actually is. */
export function DashboardShot() {
  return (
    <Frame label="Closewatch · Proposals">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className=" text-lg font-semibold tracking-tight">Proposals</p>
          <p className="mt-0.5 text-xs text-ink-2">
            3 open deals · 1 running hot
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-brand">
            <span aria-hidden className="size-1.5 rounded-full bg-brand-2" />6
            new opens across 2 proposals since yesterday
          </p>
        </div>
      </div>

      <ul className="mt-3 flex flex-col gap-2">
        {ROWS.map((row) => (
          <li
            key={row.client}
            className="group relative overflow-hidden rounded-md border border-line bg-surface px-3 py-2.5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold tracking-[-0.008em]">
                  {row.client}
                </p>
                <p className="truncate text-xs text-ink-2">{row.title}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <span className=" text-sm font-semibold tnum">{row.value}</span>
                <HeatMeter band={row.band} score={row.score} />
              </div>
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-2">
              <span>{row.metrics}</span>
              {row.flag && (
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 kicker',
                    row.flagTone === 'hot'
                      ? 'border border-hot-line bg-hot-soft text-hot'
                      : 'border border-warm-line bg-warm-soft text-warm',
                  )}
                >
                  {row.flag}
                </span>
              )}
            </p>
          </li>
        ))}
      </ul>
    </Frame>
  )
}

const PAGES = [
  { label: 'Page 1 · Cover', pct: 14, time: '8s' },
  { label: 'Page 2 · Scope', pct: 46, time: '26s' },
  { label: 'Page 3 · Pricing', pct: 100, time: '2m 14s', lead: true },
  { label: 'Page 4 · Terms', pct: 22, time: '12s' },
]

/** Per-page attention, with the bars filling as it scrolls into view. */
export function AttentionShot() {
  const { ref, seen } = useInView<HTMLDivElement>()

  return (
    <Frame label="Northwind Studio · Attention by page">
      <div ref={ref} className="space-y-2.5">
        {PAGES.map((page, i) => (
          <div key={page.label} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-xs text-ink-2 sm:w-32">
              {page.label}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
              <div
                className={cn(
                  'h-full rounded-full',
                  page.lead ? 'bg-bar-lead' : 'bg-bar',
                  // Width is the animation. Transitioning it rather than
                  // keyframing keeps the finished state as the resting style,
                  // so a reader who never triggers the observer still sees a
                  // correct chart.
                  'motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out',
                )}
                style={{
                  width: seen ? `${page.pct}%` : '0%',
                  transitionDelay: `${i * 110}ms`,
                }}
              />
            </div>
            <span className="w-12 shrink-0 text-right text-xs tnum text-ink-2">
              {page.time}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 border-t border-line-soft pt-2.5 text-xs text-ink-2">
        Two minutes on pricing is the whole message. That is a call to make
        today.
      </p>
    </Frame>
  )
}

const VISITS = [
  {
    name: 'Dana at Northwind',
    meta: '2h ago · Chrome · macOS',
    time: '1m 12s',
    badges: ['printed'],
    forward: false,
  },
  {
    name: 'Reader 2',
    meta: '1h ago · Safari · iOS',
    time: '48s',
    badges: ['downloaded'],
    forward: true,
  },
  {
    name: 'Reader 3',
    meta: '40m ago · Chrome · Windows',
    time: '1m 40s',
    badges: ['downloaded', 'printed'],
    forward: true,
  },
]

/** The forwarding story: one link, three readers. */
export function ForwardShot() {
  const { ref, seen } = useInView<HTMLUListElement>()

  return (
    <Frame label="Northwind Studio · Recent visits">
      <ul ref={ref} className="divide-y divide-line-soft">
        {VISITS.map((visit, i) => (
          <li
            key={visit.name}
            className={cn(
              'flex items-center justify-between gap-3 py-2',
              visit.forward && 'pl-4',
              'motion-safe:transition-all motion-safe:duration-500 motion-safe:ease-out',
              seen
                ? 'opacity-100 motion-safe:translate-y-0'
                : 'opacity-0 motion-safe:translate-y-1',
            )}
            style={{ transitionDelay: `${i * 220}ms` }}
          >
            <div className="min-w-0">
              <p className="flex min-w-0 items-center gap-1.5 text-xs">
                {visit.forward && (
                  <span aria-hidden className="text-brand">
                    ↳
                  </span>
                )}
                <span className="truncate font-medium">{visit.name}</span>
                {visit.forward && (
                  <span className="truncate text-ink-3">
                    forwarded from Dana
                  </span>
                )}
                {visit.badges.map((b) => (
                  <span
                    key={b}
                    className="rounded-full border border-warm-line bg-warm-soft px-1.5 py-0.5 kicker text-warm"
                  >
                    {b}
                  </span>
                ))}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-3">{visit.meta}</p>
            </div>
            <span className="shrink-0 text-xs tnum text-ink-2">
              {visit.time}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-line-soft pt-2.5 text-xs text-ink-2">
        One link went to Dana. Three distinct readers opened it, which is the
        observation; that it went round the room is the reading you make of it.
      </p>
    </Frame>
  )
}

const SIGNALS = [
  { label: 'Opened by 3 readers', points: 25 },
  { label: '2m 14s on pricing', points: 25 },
  { label: 'Opened 4 times', points: 20 },
  { label: 'Printed it', points: 18 },
]

/** Why a deal is hot, itemised. The reasons are the product. */
export function IntentShot() {
  return (
    <Frame label="Northwind Studio · Why this is hot">
      <div className="flex items-center justify-between gap-3">
        <HeatMeter band="hot" score={86} />
        <span className=" text-sm font-semibold tnum text-ink-2">86 / 100</span>
      </div>
      <ul className="mt-3 space-y-1.5 border-t border-line-soft pt-3">
        {SIGNALS.map((s) => (
          <li
            key={s.label}
            className="flex items-center justify-between gap-3 text-xs"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Check aria-hidden className="size-3.5 shrink-0 text-good" />
              <span className="truncate">{s.label}</span>
            </span>
            <span className="shrink-0 font-mono text-[11px] text-ink-3">
              +{s.points}
            </span>
          </li>
        ))}
      </ul>
    </Frame>
  )
}

/** The link, which is the only thing the client ever sees. */
export function LinkShot() {
  return (
    <Frame label="Northwind Studio · Share links">
      <div className="rounded-md border border-line bg-surface px-3 py-2 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">Dana at Northwind</p>
            <p className="truncate font-mono text-[11px] text-ink-2">
              getclosewatch.com/p/8fJ2qX…
            </p>
            <p className="mt-0.5 text-[11px] text-ink-3">Expires Oct 30</p>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-md border border-good-line bg-good-soft px-2 py-1 text-[11px] font-medium text-good">
            <Link2 aria-hidden className="size-3" />
            Copied
          </span>
        </div>
      </div>
      <p className="mt-3 text-xs text-ink-2">
        One link per recipient. That is how you tell who is reading, and your
        client just sees the proposal.
      </p>
    </Frame>
  )
}
