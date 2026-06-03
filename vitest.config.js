import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte({ hot: false })],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,ts}', 'tests/**/*.test.{js,ts}'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.{js,ts}'],
      exclude: ['**/*.svelte', 'src/main.js'],
    },
  },
})
