import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Download, Minus, Plus, Printer } from 'lucide-react'
import { startTracker } from '#/lib/analytics/tracker'
import { cn } from '#/lib/utils'
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
  const base = (title ?? 'proposal')
    .trim()
    .replace(/[^\w.\- ]+/g, '')
    .replace(/\s+/g, '-')
  const stem = base.replace(/\.pdf$/i, '') || 'proposal'
  return `${stem}.pdf`
}

/**
 * The page column's width at 100%: what max-w-4xl and its padding left it
 * before zoom existed, so a reader who never touches the controls sees exactly
 * the viewer they always did.
 */
const FIT_WIDTH = 864
/** How far outside the viewport (px) a page starts rasterising / gets freed. */
const RENDER_MARGIN = 1200

/**
 * Zoom stops, as multiples of the fitted width. A 16:9 deck at 100% is 486px
 * tall and its small print is small; a portrait page already fills the window.
 * The same document is not always the right size, so the reader gets the say.
 */
const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3]
const FIT_STEP = ZOOM_STEPS.indexOf(1)

/**
 * Most pixels one page's canvas may hold. iOS refuses canvases much past 16.7M
 * and draws them blank, and a portrait page at 300% on a 2x screen asks for
 * more than twice that. Past the cap the page renders a little soft instead.
 */
const MAX_CANVAS_PIXELS = 16_000_000

/** Where down the window the reader's place is kept across a zoom. */
const READING_LINE = 0.35

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
  // The band the column sits in, which scrolls sideways once a zoom makes the
  // pages wider than the window.
  const bandRef = useRef<HTMLDivElement>(null)
  const trackerRef = useRef<ReturnType<typeof startTracker> | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  // Which toolbar action is mid-flight, so its button can show progress and we
  // never fire two file fetches at once.
  const [busy, setBusy] = useState<null | 'download' | 'print'>(null)
  const [fitWidth, setFitWidth] = useState<number | null>(null)
  const [step, setStep] = useState(FIT_STEP)
  const zoom = ZOOM_STEPS[step]
  // The reader's place as a fraction of the column's height, captured before a
  // zoom and restored after it, so zooming does not throw them pages away.
  const anchor = useRef<number | null>(null)

  // The fitted width follows the window: the band's content box, capped.
  useEffect(() => {
    const band = bandRef.current
    if (!band) return
    const observer = new ResizeObserver(([entry]) => {
      setFitWidth(Math.min(entry.contentRect.width, FIT_WIDTH))
    })
    observer.observe(band)
    return () => observer.disconnect()
  }, [])

  function changeZoom(next: number) {
    const column = containerRef.current
    if (!column || next < 0 || next >= ZOOM_STEPS.length || next === step)
      return
    const rect = column.getBoundingClientRect()
    anchor.current =
      rect.height > 0
        ? (window.innerHeight * READING_LINE - rect.top) / rect.height
        : null
    setStep(next)
  }

  // Before paint, so the jump and the resize land in the same frame. Every
  // page's height scales with the width, so the same fraction of the column is
  // the same place in the document.
  useLayoutEffect(() => {
    const column = containerRef.current
    const ratio = anchor.current
    anchor.current = null
    if (!column || ratio === null) return
    const rect = column.getBoundingClientRect()
    window.scrollBy(
      0,
      rect.top + ratio * rect.height - window.innerHeight * READING_LINE,
    )
    const band = bandRef.current
    if (band) band.scrollLeft = (band.scrollWidth - band.clientWidth) / 2
  }, [zoom])

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
      frame.style.cssText =
        'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
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
    let sizeObserver: ResizeObserver | null = null
    let loadingTask: PDFDocumentLoadingTask | null = null
    let resizeTimer: number | undefined

    async function run() {
      const { pdfjs } = await import('#/lib/pdf')

      loadingTask = pdfjs.getDocument({ url: pdfUrl })
      const doc = await loadingTask.promise
      const container = containerRef.current
      if (isCancelled() || !container) return

      container.replaceChildren()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      // The column's width is set by the zoom, so what it measures is the
      // width to draw at.
      const contentWidth = () => container.clientWidth || FIT_WIDTH

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
        // Literal white, not a surface token: this holds the rendered PDF page,
        // which is white paper. Tinting it would tint the document.
        wrapper.className = 'mb-6 overflow-hidden rounded-lg bg-white shadow-md'
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

      /**
       * Rasterises page `n` at the column's current width. `force` redraws a
       * page that is already up, swapping the new canvas in only once it is
       * ready, so a zoom or a resize never flashes the page white.
       */
      async function paint(n: number, force = false) {
        if ((rendered.has(n) && !force) || rendering.has(n) || isCancelled())
          return
        rendering.add(n)
        try {
          const page = await doc.getPage(n)
          if (isCancelled()) return
          const base = page.getViewport({ scale: 1 })
          let scale = (contentWidth() / base.width) * dpr
          const pixels = base.width * base.height * scale * scale
          if (pixels > MAX_CANVAS_PIXELS)
            scale *= Math.sqrt(MAX_CANVAS_PIXELS / pixels)
          const viewport = page.getViewport({ scale })

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

      // When the column changes width — a zoom, a resize, a rotate — redraw
      // what is on screen so it stays crisp instead of being CSS-stretched
      // from the old canvas. Watching the column rather than the window is
      // what makes the zoom controls and a window resize the same case.
      let lastWidth = container.clientWidth
      sizeObserver = new ResizeObserver(() => {
        const width = container.clientWidth
        if (width === lastWidth) return
        lastWidth = width
        window.clearTimeout(resizeTimer)
        resizeTimer = window.setTimeout(() => {
          for (const n of [...visible]) void paint(n, true)
        }, 200)
      })
      sizeObserver.observe(container)
    }

    run().catch(() => {
      if (!isCancelled()) setStatus('error')
    })

    return () => {
      cancelled = true
      tracker?.stop()
      trackerRef.current = null
      observer?.disconnect()
      sizeObserver?.disconnect()
      window.clearTimeout(resizeTimer)
      void loadingTask?.destroy()
    }
  }, [pdfUrl, visitId, token])

  return (
    <div className="w-full py-8">
      {/* The toolbar rests below the viewer header, whose measured height the
          route publishes as --viewer-header. The fallback is the height that
          header actually has, so the bar is placed correctly on the server
          render too, before the effect has run. It stays at the document's
          usual width while a zoom widens the pages under it. */}
      {status === 'ready' && (
        <div className="sticky top-[calc(var(--viewer-header,3rem)+0.75rem)] z-10 mx-auto mb-4 flex max-w-4xl justify-end gap-2 px-4">
          <ZoomControls
            zoom={zoom}
            onOut={() => changeZoom(step - 1)}
            onIn={() => changeZoom(step + 1)}
            onReset={() => changeZoom(FIT_STEP)}
            canOut={step > 0}
            canIn={step < ZOOM_STEPS.length - 1}
          />
          <ToolbarButton
            onClick={onDownload}
            busy={busy === 'download'}
            disabled={busy !== null}
          >
            <Download className="size-4" aria-hidden />
            {busy === 'download' ? 'Preparing…' : 'Download'}
          </ToolbarButton>
          <ToolbarButton
            onClick={onPrint}
            busy={busy === 'print'}
            disabled={busy !== null}
          >
            <Printer className="size-4" aria-hidden />
            {busy === 'print' ? 'Preparing…' : 'Print'}
          </ToolbarButton>
        </div>
      )}
      {status === 'loading' && (
        <p className="py-24 text-center text-[13px] text-ink-2">
          Loading document…
        </p>
      )}
      {status === 'error' && (
        <p className="py-24 text-center text-[13px] text-danger">
          This document could not be displayed.
        </p>
      )}
      <div ref={bandRef} className="overflow-x-auto px-4">
        <div
          ref={containerRef}
          className={cn('mx-auto', fitWidth === null && 'w-full max-w-[864px]')}
          style={
            fitWidth === null
              ? undefined
              : { width: Math.round(fitWidth * zoom) }
          }
        />
      </div>
    </div>
  )
}

function ZoomControls({
  zoom,
  onOut,
  onIn,
  onReset,
  canOut,
  canIn,
}: {
  zoom: number
  onOut: () => void
  onIn: () => void
  onReset: () => void
  canOut: boolean
  canIn: boolean
}) {
  const step =
    'grid w-8 place-items-center text-ink-2 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40'

  return (
    // Left of the file actions and apart from them: this changes how the
    // document looks, those two do something with it.
    <div
      role="group"
      aria-label="Zoom"
      className="mr-auto inline-flex items-stretch overflow-hidden rounded-md border border-line bg-surface/90 shadow-sm backdrop-blur"
    >
      <button
        type="button"
        onClick={onOut}
        disabled={!canOut}
        aria-label="Zoom out"
        className={step}
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onReset}
        disabled={zoom === 1}
        aria-label={`Zoom ${Math.round(zoom * 100)}%, reset to fit`}
        title="Reset to fit"
        className="min-w-[3.25rem] border-x border-line px-1 text-[12px] font-medium text-ink-2 tnum transition-colors hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:cursor-default"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        onClick={onIn}
        disabled={!canIn}
        aria-label="Zoom in"
        className={step}
      >
        <Plus className="size-4" aria-hidden />
      </button>
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
      className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface/90 px-3 py-1.5 text-[13px] font-medium text-ink-2 shadow-sm backdrop-blur transition-colors hover:border-ink-3 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  )
}
