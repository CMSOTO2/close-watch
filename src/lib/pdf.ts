// First, and for its side effect. pdfjs v6 calls Promise.withResolvers while
// constructing its own classes, so the polyfill has to be installed before this
// module's other imports are evaluated. Import order does that; moving it below
// the pdfjs import would silently stop working.
import './promise-with-resolvers'
import * as pdfjs from 'pdfjs-dist'
// `?url` lets Vite resolve the worker inside the package and hand back a real
// served URL. `new URL('pdfjs-dist/...', import.meta.url)` does NOT work: it
// treats the bare specifier as a path relative to the importing module.
//
// Deliberately not routed through a wrapper module of ours to get the polyfill
// into the worker's scope as well. `?worker&url` does that, and it also drags
// this 1.6 MB file through Vite's dependency optimiser, which answers 504 for
// it in dev — the worker never loads, pdfjs falls back to its main-thread
// "fake worker", and the console fills with "Importing a module script failed".
// The fallback runs in the scope the polyfill is already installed in, so the
// wrapper bought nothing and cost the dev server.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

/**
 * pdfjs with its worker wired up. Import this dynamically so the large pdfjs
 * bundle stays out of the initial chunk:  `const { pdfjs } = await import('#/lib/pdf')`.
 */
export { pdfjs }
