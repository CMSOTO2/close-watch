import { cn } from '#/lib/utils'

/**
 * A product screenshot, in the reader's theme.
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
  const base = 'block h-auto w-full rounded-lg border border-line'
  return (
    <>
      <img
        src={src}
        alt={alt}
        width={1600}
        height={900}
        loading="lazy"
        decoding="async"
        className={cn(base, 'dark:hidden', className)}
      />
      <img
        src={src.replace(/\.webp$/, '-dark.webp')}
        alt={alt}
        width={1600}
        height={900}
        loading="lazy"
        decoding="async"
        className={cn(base, 'hidden dark:block', className)}
      />
    </>
  )
}
