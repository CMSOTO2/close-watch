import { useState } from 'react'
import { Check, Link2 } from 'lucide-react'
import { useToast } from '#/components/toast'
import { cn } from '#/lib/utils'

/**
 * Copying the share link is the most common thing to do with a proposal, and
 * it used to cost two clicks and a page load. Here it is one click from the
 * list.
 *
 * `relative z-10` lifts it above the row's stretched link so it does not
 * navigate; it is a real sibling <button>, never nested inside the anchor.
 */
export function CopyLinkButton({
  url,
  client,
}: {
  url: string | null
  client: string
}) {
  const notify = useToast()
  const [copied, setCopied] = useState(false)

  // No live link means nothing to copy — render nothing rather than a button
  // that explains itself only after being pressed.
  if (url === null) return null

  async function copy() {
    try {
      await navigator.clipboard.writeText(url as string)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
      notify(`Link for ${client} copied`)
    } catch {
      notify('Could not copy — open the proposal to copy it manually', 'danger')
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy share link for ${client}`}
      className={cn(
        'relative z-10 grid size-7 shrink-0 place-items-center rounded-md border transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        // Quiet until the row is hovered or the button is focused, so the list
        // stays scannable and does not read as a row of buttons. Always visible
        // on touch, where there is no hover to reveal it.
        '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100',
        copied
          ? 'border-good-line bg-good-soft text-good [@media(hover:hover)]:opacity-100'
          : 'border-line-strong bg-surface text-ink-3 hover:border-ink-3 hover:text-ink',
      )}
    >
      {copied ? (
        <Check aria-hidden className="size-3.5" />
      ) : (
        <Link2 aria-hidden className="size-3.5" />
      )}
    </button>
  )
}
