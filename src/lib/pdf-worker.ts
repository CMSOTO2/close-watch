/**
 * The pdfjs worker, with the polyfill in front of it.
 *
 * A worker gets its own global scope, so the polyfill installed on the main
 * thread does nothing for it — and the worker bundle calls
 * Promise.withResolvers in class fields exactly like the main one does. Without
 * this, fixing the main thread only moves the failure one message deeper, where
 * it surfaces as a worker that dies for no stated reason.
 *
 * Vite builds this as its own entry and hands back a URL for it, which is what
 * pdfjs wants in GlobalWorkerOptions.workerSrc.
 */
import './promise-with-resolvers'
import 'pdfjs-dist/build/pdf.worker.min.mjs'
