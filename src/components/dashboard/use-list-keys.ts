import { useEffect } from 'react'

/** Rows opt in by carrying this, so the hook never needs to know the markup. */
export const ROW_LINK_ATTR = 'data-row-link'

/**
 * Marks the row the keyboard moved to. The ring keys off this rather than
 * :focus-visible, because that is a browser heuristic about input modality —
 * it happens to do the right thing after a real keypress, but it is not
 * something this feature should depend on being true.
 */
export const ROW_NAV_ATTR = 'data-row-nav'

function rowLinks(): Array<HTMLAnchorElement> {
  return [...document.querySelectorAll<HTMLAnchorElement>(`[${ROW_LINK_ATTR}]`)]
}

function isTyping(): boolean {
  const el = document.activeElement
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement ||
    (el instanceof HTMLElement && el.isContentEditable)
  )
}

/**
 * j/k (and arrow keys) walk the list, Enter opens the focused row.
 *
 * Focus is the selection rather than a separate highlight of our own: it means
 * Tab and the keyboard shortcuts agree on where you are, Enter already works,
 * and screen readers announce the row without extra ARIA. Reading the rows
 * from the DOM keeps this correct through grouping, filtering and search
 * without the hook knowing any of it exists.
 */
export function useListKeys() {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const next =
        e.key === 'j' || e.key === 'ArrowDown'
          ? 1
          : e.key === 'k' || e.key === 'ArrowUp'
            ? -1
            : 0
      if (next === 0 || e.metaKey || e.ctrlKey || e.altKey || isTyping()) return

      const links = rowLinks()
      if (links.length === 0) return

      // Arrow keys scroll the page by default; taking them over is only fair
      // once we know there is a row to move to.
      e.preventDefault()

      const current = links.findIndex((el) => el === document.activeElement)
      const target =
        current === -1
          ? // Nothing focused yet: j enters at the top, k at the bottom.
            next === 1
            ? 0
            : links.length - 1
          : Math.min(Math.max(current + next, 0), links.length - 1)

      for (const el of links) el.removeAttribute(ROW_NAV_ATTR)
      links[target].setAttribute(ROW_NAV_ATTR, '')
      links[target].focus()
      links[target].scrollIntoView({ block: 'nearest' })
    }

    // Clicking or tabbing elsewhere ends the keyboard walk, so the marker does
    // not linger on a row the owner has moved away from.
    function clearMark(e: Event) {
      if (e.target instanceof Element && e.target.hasAttribute(ROW_NAV_ATTR)) {
        return
      }
      for (const el of rowLinks()) el.removeAttribute(ROW_NAV_ATTR)
    }

    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', clearMark)
    document.addEventListener('focusin', clearMark)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', clearMark)
      document.removeEventListener('focusin', clearMark)
    }
  }, [])
}
