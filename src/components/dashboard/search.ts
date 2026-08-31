import type { ProposalSummary } from '#/lib/analytics/summaries'

/**
 * Every whitespace-separated term has to appear in the client name or the
 * title, in any order — so "acme brand" finds Acme Studio's brand refresh
 * without the words being adjacent, and typing more words always narrows.
 *
 * Deliberately matches only the two fields the owner can recall from memory.
 * Searching status or signal text would surface rows for reasons that are
 * invisible in the result, which reads as a bug.
 */
export function filterByQuery(
  proposals: Array<ProposalSummary>,
  query: string,
): Array<ProposalSummary> {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return proposals

  return proposals.filter((p) => {
    const haystack = `${p.clientName} ${p.title}`.toLowerCase()
    return terms.every((term) => haystack.includes(term))
  })
}
