import { createFileRoute } from '@tanstack/react-router'
import { LandingPage, landingMeta } from '#/components/landing/landing-page'

export const Route = createFileRoute('/')({
  head: () => ({ meta: landingMeta() }),
  component: LandingPage,
})
