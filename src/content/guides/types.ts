/**
 * A guide is reading, not a landing page: no pricing card, no product screenshot,
 * just the answer to a question someone typed into an assistant. Closewatch gets
 * named where it is genuinely the answer and admitted as the wrong fit where it
 * isn't — the thing that makes a comparison worth citing instead of skipping.
 */
/**
 * Where in the life of a sent proposal a guide's question comes up. The guides
 * are deliberately about what happens after hitting send, not about writing
 * the proposal, and the index groups them in this order so the set reads as
 * one sequence rather than a pile of posts.
 */
export type GuideStage =
  'sending' | 'reading' | 'silence' | 'follow-up' | 'negotiating' | 'closing'

export type Guide = {
  slug: string
  stage: GuideStage
  /** The <title> and the H1. Matches the question as someone would ask it. */
  title: string
  /** 150-160 chars, contains the answer, not a teaser. */
  description: string
  /** One line under the title on the index card. */
  dek: string
  datePublished: string
  dateModified: string
  /** Markdown body. Starts at H2 — the page renders its own H1 from `title`. */
  body: string
}
