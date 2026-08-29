import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Unique id for this build; exposed to the app as __BUILD_ID__ and written to
// dist/version.json so the running app can detect when a newer deploy exists.
const buildId = Date.now().toString()

// The release bot owns package.json's version, so read it at build time rather
// than keeping a second copy in sync by hand. Shown in the About dialog.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// https://vite.dev/config/
export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'emit-version-json',
      apply: 'build',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({ buildId }),
        })
      },
    },
    {
      // Emits src/sw.js to /sw.js with the build id and the precache list
      // filled in. The list has to be built here because only the bundle knows
      // the hashed filenames; hand-maintaining it would go stale on any deploy
      // that changes a chunk, and a service worker precaching a file that no
      // longer exists is a broken install.
      name: 'emit-service-worker',
      apply: 'build',
      generateBundle(_options, bundle) {
        const hashed = Object.keys(bundle)
          .filter((name) => name.endsWith('.js') || name.endsWith('.css'))
          .map((name) => '/' + name)

        const precache = [
          '/',
          '/index.html',
          ...hashed,
          '/manifest.webmanifest',
          '/box.svg',
          '/icon-192.png',
          '/icon-512.png',
          '/icon-maskable-512.png',
          '/apple-touch-icon.png',
        ]

        const source = readFileSync(new URL('./src/sw.js', import.meta.url), 'utf8')
          .replace(/__BUILD_ID__/g, JSON.stringify(buildId))
          .replace(/__PRECACHE__/g, JSON.stringify(precache))

        this.emitFile({ type: 'asset', fileName: 'sw.js', source })
      },
    },
  ],
})
