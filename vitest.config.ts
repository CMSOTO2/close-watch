import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Standalone config: the app's vite.config.ts loads the TanStack Start and
// Netlify plugins, which spin up an SSR/edge pipeline we do not want under the
// unit-test runner. The trust-core functions under test are plain TS, so a bare
// config keeps the run fast and hermetic. Tests default to the `node`
// environment; the tracker spec opts into jsdom with a per-file directive.
export default defineConfig({
  resolve: {
    alias: {
      '#': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
