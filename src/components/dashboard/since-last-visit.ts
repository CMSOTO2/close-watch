import { useEffect, useMemo, useRef, useState } from 'react'
import type { ProposalSummary } from '#/lib/analytics/summaries'

export const SEEN_KEY = 'cw.dashboard.seen'

/** Per-proposal counters as they stood when the owner last left this page. */
export type Snapshot = {
  at: string
  // Explicitly optional: a proposal created since the snapshot has no entry,
  // and the lookup below genuinely has to handle that.
  byId: Record<string, { visits: number; viewers: number } | undefined>
}

export type Delta = { opens: number; readers: number }

export function snapshotOf(proposals: Array<ProposalSummary>): Snapshot {
  const byId: Snapshot['byId'] = {}
  for (const p of proposals) {
    byId[p.id] = { visits: p.qualifiedVisits, viewers: p.distinctViewers }
  }
  return { at: new Date().toISOString(), byId }
}

/**
 * What moved since that snapshot.
 *
 * Proposals missing from it are skipped rather than reported as all-new: one
 * the owner created since their last visit is not news to them, and its first
 * real open is the thing that should light up instead.
 */
export function diffSince(
  snapshot: Snapshot | null,
  proposals: Array<ProposalSummary>,
): Map<string, Delta> {
  const deltas = new Map<string, Delta>()
  if (snapshot === null) return deltas

  for (const p of proposals) {
    const prev = snapshot.byId[p.id]
    if (!prev) continue

    const opens = p.qualifiedVisits - prev.visits
    const readers = p.distinctViewers - prev.viewers
    // Counters only ever climb, but a deleted-and-recreated id or a bot
    // reclassification could go backwards; negatives are not news.
    if (opens > 0 || readers > 0) {
      deltas.set(p.id, {
        opens: Math.max(opens, 0),
        readers: Math.max(readers, 0),
      })
    }
  }
  return deltas
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** "since yesterday" / "since Tuesday" — the phrasing the header line uses. */
export function sinceLabel(iso: string, now = Date.now()): string {
  const elapsed = now - new Date(iso).getTime()
  if (elapsed < HOUR) return 'since you last looked'
  if (elapsed < DAY)
    return `since ${Math.max(1, Math.round(elapsed / HOUR))}h ago`
  if (elapsed < 2 * DAY) return 'since yesterday'
  if (elapsed < 7 * DAY) {
    return `since ${new Date(iso).toLocaleDateString(undefined, { weekday: 'long' })}`
  }
  return `since ${new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}

function readSnapshot(): Snapshot | null {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as Snapshot).at !== 'string' ||
      typeof (parsed as Snapshot).byId !== 'object'
    ) {
      return null
    }
    return parsed as Snapshot
  } catch {
    // Unreadable or malformed storage just means no news this time.
    return null
  }
}

/**
 * The deltas since the owner's last visit, held steady for the whole session.
 *
 * The baseline is read once on mount and never re-read, so the marks stay put
 * while the query refetches underneath. The new snapshot is written on unmount
 * — on leaving the page, not on arriving — so a refresh keeps your news and
 * only navigating away clears it.
 */
export function useSinceLastVisit(proposals: Array<ProposalSummary>) {
  // undefined = not read yet (server render and first paint), null = no prior visit.
  const [baseline, setBaseline] = useState<Snapshot | null | undefined>(
    undefined,
  )

  const latest = useRef(proposals)
  latest.current = proposals

  useEffect(() => {
    setBaseline(readSnapshot())
    return () => {
      try {
        window.localStorage.setItem(
          SEEN_KEY,
          JSON.stringify(snapshotOf(latest.current)),
        )
      } catch {
        // Storage blocked — next visit simply shows no news.
      }
    }
  }, [])

  const deltas = useMemo(
    () =>
      baseline === undefined
        ? new Map<string, Delta>()
        : diffSince(baseline, proposals),
    [baseline, proposals],
  )

  return { deltas, since: baseline?.at ?? null }
}
