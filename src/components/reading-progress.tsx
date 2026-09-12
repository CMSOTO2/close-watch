import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

/**
 * A thin bar across the top of the viewport that fills as the article is read:
 * empty while its top is still below the top of the window, full when its last
 * line reaches the bottom. Measured against the article rather than the page,
 * so the call to action and footer after it do not count as reading left.
 *
 * The fill is written straight to the element's transform on each animation
 * frame rather than held in state, so scrolling never re-renders the page. A
 * ResizeObserver catches the article growing as lazy screenshots arrive.
 */
export function ReadingProgress({
  target,
}: {
  target: RefObject<HTMLElement | null>
}) {
  const bar = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = target.current
    if (!el) return

    let frame = 0
    const update = () => {
      frame = 0
      const rect = el.getBoundingClientRect()
      const total = rect.height - window.innerHeight
      const done = total <= 0 ? 1 : Math.min(1, Math.max(0, -rect.top / total))
      if (bar.current) bar.current.style.transform = `scaleX(${done})`
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    const observer = new ResizeObserver(schedule)
    observer.observe(el)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [target])

  // Above the sticky header (z-30), below dialogs (z-50).
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[3px]"
    >
      <div
        ref={bar}
        className="h-full origin-left bg-brand-2"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  )
}
