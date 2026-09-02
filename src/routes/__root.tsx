import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  useRouterState,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import { THEME_SCRIPT } from '#/components/theme-toggle'
import { ToastProvider } from '#/components/toast'
import { publicEnv } from '#/env'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Closewatch',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      // The SVG is the real one: it is the only format that can answer
      // prefers-color-scheme, which the mark needs so its tile does not sit as
      // a dark square on a dark tab strip. The PNGs are the fallback for
      // Safari and anything older, and for the iOS home screen, which takes
      // no SVG at all. Browsers that understand the SVG ignore the rest.
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon-32.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '180x180',
        href: '/favicon-180.png',
      },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  // Never on a share link. A reader's visit is already recorded by our own
  // ingest, and the counts on the dashboard are the ones the account holder is
  // paying for — a second, coarser count of the same visit is noise. It also
  // keeps the promise the privacy policy makes to readers: the page they were
  // sent loads no analytics script at all.
  const beaconToken = pathname.startsWith('/p/')
    ? undefined
    : publicEnv.VITE_CF_BEACON_TOKEN

  return (
    // The pre-paint script below sets `class="dark"` on this element before
    // React hydrates, which is the whole point of it — it beats the flash of a
    // light page. React sees an attribute the server did not render and warns.
    // Suppressing is scoped to this element's own attributes, not the tree.
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
        {beaconToken && (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: beaconToken })}
          />
        )}
      </body>
    </html>
  )
}
