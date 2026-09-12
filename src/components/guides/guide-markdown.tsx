import { Markdown } from '@tanstack/markdown/react'
import type { MarkdownComponents } from '@tanstack/markdown/react'
import type { ComponentPropsWithoutRef } from 'react'
import type { MarkdownInput } from '@tanstack/markdown'
import { prose } from '#/components/content-page'
import { headingId, sectionsOf } from '#/lib/markdown-text'
import { cn } from '#/lib/utils'

/**
 * Renders a guide body to match the rest of the site's type rather than the
 * typography plugin's default gray prose. The element styles live in `prose`
 * so the legal pages and About, written in JSX, read the same as this does.
 * Internal links stay plain <a> rather than the router's <Link>: these are
 * static content pages, a full navigation between two of them costs nothing,
 * and it keeps this map free of the router's literal-path typing.
 */
function Anchor(props: ComponentPropsWithoutRef<'a'>) {
  const external = props.href?.startsWith('http') ?? false
  return (
    <a
      {...props}
      className={prose.a}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
    />
  )
}

/**
 * A screenshot, written in a body as `![alt](/images/name.webp "caption")`.
 *
 * Markdown puts an image inside a paragraph, so this is built from spans: a
 * <figure> inside a <p> is invalid HTML, and React reports it as a hydration
 * error. Every file in public/images is exported at 1600x900 (see
 * docs/geo:aeo/search-report-2026-09-11.md), so the size is fixed here and the
 * page reserves the space before the image arrives rather than jumping.
 */
function Image({ src, alt, title }: ComponentPropsWithoutRef<'img'>) {
  return (
    <span className="mt-2 block">
      <img
        src={src}
        alt={alt}
        width={1600}
        height={900}
        loading="lazy"
        decoding="async"
        className="block h-auto w-full rounded-lg border border-line"
      />
      {title && (
        <span className="mt-2 block text-[13px] leading-snug text-ink-3">
          {title}
        </span>
      )}
    </span>
  )
}

const components: MarkdownComponents = {
  h2: (props) => <h2 {...props} className={prose.h2} />,
  h3: (props) => <h3 {...props} className={prose.h3} />,
  p: (props) => <p {...props} className={cn('mt-4', prose.p)} />,
  a: Anchor,
  img: Image,
  strong: (props) => <strong {...props} className={prose.strong} />,
  ul: (props) => <ul {...props} className={cn('mt-4', prose.ul)} />,
  ol: (props) => <ol {...props} className={cn('mt-4', prose.ol)} />,
  blockquote: (props) => <blockquote {...props} className={prose.blockquote} />,
  table: (props) => (
    // Not w-full: a table of short "Yes/No" values stretched to the full
    // 680px column reads as a grid of empty cells. Sized to its own content
    // instead, the way a table in plain text would be, with the scroll
    // container as the fallback for anything that still runs wide. The border
    // sits on the wrapper, so the wrapper has to shrink with it (w-fit) or it
    // draws a box round an empty strip beside the table.
    <div className="mt-5 w-fit max-w-full overflow-x-auto rounded-lg border border-line">
      <table {...props} className="border-collapse text-[14px] leading-snug" />
    </div>
  ),
  thead: (props) => <thead {...props} className="bg-surface-2" />,
  tbody: (props) => (
    <tbody {...props} className="[&>tr:last-child>td]:border-b-0" />
  ),
  th: (props) => (
    <th
      {...props}
      className={cn(
        'border-b border-line px-3 py-2 text-left font-medium text-ink',
        props.className,
      )}
    />
  ),
  td: (props) => (
    <td
      {...props}
      className="border-b border-line px-3 py-2 align-top text-ink-2"
    />
  ),
  pre: (props) => (
    <pre
      {...props}
      className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface-2 p-4 text-[13px]"
    />
  ),
}

export function GuideMarkdown({ children }: { children: MarkdownInput }) {
  return (
    <Markdown components={components} headingIds={headingId}>
      {children}
    </Markdown>
  )
}

/**
 * A guide or the pillar: the answer paragraph, then a table of contents, then
 * the rest of the body.
 *
 * The answer stays first because it is the part a search result or an
 * assistant lifts, and a contents list in front of it would push it down. The
 * contents list is what gives Google anchors to send a searcher straight to
 * the section that answers them.
 */
export function ArticleBody({ body }: { body: string }) {
  const split = body.indexOf('\n\n')
  const answer = body.slice(0, split)
  const rest = body.slice(split + 2)
  const sections = sectionsOf(rest)

  return (
    <>
      <GuideMarkdown>{answer}</GuideMarkdown>
      {sections.length >= 3 && (
        <nav
          aria-label="On this page"
          className="mt-8 rounded-lg border border-line bg-surface px-5 py-4"
        >
          <p className="kicker">On this page</p>
          <ol className="mt-3 flex list-decimal flex-col gap-1.5 pl-5 text-[14px] leading-snug text-ink-2 marker:text-ink-3">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="transition-colors hover:text-ink"
                >
                  {s.text}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <GuideMarkdown>{rest}</GuideMarkdown>
    </>
  )
}
