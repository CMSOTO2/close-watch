import { cn } from '#/lib/utils'
import type { IntentResult } from '#/lib/analytics/intent'

type Band = IntentResult['band']

const BARS: Record<Band, number> = { cold: 1, warm: 2, hot: 3 }

// The bars take the mark tier, not the text tier the label beside them uses.
// A 3.5px bar carries no text and answers to the 3:1 floor, which in the light
// theme buys it materially more chroma than --hot/--warm can legally hold.
const FILL: Record<Band, string> = {
  hot: 'bg-hot-2',
  warm: 'bg-warm-2',
  cold: 'bg-cold',
}

const LABEL: Record<Band, string> = {
  hot: 'text-hot',
  warm: 'text-warm',
  cold: 'text-cold',
}

/**
 * Heat as three bars filling by intent score rather than a coloured word: the
 * shape is readable before the label, and it survives colourblindness and
 * printing, where a red-vs-amber pill does not.
 */
export function HeatMeter({ band, score }: { band: Band; score: number }) {
  const filled = BARS[band]

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5"
      title={`Intent score ${score} of 100`}
    >
      <span aria-hidden className="flex h-3.5 items-end gap-[2px]">
        {[6, 10, 14].map((h, i) => (
          <span
            key={h}
            style={{ height: h }}
            className={cn(
              'block w-[3.5px] rounded-[1px]',
              i < filled ? FILL[band] : 'bg-line',
            )}
          />
        ))}
      </span>
      <span
        className={cn(
          // Fixed width: "Hot"/"Warm"/"Cold" differ enough in width to leave
          // the money column ragged down the list otherwise.
          'w-9 text-xs font-semibold capitalize',
          LABEL[band],
        )}
      >
        {band}
      </span>
    </span>
  )
}
