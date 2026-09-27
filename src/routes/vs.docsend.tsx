import { createFileRoute } from '@tanstack/react-router'
import { ComparisonPage } from '#/components/compare/comparison-page'
import { comparisonHead } from '#/components/compare/comparison-head'
import { COMPETITORS } from '#/components/compare/competitors'

const c = COMPETITORS.docsend

export const Route = createFileRoute('/vs/docsend')({
  head: () => comparisonHead(c),
  component: () => <ComparisonPage c={c} />,
})
