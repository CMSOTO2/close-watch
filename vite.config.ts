import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import netlify from '@netlify/vite-plugin-tanstack-start'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    // Netlify emulates its edge runtime (Deno) in dev; we deploy SSR as Node
    // Functions (edgeSSR defaults to false) and ship no edge functions, so turn
    // the Deno-based edge emulator off.
    netlify({ dev: { edgeFunctions: { enabled: false } } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
