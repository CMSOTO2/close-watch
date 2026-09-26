import { cn } from '#/lib/utils'
import type { IntentResult } from '#/lib/analytics/intent'

const STROKE: Record<IntentResult['band'], string> = {
  hot: 'stroke-hot-2',
  warm: 'stroke-warm-2',
  cold: 'stroke-line-strong',
}

/**
 * The intent score as a ring that fills to the score and takes the band's
 * colour. It leads each dashboard row because the score is the answer to the
 * page's one question — who to call — and the ring lets a list of them be
 * compared at a glance, where a column of two-digit numbers has to be read.
 *
 * `opened` false draws the empty track with a dash: an unopened proposal has
 * no score worth drawing, and a ring at 0 would read as a verdict.
 */
export function ScoreRing({
  score,
  band,
  opened,
  size = 52,
  className,
}: {
  score: number
  band: IntentResult['band']
  opened: boolean
  size?: number
  className?: string
}) {
  const stroke = 4
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const filled = opened ? Math.max(0, Math.min(score, 100)) / 100 : 0

  return (
    <span
      className={cn(
        'relative inline-grid shrink-0 place-items-center',
        className,
      )}
      style={{ width: size, height: size }}
      title={opened ? `Intent score ${score} of 100` : 'Not opened yet'}
    >
      <svg
        aria-hidden
        width={size}
        height={size}
        className="absolute inset-0 -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-surface-3"
        />
        {filled > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - filled)}
            className={STROKE[band]}
          />
        )}
      </svg>
      <span
        className={cn(
          'font-semibold tracking-tight tnum',
          size >= 64 ? 'text-2xl' : 'text-base',
        )}
      >
        {opened ? score : '–'}
      </span>
    </span>
  )
}
