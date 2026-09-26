import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { ContentPage, prose } from '#/components/content-page'
import { Button } from '#/components/ui/button'
import {
  FOUNDER_LINKEDIN,
  aboutPageJsonLd,
  canonical,
  jsonLdScript,
  organizationJsonLd,
  socialMeta,
} from '#/lib/seo'
import { cn } from '#/lib/utils'

const PATH = '/about'
// The title answers the two searches this page is for: the brand, and the
// founder's name. The H1 is still the pitch.
const TITLE = 'About Closewatch: Proposal Tracking by Carlos Soto'
const DESCRIPTION =
  'Closewatch is proposal tracking software built and run by one person, Carlos Soto. Why it exists, what it records, and who reads the email when you write in.'

export const Route = createFileRoute('/about')({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: 'description', content: DESCRIPTION },
      ...socialMeta({ title: TITLE, description: DESCRIPTION, path: PATH }),
    ],
    links: canonical(PATH),
    scripts: [
      ...jsonLdScript(organizationJsonLd()),
      ...jsonLdScript(
        aboutPageJsonLd({ path: PATH, dateModified: '2026-09-26' }),
      ),
    ],
  }),
  component: About,
})

function About() {
  return (
    <ContentPage
      kicker="About"
      title="A small tool for a specific moment"
      after={
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link to="/login" search={{ mode: 'signup' }}>
              Start free
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="mailto:hello@getclosewatch.com?subject=Hi">Say hello</a>
          </Button>
        </div>
      }
    >
      <div className={cn('mt-6', prose.body)}>
        <p>
          Closewatch exists for the gap after you hit send: the days between a
          proposal going out and a client saying yes, no, or nothing at all.
          That silence is where most deals actually get decided, and it is the
          part every other tool in this category treats as an afterthought.
        </p>
        <p>
          So the product does one thing. You upload a proposal as a PDF, we give
          you a link to send instead of an attachment, and when someone opens it
          you see how they actually read it — how long they spent on pricing,
          whether they came back a second time, whether they forwarded it to
          someone else. Not a guess dressed up as a chart. What happened.
        </p>
        <p>
          It is built and run by one person,{' '}
          {/* The same profile the founder markup names as sameAs, so a reader
              can check the person exists and a crawler can tie the two. */}
          <a
            href={FOUNDER_LINKEDIN}
            target="_blank"
            rel="noopener noreferrer"
            className={prose.a}
          >
            Carlos Soto
          </a>
          , which is mostly a statement about what does not exist yet: no
          support queue, no sales team, no roadmap voted on by a committee. If
          something is broken or missing, an email gets read by the person who
          wrote the code.
        </p>
        <p>
          Getting the read wrong is worse than not reading at all, so the effort
          here goes into telling a real read from a scanner or a security bot
          rather than into features that look good in a screenshot. A tool that
          reports a spam filter&rsquo;s scan as &ldquo;your client opened
          this&rdquo; trains you to stop trusting it, which defeats the point of
          building it.
        </p>
      </div>
    </ContentPage>
  )
}
