import * as pdfjs from 'pdfjs-dist'
// `?url` lets Vite resolve the worker inside the package and hand back a real
// served URL. `new URL('pdfjs-dist/...', import.meta.url)` does NOT work: it
// treats the bare specifier as a path relative to the importing module.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

/**
 * pdfjs with its worker wired up. Import this dynamically so the large pdfjs
 * bundle stays out of the initial chunk:  `const { pdfjs } = await import('#/lib/pdf')`.
 */
export { pdfjs }
