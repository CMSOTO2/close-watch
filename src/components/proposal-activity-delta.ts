import { useEffect, useMemo, useRef, useState } from 'react'
import type { ProposalAnalytics } from '#/lib/analytics/proposal-analytics'

export const PROPOSAL_SEEN_KEY = 'cw.proposal.seen'

/**
 * Counters for one proposal as they stood when its page was last open.
 *
 * The dashboard keeps the same kind of snapshot for the list; this is the
 * per-proposal equivalent, and deliberately a separate key. Opening the
 * dashboard should not clear the news on a proposal you have not looked at,
 * and reading one proposal should not clear it for the other nine.
 */
export type ActivitySnapshot = {
  at: string
  opens: number
  viewers: number
  engagedMs: number
  downloads: number
  prints: number
}

export type ActivityDelta = Omit<ActivitySnapshot, 'at'>

/**
 * One key holding every proposal, pruned rather than one key each: a key per
 * proposal turns localStorage into a junk drawer that nothing ever clears.
 */
const MAX_TRACKED = 50

type Totals = ProposalAnalytics['totals']

export function snapshotOf(totals: Totals): ActivitySnapshot {
  return {
    at: new Date().toISOString(),
    opens: totals.qualifiedVisits,
    viewers: totals.distinctViewers,
    engagedMs: totals.totalEngagedMs,
    downloads: totals.downloads,
    prints: totals.prints,
  }
}

/**
 * What moved since that snapshot, or null when nothing did.
 *
 * Counters only climb in normal use, but a bot reclassification can take one
 * backwards, so negatives are floored rather than shown as losses — "1 fewer
 * open than last time" is noise, not news.
 */
export function diffSince(
  snapshot: ActivitySnapshot | null,
  totals: Totals,
): ActivityDelta | null {
  if (snapshot === null) return null

  const delta: ActivityDelta = {
    opens: Math.max(totals.qualifiedVisits - snapshot.opens, 0),
    viewers: Math.max(totals.distinctViewers - snapshot.viewers, 0),
    engagedMs: Math.max(totals.totalEngagedMs - snapshot.engagedMs, 0),
    downloads: Math.max(totals.downloads - snapshot.downloads, 0),
    prints: Math.max(totals.prints - snapshot.prints, 0),
  }

  const moved = Object.values(delta).some((n) => n > 0)
  return moved ? delta : null
}

function isSnapshot(value: unknown): value is ActivitySnapshot {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Partial<ActivitySnapshot>
  return typeof s.at === 'string' && typeof s.opens === 'number'
}

function readAll(): Record<string, ActivitySnapshot> {
  try {
    const raw = window.localStorage.getItem(PROPOSAL_SEEN_KEY)
    if (raw === null) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}

    const out: Record<string, ActivitySnapshot> = {}
    for (const [id, snap] of Object.entries(parsed)) {
      if (isSnapshot(snap)) out[id] = snap
    }
    return out
  } catch {
    // Unreadable or malformed storage just means no news this time.
    return {}
  }
}

function write(proposalId: string, snapshot: ActivitySnapshot) {
  try {
    const all = readAll()
    all[proposalId] = snapshot
    // Keep the most recently seen and drop the tail.
    const kept = Object.entries(all)
      .sort((a, b) => b[1].at.localeCompare(a[1].at))
      .slice(0, MAX_TRACKED)
    window.localStorage.setItem(
      PROPOSAL_SEEN_KEY,
      JSON.stringify(Object.fromEntries(kept)),
    )
  } catch {
    // Storage blocked — next visit simply shows no news.
  }
}

/**
 * What has happened to this proposal since its page was last open.
 *
 * The baseline is read once on mount and never re-read, so the marks hold
 * still while the query refetches underneath them. The new snapshot is written
 * on unmount — on leaving, not on arriving — so a refresh keeps your news and
 * only navigating away clears it. Both are how the dashboard behaves, and the
 * two pages disagreeing about when news expires would be worse than either.
 */
export function useSinceLastCheck(proposalId: string, totals: Totals) {
  // undefined = not read yet (server render and first paint), null = never seen.
  const [baseline, setBaseline] = useState<ActivitySnapshot | null | undefined>(
    undefined,
  )

  const latest = useRef(totals)
  latest.current = totals

  useEffect(() => {
    setBaseline(readAll()[proposalId] ?? null)
    return () => write(proposalId, snapshotOf(latest.current))
  }, [proposalId])

  const delta = useMemo(
    () => (baseline === undefined ? null : diffSince(baseline, totals)),
    [baseline, totals],
  )

  return { delta, since: baseline?.at ?? null }
}
