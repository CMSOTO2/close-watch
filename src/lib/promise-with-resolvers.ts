/**
 * `Promise.withResolvers`, for browsers that do not have it yet.
 *
 * pdfjs-dist v6 calls it in class field initialisers — `PDFDocumentLoadingTask`
 * and `PDFWorker` among them — with no feature detection anywhere, so the very
 * first `getDocument()` throws on a runtime that lacks it and nothing about the
 * error names the cause.
 *
 * It landed in Safari 17.4, which is the whole problem: every browser on iOS is
 * WebKit underneath, Chrome and Firefox included, because Apple requires it. So
 * an iPhone that has not taken the 17.4 update cannot open a PDF here in *any*
 * browser, while the same phone's owner sees it work on their desktop. That is
 * exactly the shape of bug report this arrived as.
 *
 * Imported for its side effect, and imported before pdfjs so it is installed by
 * the time anything constructs one. Six lines is a much better trade than
 * pinning pdfjs back to a version from before it started using this.
 */

type Resolvers<T> = {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: unknown) => void
}

declare global {
  interface PromiseConstructor {
    withResolvers?: <T>() => Resolvers<T>
  }
}

if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function withResolvers<T>(): Resolvers<T> {
    let resolve!: (value: T | PromiseLike<T>) => void
    let reject!: (reason?: unknown) => void
    // The executor runs synchronously, so both are assigned before this returns.
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }
}

export {}
