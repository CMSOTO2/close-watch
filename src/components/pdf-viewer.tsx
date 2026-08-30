import { useEffect, useRef, useState } from 'react'
import { Download, Printer } from 'lucide-react'
import { startTracker } from '#/lib/analytics/tracker'
import type { PDFDocumentLoadingTask } from 'pdfjs-dist'

type Props = {
  pdfUrl: string
  visitId: string
  token: string
  /** Used to name the downloaded file. */
  title?: string
}

/** Turn a proposal title into a safe `.pdf` filename. */
function downloadName(title: string | undefined): string {
  const base = (title ?? 'proposal').trim().replace(/[^\w.\- ]+/g, '').replace(/\s+/g, '-')
  const stem = base.replace(/\.pdf$/i, '') || 'proposal'
  return `${stem}.pdf`
}

const MAX_CONTENT_WIDTH = 900
/** How far outside the viewport (px) a page starts rasterising / gets freed. */
const RENDER_MARGIN = 1200

/**
 * Renders the PDF as one scrolling column, but virtualised: pages become real
 * canvases only as they approach the viewport and are freed once far away.
 *
 * Rendering every page up front is what breaks this on phones — iOS caps total
 * canvas memory, so a long proposal shows blank tiles or drops the tab. Here
 * memory stays bounded to a handful of pages no matter the document length, and
 * placeholders sized to each page's aspect ratio keep scroll position and the
 * engagement tracker correct from the first frame.
 */
export function PdfViewer({ pdfUrl, visitId, token, title }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const trackerRef = useRef<ReturnType<typeof startTracker> | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  // Which toolbar action is mid-flight, so its button can show progress and we
  // never fire two file fetches at once.
  const [busy, setBusy] = useState<null | 'download' | 'print'>(null)

  // Fetch the original PDF bytes once per click. Both actions need the real file
  // rather than the on-screen canvases, which are virtualised and low-res.
  async function fetchPdf(): Promise<Blob> {
    const res = await fetch(pdfUrl)
    if (!res.ok) throw new Error(`Failed to fetch PDF (${res.status})`)
    return res.blob()
  }

  async function onDownload() {
    if (busy) return
    setBusy('download')
    trackerRef.current?.recordDownload()
    try {
      const url = URL.createObjectURL(await fetchPdf())
      const a = document.createElement('a')
      a.href = url
      a.download = downloadName(title)
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch {
      // Last resort: hand the signed URL to the browser, which will download or
      // display it. The tracked event is already recorded either way.
      window.open(pdfUrl, '_blank', 'noopener')
    } finally {
      setBusy(null)
    }
  }

  async function onPrint() {
    if (busy) return
    setBusy('print')
    trackerRef.current?.recordPrint()
    try {
      // Print from an off-screen same-origin blob so the browser's PDF engine
      // lays out full-resolution pages, not our virtualised canvases. A blob URL
      // is same-origin, so calling print() on the frame is allowed.
      const url = URL.createObjectURL(await fetchPdf())
      const frame = document.createElement('iframe')
      frame.setAttribute('aria-hidden', 'true')
      frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
      frame.src = url
      frame.onload = () => {
        try {
          frame.contentWindow?.focus()
          frame.contentWindow?.print()
        } catch {
          window.open(pdfUrl, '_blank', 'noopener')
        }
        // Keep the frame alive while the print dialog reads it, then clean up.
        setTimeout(() => {
          frame.remove()
          URL.revokeObjectURL(url)
        }, 60_000)
      }
      document.body.appendChild(frame)
    } catch {
      window.open(pdfUrl, '_blank', 'noopener')
    } finally {
      setBusy(null)
    }
  }

  useEffect(() => {
    let cancelled = false
    const isCancelled = () => cancelled
    let tracker: ReturnType<typeof startTracker> | null = null
    let observer: IntersectionObserver | null = null
    let loadingTask: PDFDocumentLoadingTask | null = null
    let onResize: (() => void) | null = null
    let resizeTimer: number | undefined

    async function run() {
      const { pdfjs } = await import('#/lib/pdf')

      loadingTask = pdfjs.getDocument({ url: pdfUrl })
      const doc = await loadingTask.promise
      const container = containerRef.current
      if (isCancelled() || !container) return

      container.replaceChildren()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const contentWidth = () => Math.min(container.clientWidth || MAX_CONTENT_WIDTH, MAX_CONTENT_WIDTH)

      // Build every page's placeholder first, sized to its aspect ratio, so the
      // column has its true height (and the tracker its page elements) before a
      // single pixel is rasterised.
      const wrappers: Array<HTMLDivElement> = []
      const dims: Array<{ w: number; h: number }> = []
      for (let n = 1; n <= doc.numPages; n++) {
        const page = await doc.getPage(n)
        if (isCancelled()) return
        const base = page.getViewport({ scale: 1 })
        dims[n - 1] = { w: base.width, h: base.height }

        const wrapper = document.createElement('div')
        wrapper.dataset.page = String(n)
        wrapper.className = 'mb-6 overflow-hidden rounded-lg bg-white shadow-sm'
        wrapper.style.aspectRatio = `${base.width} / ${base.height}`
        container.appendChild(wrapper)
        wrappers.push(wrapper)
      }

      if (isCancelled()) return
      setStatus('ready')

      tracker = startTracker({
        visitId,
        token,
        getPageElements: () => wrappers,
      })
      trackerRef.current = tracker

      const rendered = new Set<number>()
      const rendering = new Set<number>()
      const visible = new Set<number>()

      async function paint(n: number) {
        if (rendered.has(n) || rendering.has(n) || isCancelled()) return
        rendering.add(n)
        try {
          const page = await doc.getPage(n)
          if (isCancelled()) return
          const base = page.getViewport({ scale: 1 })
          const viewport = page.getViewport({ scale: (contentWidth() / base.width) * dpr })

          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.style.width = '100%'
          canvas.style.height = 'auto'

          const ctx = canvas.getContext('2d')
          if (!ctx) return
          await page.render({ canvas, canvasContext: ctx, viewport }).promise
          if (isCancelled()) return

          const wrapper = wrappers[n - 1]
          wrapper.style.aspectRatio = ''
          wrapper.replaceChildren(canvas)
          rendered.add(n)
        } catch {
          // One page failing to rasterise leaves its placeholder in place; it
          // must never take down the rest of the document.
        } finally {
          rendering.delete(n)
        }
      }

      function free(n: number) {
        if (!rendered.has(n)) return
        const wrapper = wrappers[n - 1]
        const d = dims[n - 1]
        wrapper.style.aspectRatio = `${d.w} / ${d.h}`
        wrapper.replaceChildren()
        rendered.delete(n)
      }

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const n = Number((entry.target as HTMLElement).dataset.page)
            if (!Number.isFinite(n)) continue
            if (entry.isIntersecting) {
              visible.add(n)
              void paint(n)
            } else {
              visible.delete(n)
              free(n)
            }
          }
        },
        { root: null, rootMargin: `${RENDER_MARGIN}px 0px`, threshold: 0 },
      )
      for (const w of wrappers) observer.observe(w)

      // On resize / rotate, re-rasterise what's on screen so it stays crisp at
      // the new width instead of being CSS-stretched from the old canvas.
      onResize = () => {
        window.clearTimeout(resizeTimer)
        resizeTimer = window.setTimeout(() => {
          for (const n of [...visible]) {
            free(n)
            void paint(n)
          }
        }, 200)
      }
      window.addEventListener('resize', onResize)
    }

    run().catch(() => {
      if (!isCancelled()) setStatus('error')
    })

    return () => {
      cancelled = true
      tracker?.stop()
      trackerRef.current = null
      observer?.disconnect()
      if (onResize) window.removeEventListener('resize', onResize)
      window.clearTimeout(resizeTimer)
      void loadingTask?.destroy()
    }
  }, [pdfUrl, visitId, token])

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      {status === 'ready' && (
        <div className="sticky top-3 z-10 mb-4 flex justify-end gap-2">
          <ToolbarButton onClick={onDownload} busy={busy === 'download'} disabled={busy !== null}>
            <Download className="size-4" aria-hidden />
            {busy === 'download' ? 'Preparing…' : 'Download'}
          </ToolbarButton>
          <ToolbarButton onClick={onPrint} busy={busy === 'print'} disabled={busy !== null}>
            <Printer className="size-4" aria-hidden />
            {busy === 'print' ? 'Preparing…' : 'Print'}
          </ToolbarButton>
        </div>
      )}
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

function ToolbarButton({
  onClick,
  busy,
  disabled,
  children,
}: {
  onClick: () => void
  busy: boolean
  disabled: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={busy}
      className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white/90 px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm backdrop-blur hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  )
}
