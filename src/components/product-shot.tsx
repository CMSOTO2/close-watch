import { useState } from 'react'
import { Maximize2, X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { cn } from '#/lib/utils'

/**
 * A product screenshot, in the reader's theme, that opens full size on click.
 *
 * Every screenshot in public/images has a dark twin named `<name>-dark.webp`,
 * made from the same capture run (scripts/product-shots.mjs shoots every
 * screen in both themes). Both are rendered and CSS shows one. A <picture>
 * with a prefers-color-scheme source would be simpler, but it only follows the
 * system setting, and the site's theme is the `dark` class the toggle sets,
 * which can disagree with it.
 *
 * The hidden one is display:none, so it is out of the accessibility tree
 * (hence the same alt on both), and loading="lazy" does not fetch an image
 * that has no box to scroll into view.
 *
 * Every file is exported at 1600x900 (docs/geo:aeo/search-report-2026-09-11.md),
 * so the size is fixed here and the page reserves the space before the image
 * arrives rather than jumping.
 *
 * Squeezed into a 680px reading column a 1600px capture is too small to read,
 * so the shot is a button that opens it in a dialog at up to the full window.
 * `className` goes on that button, which is the box the page lays out.
 */
export function ProductShot({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        aria-label={`Enlarge screenshot: ${alt}`}
        className={cn(
          'group relative block w-full cursor-zoom-in rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          className,
        )}
      >
        <Themed
          src={src}
          alt={alt}
          className="h-auto w-full rounded-lg border border-line transition-colors group-hover:border-ink-3"
        />
        <span className="absolute top-2 right-2 grid size-7 place-items-center rounded-md border border-line bg-surface/90 text-ink-2 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 pointer-coarse:opacity-100">
          <Maximize2 aria-hidden className="size-3.5" />
        </span>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        {/* The content fills the window, so it is what a click beside the
            image lands on; that closes it, the way the overlay would. */}
        <Dialog.Content
          aria-describedby={undefined}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 grid cursor-zoom-out place-items-center p-3 outline-none sm:p-8 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <Dialog.Title className="sr-only">{alt}</Dialog.Title>
          <Themed
            src={src}
            alt={alt}
            className="h-auto max-h-[calc(100dvh-1.5rem)] w-auto max-w-full rounded-lg shadow-2xl sm:max-h-[calc(100dvh-4rem)]"
          />
          <Dialog.Close
            aria-label="Close"
            className="absolute top-3 right-3 grid size-9 cursor-pointer place-items-center rounded-md bg-black/60 text-white transition-colors hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-white"
          >
            <X aria-hidden className="size-5" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** The light capture and its dark twin, one shown by the theme class. */
function Themed({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className: string
}) {
  return (
    <>
      <img
        src={src}
        alt={alt}
        width={1600}
        height={900}
        loading="lazy"
        decoding="async"
        className={cn('block dark:hidden', className)}
      />
      <img
        src={src.replace(/\.webp$/, '-dark.webp')}
        alt={alt}
        width={1600}
        height={900}
        loading="lazy"
        decoding="async"
        className={cn('hidden dark:block', className)}
      />
    </>
  )
}
