import { createFileRoute } from '@tanstack/react-router'
import { COMPETITORS } from '#/components/compare/competitors'
import { GUIDES, STAGES } from '#/content/guides'
import { pillar } from '#/content/proposal-tracking'
import { publicEnv } from '#/env'

const origin = publicEnv.VITE_PUBLIC_URL.replace(/\/$/, '')

/**
 * A plain-text index of the site for the language models that look for one
 * (llmstxt.org): what Closewatch is, then every page worth reading with the
 * one line that says what it answers.
 *
 * Built from the same lists the pages render from, so a new guide or
 * comparison appears here without anyone remembering to add it. The evidence
 * that assistants read this file is thin (docs/geo:aeo/02-technical.md). It
 * is here because it cost an hour and costs nothing to keep true.
 */
function body() {
  const guides = STAGES.flatMap((stage) =>
    GUIDES.filter((g) => g.stage === stage.key).map(
      (g) => `- [${g.title}](${origin}/guides/${g.slug}): ${g.description}`,
    ),
  )

  return [
    '# Closewatch',
    '',
    '> Closewatch is proposal tracking software for consultants, agencies and fractional executives. Upload the proposal PDF you already send, share a tracked link instead of the attachment, and see who opened it, time on each page, time on pricing, return visits, new readers (usually a forward), downloads and prints. Each proposal is scored cold, warm or hot with the reasons listed. $19 a month flat, free for two proposals being read at a time. It is not a proposal builder and has no e-signature.',
    '',
    '## Product',
    '',
    `- [Closewatch](${origin}/): proposal tracking software for agencies, with pricing`,
    `- [Live demo](${origin}/demo): read a sample proposal as a client would, then see the tracking report your reading produced`,
    `- [Proposal tracking for agencies](${origin}/proposal-tracking-for-agencies): running many proposals across many clients, and the three places an agency proposal goes quiet`,
    `- [Proposal tracking for fractional executives](${origin}/proposal-tracking-for-fractional-executives): when the person you pitch is not the person who signs, and how a forward shows up`,
    `- [About](${origin}/about): who builds Closewatch`,
    '',
    '## Comparisons',
    '',
    ...Object.values(COMPETITORS).map(
      (c) => `- [${c.socialTitle}](${origin}/vs/${c.slug}): ${c.description}`,
    ),
    '',
    '## Guides',
    '',
    `- [${pillar.title}](${origin}/proposal-tracking): ${pillar.description}`,
    ...guides,
    '',
    '## Policies',
    '',
    `- [Privacy](${origin}/privacy): what Closewatch records about senders and about the people who read their proposals`,
    `- [Terms](${origin}/terms)`,
    `- [Data processing agreement](${origin}/dpa)`,
    '',
  ].join('\n')
}

export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      GET: () =>
        new Response(body(), {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
            'cache-control': 'public, max-age=3600',
          },
        }),
    },
  },
})
