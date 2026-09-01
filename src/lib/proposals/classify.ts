import type { PageSection } from '#/lib/supabase/types'

/**
 * Guesses what each page of a proposal is, from its text.
 *
 * MVP.md skipped this on the grounds that one click per page beats any
 * classifier on accuracy, which is true and is not the point: a ten-page deck
 * is ten dropdowns before the tracking tells you anything, and the owner who
 * gives up halfway gets worse data than a classifier that is right eight times
 * out of ten. So this pre-fills and the owner corrects, rather than deciding.
 *
 * Rules and weights rather than a model, for the same reason intent.ts is rules
 * and weights: when it tags the wrong page you can read why and fix it here.
 */

export type PageText = { pageNumber: number; text: string }

export type Classification = {
  /** One section per page, in page order. */
  sections: Array<PageSection>
  /**
   * True when no page yielded readable text — a scan, or a deck exported as
   * flat images. Every page comes back 'other' and the owner needs telling
   * why, or they will read nine "Other"s as the classifier being useless.
   */
  textless: boolean
}

type Rule = [RegExp, number]
type Guessable = Exclude<PageSection, 'other' | 'cover'>

/**
 * Weights are roughly: 10+ a heading that means only one thing, 5-8 a phrase
 * that strongly suggests the section, 3-4 a supporting word that needs company.
 * THRESHOLD is set so one unambiguous heading carries a page on its own.
 */
const RULES: Record<Guessable, Array<Rule>> = {
  summary: [
    [/executive summary/, 12],
    // "Overview" carries a page on its own. Real decks label the narrative
    // pages "1.1 overview", "1.2 overview" with nothing else to go on, and at
    // a weight below THRESHOLD all of them came back Other. A page that says
    // overview and names no other section is an overview.
    [/\boverview\b/, 8],
    [/\bat a glance\b/, 8],
    [/\bthe opportunity\b/, 7],
    [/\bobjectives?\b/, 4],
    [/\bthe challenge\b/, 4],
    // Weak on their own; they exist to back up the heading above.
    [/\bproblem\b/, 3],
    [/\bimpact\b/, 3],
    [/\bbackground\b/, 3],
  ],
  scope: [
    [/scope of work/, 12],
    [/\bout of scope\b/, 10],
    [/\bdeliverables?\b/, 8],
    [/\bworkstreams?\b/, 7],
    [/\bmethodolog(y|ies)\b/, 6],
    [/\bwhat('s| is| we| you)? ?(will |'ll )?includ(ed|es)?\b/, 5],
    [/\bour approach\b/, 6],
    [/\bservices (provided|included)\b/, 6],
  ],
  timeline: [
    [/\btimelines?\b/, 11],
    [/\bproject schedule\b/, 11],
    [/\bmilestones?\b/, 8],
    [/\bgantt\b/, 8],
    [/\bkick-? ?off\b/, 5],
    [/\bdelivery dates?\b/, 6],
    [/\bphase \d/, 4],
    [/\bweek \d/, 4],
  ],
  pricing: [
    [/\bpricing\b/, 12],
    [/\binvestment\b/, 10],
    [/\btotal (cost|investment|price|fee)/, 10],
    [/\bcost breakdown\b/, 10],
    [/\bsub-?total\b/, 8],
    [/\bfee (schedule|structure)\b/, 8],
    [/\bretainer\b/, 6],
    [/\bhourly rate\b/, 6],
    [/\bpayment (terms|schedule)\b/, 5],
    [/\bper month\b/, 3],
  ],
  terms: [
    [/terms (and|&) conditions/, 12],
    [/\bgoverning law\b/, 10],
    [/\bforce majeure\b/, 10],
    [/\bindemnif(y|ication)\b/, 9],
    [/\bauthori[sz]ed signator|signature\b|\bsign here\b/, 8],
    [/\bconfidentialit(y|ies)\b/, 7],
    [/\blimitation of liability\b|\bliability\b/, 7],
    [/\btermination\b/, 7],
    [/\bintellectual property\b/, 7],
    [/\bwarrant(y|ies)\b/, 5],
  ],
  case_study: [
    [/case stud(y|ies)/, 12],
    [/\bsuccess stor(y|ies)\b/, 11],
    [/\btestimonials?\b/, 10],
    [/\bclient stor(y|ies)\b/, 10],
    [/\d+ ?% (increase|growth|reduction|lift|more)/, 6],
    [/\bwe helped\b/, 6],
    [/\bbefore (and|&) after\b/, 5],
  ],
  team: [
    [/\babout us\b/, 11],
    [/\bwho we are\b/, 11],
    [/\b(our|the) team\b/, 10],
    [/\bmeet the\b/, 8],
    [/\byears of experience\b/, 5],
    [/\b(founder|principal|managing director)s?\b/, 4],
  ],
}

const THRESHOLD = 8

/**
 * Pricing clears a higher bar than everything else. Missing it costs the owner
 * the click they were making anyway; tagging the wrong page as pricing puts a
 * number like "4 minutes on pricing" on the dashboard for a page that is not
 * the pricing page, and MVP.md is right that a fictional number there is worse
 * than no number.
 */
const PRICING_THRESHOLD = 12

/** Money written like money. */
const CURRENCY = /(?:[$£€]\s?\d|(?:\d[\d,]*(?:\.\d{2})?)\s?(?:usd|eur|gbp))/g

/**
 * Amounts alone do not make a pricing page: a case study saying it saved a
 * client $50,000 and grew revenue from $2M to $5M has just as many. What
 * separates them is density. A price table is amounts with short labels
 * between them; prose is amounts inside sentences. At three amounts in nine
 * words a table clears 0.3, while the same three amounts in a sentence sit
 * near 0.15, so the dense case can stand on its own and the sparse one still
 * needs a word like "investment" or "total" to back it up.
 */
const CURRENCY_RUN = 3
const CURRENCY_POINTS = 8
const CURRENCY_DENSE = 0.2
const CURRENCY_DENSE_POINTS = 12

/** Order for ties. Roughly the order these appear in a real proposal. */
const TIE_ORDER: Array<Guessable> = [
  'summary',
  'scope',
  'timeline',
  'pricing',
  'case_study',
  'team',
  'terms',
]

/** Regex safety valve; no real proposal page carries this much text. */
const MAX_CHARS = 20_000

function normalize(text: string): string {
  return text.slice(0, MAX_CHARS).toLowerCase().replace(/\s+/g, ' ').trim()
}

function wordCount(text: string): number {
  return text === '' ? 0 : text.split(' ').length
}

/**
 * A contents page names every section in the document, so it out-scores every
 * real page at once. Catching it is what stops page 2 of a well-made deck from
 * being tagged whatever happened to sort first.
 */
function isContentsPage(text: string, scores: Map<Guessable, number>): boolean {
  if (/table of contents|^contents\b/.test(text)) return true
  // Dot leaders: "Pricing ......... 7".
  if ((text.match(/\.{4,}/g) ?? []).length >= 2) return true
  const scoring = [...scores.values()].filter((s) => s >= THRESHOLD).length
  return scoring >= 4 && wordCount(text) < 160
}

/**
 * A cover is page one, and only page one. It is recognised by having almost no
 * text rather than by what the text says, because covers are a title, a client
 * name and a date in a large font.
 */
function isCover(text: string, pageNumber: number): boolean {
  if (pageNumber !== 1) return false
  const words = wordCount(text)
  if (words <= 60) return true
  return words <= 120 && /\bproposal\b|prepared (for|by)\b/.test(text)
}

function scorePage(text: string): Map<Guessable, number> {
  const scores = new Map<Guessable, number>()

  for (const section of TIE_ORDER) {
    let score = 0
    for (const [pattern, points] of RULES[section]) {
      if (pattern.test(text)) score += points
    }
    scores.set(section, score)
  }

  const currency = (text.match(CURRENCY) ?? []).length
  if (currency >= CURRENCY_RUN) {
    const dense = currency / Math.max(wordCount(text), 1) >= CURRENCY_DENSE
    const points = dense ? CURRENCY_DENSE_POINTS : CURRENCY_POINTS
    scores.set('pricing', (scores.get('pricing') ?? 0) + points)
  }

  return scores
}

function bestSection(scores: Map<Guessable, number>): PageSection {
  let best: Guessable | null = null
  let bestScore = 0

  for (const section of TIE_ORDER) {
    const score = scores.get(section) ?? 0
    const floor = section === 'pricing' ? PRICING_THRESHOLD : THRESHOLD
    if (score >= floor && score > bestScore) {
      best = section
      bestScore = score
    }
  }

  return best ?? 'other'
}

export function classifyPages(pages: Array<PageText>): Classification {
  const ordered = [...pages].sort((a, b) => a.pageNumber - b.pageNumber)
  const texts = ordered.map((p) => normalize(p.text))
  const textless = texts.every((t) => wordCount(t) < 5)

  const sections: Array<PageSection> = ordered.map((page, i) => {
    const text = texts[i]
    if (text === '') return 'other'
    if (isCover(text, page.pageNumber)) return 'cover'

    const scores = scorePage(text)
    if (isContentsPage(text, scores)) return 'other'
    return bestSection(scores)
  })

  return { sections, textless }
}
