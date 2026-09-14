import { Folder } from 'lucide-react'

/**
 * Which folder a row is filed in, shown under All. Inside a folder it would
 * only repeat the folder being looked at, so the dashboard leaves it off there.
 */
export function FolderTag({ name }: { name: string }) {
  return (
    <span className="inline-flex max-w-40 shrink-0 items-center gap-1 rounded border border-line bg-surface-2 px-1.5 py-px text-[11px] text-ink-2">
      <Folder aria-hidden className="size-3 shrink-0 text-ink-3" />
      <span className="truncate">{name}</span>
    </span>
  )
}
