import { ContentPage, prose } from '#/components/content-page'
import { cn } from '#/lib/utils'

/**
 * Shared chrome for the privacy policy, the terms and the DPA.
 *
 * Both of the first two are linked from Google's OAuth consent screen, which
 * requires them to sit on the same verified domain as the app, so they are
 * real routes here rather than a hosted document somewhere else.
 *
 * They read like the guides now (see ContentPage): the same column, type and
 * links, and the site's own header and footer rather than a bar of their own.
 * That private bar is how a signed-in owner came to be told to sign in here.
 */
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string
  updated: string
  intro: string
  children: React.ReactNode
}) {
  return (
    <ContentPage
      title={title}
      dek={intro}
      meta={`Last updated ${updated}`}
      after={
        <p className="mt-14 border-t border-line pt-6 text-[14px] leading-relaxed text-ink-2">
          Questions about anything here? Email{' '}
          <a href="mailto:hello@getclosewatch.com" className={prose.a}>
            hello@getclosewatch.com
          </a>
          .
        </p>
      }
    >
      {children}
    </ContentPage>
  )
}

/** One titled block of a policy. */
export function Clause({
  heading,
  children,
}: {
  heading: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className={prose.h2}>{heading}</h2>
      <div className={cn('mt-4', prose.body)}>{children}</div>
    </section>
  )
}

/** A plain bulleted list, used for the "what we store" enumerations. */
export function Bullets({ items }: { items: Array<React.ReactNode> }) {
  return (
    <ul className={prose.ul}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}
