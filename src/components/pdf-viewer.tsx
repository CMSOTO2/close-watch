import { useEffect, useRef, useState } from 'react'
import { startTracker } from '#/lib/analytics/tracker'

type Props = {
  pdfUrl: string
  visitId: string
  token: string
}

/**
 * Renders every page to its own canvas in one scrolling column, then hands the
 * page elements to the tracker.
 *
 * Client-side rendering is the deliberate v1 choice. Server-side rasterisation
 * gives better mobile performance and lets us gate pages, but it needs a worker
 * and a queue, and none of that is worth a week before anyone has paid.
 */
export function PdfViewer({ pdfUrl, visitId, token }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    // Read through a call so control-flow analysis does not treat the flag as
    // settled across the awaits below.
    const isCancelled = () => cancelled
    let tracker: ReturnType<typeof startTracker> | null = null

    async function render() {
      const pdfjs = await import('pdfjs-dist')
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).toString()

      const doc = await pdfjs.getDocument({ url: pdfUrl }).promise
      const container = containerRef.current
      if (isCancelled() || !container) return

      container.replaceChildren()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)

      for (let n = 1; n <= doc.numPages; n++) {
        const page = await doc.getPage(n)
        if (isCancelled()) return

        const width = Math.min(container.clientWidth, 900)
        const base = page.getViewport({ scale: 1 })
        const viewport = page.getViewport({ scale: (width / base.width) * dpr })

        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        canvas.style.width = '100%'
        canvas.style.height = 'auto'

        const wrapper = document.createElement('div')
        wrapper.dataset.page = String(n)
        wrapper.className = 'mb-6 overflow-hidden rounded-lg bg-white shadow-sm'
        wrapper.appendChild(canvas)
        container.appendChild(wrapper)

        const context = canvas.getContext('2d')
        if (context) await page.render({ canvas, canvasContext: context, viewport }).promise
      }

      if (isCancelled()) return
      setStatus('ready')

      tracker = startTracker({
        visitId,
        token,
        getPageElements: () =>
          Array.from(container.querySelectorAll<HTMLElement>('[data-page]')),
      })
    }

    render().catch(() => {
      if (!isCancelled()) setStatus('error')
    })

    return () => {
      cancelled = true
      tracker?.stop()
    }
  }, [pdfUrl, visitId, token])

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      {status === 'loading' && (
        <p className="py-24 text-center text-sm text-neutral-500">Loading document…</p>
      )}
      {status === 'error' && (
        <p className="py-24 text-center text-sm text-red-600">
          This document could not be displayed.
        </p>
      )}
      <div ref={containerRef} />
    </div>
  )
}
