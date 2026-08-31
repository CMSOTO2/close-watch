import { useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'

export function SearchField({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  // "/" jumps to search the way it does in every list-heavy tool, but only when
  // the owner is not already typing somewhere else.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      const el = document.activeElement
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        (el instanceof HTMLElement && el.isContentEditable)
      if (typing) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="relative flex min-w-[168px] flex-1 items-center">
      <Search
        aria-hidden
        className="pointer-events-none absolute left-2.5 size-3.5 text-ink-3"
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Escape') return
          // Escape clears a query first and only blurs once it is already
          // empty, so one keypress never both clears and drops focus.
          if (value) onChange('')
          else e.currentTarget.blur()
        }}
        placeholder="Search client or title"
        aria-label="Search proposals"
        className="w-full rounded-md border border-line bg-surface py-1.5 pl-8 pr-8 text-[13px] text-ink shadow-sm transition-colors placeholder:text-ink-3 hover:border-ink-3 focus-visible:border-brand-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('')
            inputRef.current?.focus()
          }}
          aria-label="Clear search"
          className="absolute right-1.5 grid size-5 place-items-center rounded text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
        >
          <X aria-hidden className="size-3" />
        </button>
      )}
    </div>
  )
}
