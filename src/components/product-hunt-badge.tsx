/**
 * The Product Hunt "featured" badge, with its live upvote count.
 *
 * Off until the launch opens, and off on purpose rather than for want of the
 * id. Fetched pre-launch, this badge renders "FIND US ON Product Hunt" over a
 * literal 0. Zero is worse than nothing on a home page, which is the same
 * reason Product Hunt keeps its own rating badge locked while a product has no
 * reviews.
 *
 * To turn it on when the launch opens (12:01am PDT, 8 Sep 2026): set POST_ID
 * to LAUNCH_POST_ID and deploy. That is the entire change. Shipping it tonight
 * in the off state is the point — the build, the layout and the dark-mode swap
 * are all proven now, so launch morning is a one-line edit rather than the
 * first time this code has ever run.
 *
 * LAUNCH_POST_ID is the *launch* id, not the product id (1309896, which is
 * what the follow and review badges key off). They are different numbers and
 * the featured badge will not render correctly given the wrong one.
 */
const LAUNCH_POST_ID = 1241637

// The switch. Set this to LAUNCH_POST_ID when the launch opens.
//
// A nullable id rather than a boolean beside the id, because a `const X = false`
// narrows to the literal type `false` and the guard below then reads as a
// tautology with everything after it as dead code. This way the check is a real
// narrowing of a real union, and the edit is still one line.
const POST_ID: number | null = null

/**
 * Two images swapped by the same `dark:` class the theme toggle uses, matching
 * LaunchBadge: the badge is a flat raster with baked-in colours, so the light
 * one on a dark page is a white brick. Doing it in CSS off the class the
 * pre-paint script has already set means the right badge is on screen in the
 * first frame instead of swapping after hydration.
 *
 * The utm parameters are Product Hunt's own, kept exactly as their snippet
 * gives them out, because that is how they attribute the click back.
 *
 * The one thing dropped from their snippet is the `t=<timestamp>` on the image
 * URL. That is a cache-buster stamped at the moment you press copy, so pasting
 * it verbatim pins every visitor to one fixed URL forever. The count on this
 * badge is the only reason to run it, so the URL is left stable and Product
 * Hunt's own cache headers decide how often it refreshes.
 */
const WIDTH = 250
const HEIGHT = 54

const ALT =
  'Closewatch - Stop guessing whether the client read your proposal | Product Hunt'

const HREF =
  'https://www.producthunt.com/products/closewatch?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-closewatch'

function badgeSrc(theme: 'light' | 'dark') {
  return `https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=${POST_ID}&theme=${theme}`
}

export function ProductHuntBadge({ className }: { className?: string }) {
  if (POST_ID === null) return null

  return (
    <a
      href={HREF}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {/* No aria-label on the link: the hidden badge is display:none and so out
          of the accessibility tree, which leaves exactly one alt to name it. */}
      <img
        src={badgeSrc('light')}
        alt={ALT}
        width={WIDTH}
        height={HEIGHT}
        loading="lazy"
        decoding="async"
        className="block h-[54px] w-auto dark:hidden"
      />
      <img
        src={badgeSrc('dark')}
        alt={ALT}
        width={WIDTH}
        height={HEIGHT}
        loading="lazy"
        decoding="async"
        className="hidden h-[54px] w-auto dark:block"
      />
    </a>
  )
}
