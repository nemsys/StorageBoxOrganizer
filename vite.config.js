import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Unique id for this build; exposed to the app as __BUILD_ID__ and written to
// dist/version.json so the running app can detect when a newer deploy exists.
const buildId = Date.now().toString()

// https://vite.dev/config/
export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [
    react(),
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
  ],
})
