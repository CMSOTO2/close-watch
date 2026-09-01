import { useEffect, useRef, useState } from 'react'

/**
 * True once the element has been scrolled into view, and true forever after.
 *
 * The landing page's product shots animate themselves in: bars filling, rows
 * arriving. An animation that plays on mount is one nobody sees, because
 * these sit well below the fold. Latching on rather than toggling means the
 * demo plays once and then holds, instead of replaying on every scroll past.
 */
export function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  // Starts true on the server and for anyone without IntersectionObserver, so
  // the finished state is what renders rather than a permanently empty chart.
  const [seen, setSeen] = useState(true)

  useEffect(() => {
    const el = ref.current
    if (el === null || typeof IntersectionObserver === 'undefined') return

    // Anything already on screen when the page loads is left at its finished
    // state. Rewinding it to zero and playing it forward would be a flicker on
    // something the reader is looking at. The animation is only worth having
    // for the shots they scroll down to.
    const box = el.getBoundingClientRect()
    if (box.top < window.innerHeight && box.bottom > 0) return

    setSeen(false)
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true)
          observer.disconnect()
        }
      },
      { threshold: 0.35 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, seen }
}
