// First, and for its side effect. pdfjs v6 calls Promise.withResolvers while
// constructing its own classes, so the polyfill has to be installed before this
// module's other imports are evaluated. Import order does that; moving it below
// the pdfjs import would silently stop working.
import './promise-with-resolvers'
import * as pdfjs from 'pdfjs-dist'
// Our own wrapper rather than the package's worker directly, so the polyfill is
// evaluated inside the worker's scope too — see pdf-worker.ts. `?worker&url`
// makes Vite build it as a worker entry and hand back the served URL, which is
// what workerSrc wants. It has to come out as an ES module worker, because the
// pdfjs worker it imports is one; vite.config.ts sets worker.format for that.
import workerUrl from './pdf-worker?worker&url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

/**
 * pdfjs with its worker wired up. Import this dynamically so the large pdfjs
 * bundle stays out of the initial chunk:  `const { pdfjs } = await import('#/lib/pdf')`.
 */
export { pdfjs }
