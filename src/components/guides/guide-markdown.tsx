import { Markdown } from '@tanstack/markdown/react'
import type { MarkdownComponents } from '@tanstack/markdown/react'
import type { ComponentPropsWithoutRef } from 'react'
import type { MarkdownInput } from '@tanstack/markdown'
import { prose } from '#/components/content-page'
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

const components: MarkdownComponents = {
  h2: (props) => <h2 {...props} className={prose.h2} />,
  h3: (props) => <h3 {...props} className={prose.h3} />,
  p: (props) => <p {...props} className={cn('mt-4', prose.p)} />,
  a: Anchor,
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
  return <Markdown components={components}>{children}</Markdown>
}
