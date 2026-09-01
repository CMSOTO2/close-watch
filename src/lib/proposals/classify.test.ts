import { describe, expect, it } from 'vitest'
import { classifyPages } from './classify'
import type { PageText } from './classify'

const page = (pageNumber: number, text: string): PageText => ({ pageNumber, text })

/** Text of the shape pdfjs hands back: no line structure, just words. */
const SAMPLE = {
  cover: 'Brand Identity Proposal Prepared for Northwind Studio 14 March 2026',
  contents:
    'Table of Contents Executive Summary ..... 2 Scope of Work ..... 3 Timeline ..... 4 Pricing ..... 5 Terms and Conditions ..... 6',
  summary:
    'Executive Summary Northwind came to us with a brand that no longer matched the company it had become. Our objectives for this engagement are to clarify the positioning and rebuild the identity system around it.',
  scope:
    'Scope of Work Deliverables include a full identity system, a typographic scale and a component library. Out of scope: motion design, packaging, and any print production management.',
  timeline:
    'Timeline Phase 1 kickoff in week 1. Discovery runs through week 3, with the first milestone review at the end of week 4. Delivery date for final assets is 12 June.',
  pricing:
    'Pricing Identity system $18,000 Component library $6,500 Art direction $4,000 Subtotal $28,500 Total investment $28,500 Payment schedule: 50% on signature.',
  terms:
    'Terms and Conditions This agreement is governed by the laws of Delaware. Limitation of liability is capped at fees paid. Confidentiality survives termination. Intellectual property transfers on final payment.',
  caseStudy:
    'Case Study We helped Meridian rebuild their identity ahead of a Series B. Results: a 40% increase in inbound qualified leads within two quarters.',
  team: 'Our Team Meet the people doing the work. Sarah is a founder with 12 years of experience in brand systems. Marcus leads art direction.',
}

describe('classifyPages', () => {
  it('reads a normal eight-page proposal end to end', () => {
    const { sections, textless } = classifyPages([
      page(1, SAMPLE.cover),
      page(2, SAMPLE.contents),
      page(3, SAMPLE.summary),
      page(4, SAMPLE.scope),
      page(5, SAMPLE.timeline),
      page(6, SAMPLE.pricing),
      page(7, SAMPLE.caseStudy),
      page(8, SAMPLE.terms),
    ])

    expect(sections).toEqual([
      'cover',
      'other',
      'summary',
      'scope',
      'timeline',
      'pricing',
      'case_study',
      'terms',
    ])
    expect(textless).toBe(false)
  })

  it('finds the pricing page, which is the one that has to be right', () => {
    const { sections } = classifyPages([page(1, 'x'), page(2, SAMPLE.pricing)])
    expect(sections[1]).toBe('pricing')
  })

  // The contents page names every section, so it out-scores every real page.
  it('never tags the table of contents as a real section', () => {
    const { sections } = classifyPages([page(2, SAMPLE.contents)])
    expect(sections[0]).toBe('other')
  })

  // A summary that mentions the number once is not the pricing page.
  it('does not call a page pricing for one mention of money', () => {
    const { sections } = classifyPages([
      page(2, 'Executive Summary We propose a $28,500 engagement to rebuild the identity.'),
    ])
    expect(sections[0]).toBe('summary')
  })

  // A price table is amounts with short labels between them.
  it('treats a dense table of money as pricing even with no heading', () => {
    const { sections } = classifyPages([
      page(4, 'Identity system $18,000 Component library $6,500 Art direction $4,000'),
    ])
    expect(sections[0]).toBe('pricing')
  })

  // The same three amounts, spread through a sentence, are a result not a price.
  it('does not call a case study pricing for quoting three figures', () => {
    const { sections } = classifyPages([
      page(
        6,
        'We saved them $50,000 in the first year, and grew annual revenue from $2M to $5M across the engagement.',
      ),
    ])
    expect(sections[0]).not.toBe('pricing')
  })

  it('only calls page one a cover', () => {
    expect(classifyPages([page(1, SAMPLE.cover)]).sections[0]).toBe('cover')
    expect(classifyPages([page(5, SAMPLE.cover)]).sections[0]).not.toBe('cover')
  })

  it('falls back to other rather than guessing', () => {
    const { sections } = classifyPages([
      page(3, 'A page of prose about nothing in particular that names no section at all.'),
    ])
    expect(sections[0]).toBe('other')
  })

  // A scanned deck has no text layer. Everything is 'other' and the owner is
  // owed an explanation rather than nine silent Others.
  it('reports a PDF with no readable text', () => {
    const { sections, textless } = classifyPages([page(1, ''), page(2, '   ')])
    expect(sections).toEqual(['other', 'other'])
    expect(textless).toBe(true)
  })

  it('returns one section per page, in page order, however they arrive', () => {
    const { sections } = classifyPages([
      page(3, SAMPLE.timeline),
      page(1, SAMPLE.cover),
      page(2, SAMPLE.scope),
    ])
    expect(sections).toEqual(['cover', 'scope', 'timeline'])
  })

  it('handles an empty document', () => {
    expect(classifyPages([])).toEqual({ sections: [], textless: true })
  })
})
