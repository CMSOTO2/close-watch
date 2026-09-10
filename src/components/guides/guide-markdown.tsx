import { Markdown } from '@tanstack/markdown/react'
import type { MarkdownComponents } from '@tanstack/markdown/react'
import type { ComponentPropsWithoutRef } from 'react'
import type { MarkdownInput } from '@tanstack/markdown'
import { cn } from '#/lib/utils'

/**
 * Renders a guide body to match the rest of the site's type rather than the
 * typography plugin's default gray prose. Internal links stay plain <a>
 * rather than the router's <Link>: these are static content pages, a full
 * navigation between two of them costs nothing, and it keeps this map free of
 * the router's literal-path typing.
 */
function Anchor(props: ComponentPropsWithoutRef<'a'>) {
  const external = props.href?.startsWith('http') ?? false
  return (
    <a
      {...props}
      className="font-medium text-brand underline decoration-brand-line underline-offset-2 hover:text-brand-2"
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
    />
  )
}

const components: MarkdownComponents = {
  h2: (props) => (
    <h2
      {...props}
      className="mt-12 font-display text-2xl font-semibold tracking-[-0.02em] first:mt-0 sm:text-[26px]"
    />
  ),
  h3: (props) => (
    <h3
      {...props}
      className="mt-8 font-display text-lg font-semibold tracking-[-0.015em]"
    />
  ),
  p: (props) => (
    <p {...props} className="mt-4 text-[15px] leading-relaxed text-ink-2" />
  ),
  a: Anchor,
  strong: (props) => <strong {...props} className="font-semibold text-ink" />,
  ul: (props) => (
    <ul
      {...props}
      className="mt-4 flex list-disc flex-col gap-2 pl-5 text-[15px] leading-relaxed text-ink-2 marker:text-ink-3"
    />
  ),
  ol: (props) => (
    <ol
      {...props}
      className="mt-4 flex list-decimal flex-col gap-2 pl-5 text-[15px] leading-relaxed text-ink-2 marker:text-ink-3"
    />
  ),
  blockquote: (props) => (
    <blockquote
      {...props}
      className="mt-4 border-l-2 border-brand-line pl-4 text-ink-2 italic"
    />
  ),
  table: (props) => (
    // Not w-full: a table of short "Yes/No" values stretched to the full
    // 680px column reads as a grid of empty cells. Sized to its own content
    // instead, the way a table in plain text would be, with the scroll
    // container as the fallback for anything that still runs wide.
    <div className="mt-4 overflow-x-auto rounded-lg border border-line">
      <table {...props} className="border-collapse text-[13px]" />
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
