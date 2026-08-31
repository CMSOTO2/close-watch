import type { ProposalSummary } from '#/lib/analytics/summaries'

/**
 * Two proposals belong to the same client when the typed name matches once
 * case and stray whitespace are ignored — so "Acme" and " acme " merge.
 *
 * Nothing fuzzier than that on purpose. "Los" and "Los Studios" stay separate,
 * because a fuzzy match that guesses wrong silently folds two real clients into
 * one row of money, and being wrong there is far worse than not grouping.
 */
export function clientKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

export type ListEntry =
  | { kind: 'single'; proposal: ProposalSummary }
  | {
      kind: 'group'
      key: string
      clientName: string
      proposals: Array<ProposalSummary>
    }

/**
 * Folds an already-sorted list into groups, leaving one-off clients as plain
 * rows — six groups of one is strictly worse than a flat list.
 *
 * Walking the sorted list rather than the group map is what makes this work
 * with any sort: a group lands at the position of its best-ranked member, and
 * its members stay in the active order inside it. No comparator needs to know
 * grouping exists.
 */
export function groupByClient(
  sorted: Array<ProposalSummary>,
): Array<ListEntry> {
  const byKey = new Map<string, Array<ProposalSummary>>()
  for (const p of sorted) {
    const key = clientKey(p.clientName)
    const existing = byKey.get(key)
    if (existing) existing.push(p)
    else byKey.set(key, [p])
  }

  const emitted = new Set<string>()
  const entries: Array<ListEntry> = []

  for (const p of sorted) {
    const key = clientKey(p.clientName)
    const members = byKey.get(key) ?? [p]

    if (members.length === 1) {
      entries.push({ kind: 'single', proposal: p })
      continue
    }
    if (emitted.has(key)) continue

    emitted.add(key)
    entries.push({
      kind: 'group',
      key,
      // The best-ranked member's spelling wins, so the header matches the row
      // the owner is most likely looking for.
      clientName: members[0].clientName,
      proposals: members,
    })
  }

  return entries
}

/** The strongest intent among a group's proposals — what the header reports. */
export function bestIntent(proposals: Array<ProposalSummary>) {
  return proposals.reduce((best, p) =>
    p.intent.score > best.intent.score ? p : best,
  ).intent
}
