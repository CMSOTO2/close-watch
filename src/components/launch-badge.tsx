/**
 * The Nick Launches "featured" badge.
 *
 * Two images rather than one, swapped by the same `dark:` class the theme
 * toggle uses, because the badge is a flat PNG with baked-in colours: the light
 * one on a dark footer is a white brick, and the dark one on a light footer is
 * a black one. This mirrors how ThemeToggle picks its icon — CSS off the `dark`
 * class the pre-paint script has already set, not state — so the right badge is
 * on screen in the first frame instead of swapping after hydration.
 *
 * `width` and `height` are the directory's own numbers, so the row reserves the
 * space before a cross-origin image we do not control arrives — or never does.
 * The height is then pinned in CSS and the width left to the file's real ratio,
 * because the badge is 480x112 and 244x56 is not quite that: honouring both
 * numbers stretches it about 2% wide.
 *
 * Everything else about the markup is the snippet the directory gives out, kept
 * as-is: the utm parameters are how they attribute the click back, and
 * rewriting them would quietly break their side of the deal.
 */
const HREF =
  'https://nicklaunches.com/products/closewatch/?utm_source=getclosewatch.com&utm_medium=badge&utm_campaign=featured'

const ALT = 'Closewatch on Nick Launches'

export function LaunchBadge({ className }: { className?: string }) {
  // No aria-label on the link: the hidden badge is display:none and so out of
  // the accessibility tree, which leaves exactly one alt to name it.
  return (
    <a href={HREF} target="_blank" rel="noopener" className={className}>
      <img
        src="https://nicklaunches.com/badges/featured.png"
        alt={ALT}
        width={244}
        height={56}
        loading="lazy"
        decoding="async"
        className="block h-14 w-auto dark:hidden"
      />
      <img
        src="https://nicklaunches.com/badges/featured-dark.png"
        alt={ALT}
        width={244}
        height={56}
        loading="lazy"
        decoding="async"
        className="hidden h-14 w-auto dark:block"
      />
    </a>
  )
}
