import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const pkg = require('./package.json')

function getGitHash(): string {
  // Try real git first
  try {
    const hash = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim()
    if (hash && /^[0-9a-f]{7,}/i.test(hash)) return hash
  } catch { /* not available */ }

  // Fallback: CI env vars (AWS CodeBuild etc.)
  const sha =
    process.env.GITHUB_SHA ||
    process.env.GIT_COMMIT ||
    process.env.CI_COMMIT_SHA ||
    process.env.CODEBUILD_RESOLVED_SOURCE_VERSION

  if (sha && sha.length >= 7) return sha.slice(0, 7).toLowerCase()

  return 'dev'
}

const gitHash = getGitHash()
const appVersion = `v${pkg.version} (${gitHash})`

console.log(`[vite] App version: ${appVersion}`)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  server: {
    allowedHosts: ['.ngrok-free.dev'],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
