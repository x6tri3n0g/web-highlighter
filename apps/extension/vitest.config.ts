import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    /** DOM 변환과 mark 삽입을 검증해야 하므로 jsdom 을 기본 환경으로 둔다. */
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/anchor/**', 'src/dom/**', 'src/storage/**'],
      exclude: ['**/*.test.ts'],
      reporter: ['text', 'json-summary'],
    },
  },
})
