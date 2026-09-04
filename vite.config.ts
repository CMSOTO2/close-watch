import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // The TanStack forms pull in @tanstack/react-store, which imports the named
  // `useSyncExternalStoreWithSelector` from use-sync-external-store's shim. That
  // shim is CommonJS and picks its real implementation with a conditional
  // require, so Vite's on-the-fly export scanner can't see the named export and
  // the dev server throws "does not provide an export named …". The Start plugin
  // already pre-bundles the react-store copy that react-router uses, but not the
  // one react-form-start pulls in; forcing that copy into the pre-bundle makes
  // esbuild inline the shim and resolve the export. The `parent > child` chain
  // starts at react-form-start (a direct dependency) so pnpm can resolve it.
  optimizeDeps: {
    include: [
      '@tanstack/react-form-start > @tanstack/react-form > @tanstack/react-store',
    ],
  },
  plugins: [
    devtools(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
