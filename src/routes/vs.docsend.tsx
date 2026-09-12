import { createFileRoute } from '@tanstack/react-router'
import {
  ComparisonPage,
  comparisonHead,
} from '#/components/compare/comparison-page'
import { COMPETITORS } from '#/components/compare/competitors'

const c = COMPETITORS.docsend

export const Route = createFileRoute('/vs/docsend')({
  head: () => comparisonHead(c),
  component: () => <ComparisonPage c={c} />,
})
