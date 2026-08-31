import { cn } from '#/lib/utils'

/**
 * The one shell width for the whole app — 1280px, with padding that steps up
 * with the viewport. Every page and every sticky header uses it, so the left
 * edge of the content lines up from the wordmark down through the list.
 *
 * Blocks that are read rather than scanned (forms, prose) constrain themselves
 * *inside* this shell rather than narrowing the shell itself, which is what
 * keeps that alignment while a 1280px-wide text input never happens.
 */
export function PageContainer({
  className,
  children,
  asMain = false,
}: {
  className?: string
  children: React.ReactNode
  /** Renders a <main> instead of a <div>, for a page's primary content. */
  asMain?: boolean
}) {
  const Comp = asMain ? 'main' : 'div'

  return (
    <Comp
      className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)}
    >
      {children}
    </Comp>
  )
}
