import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    /** DOM 변환과 mark 삽입을 검증해야 하므로 jsdom 을 기본 환경으로 둔다. */
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/anchor/**',
        'src/dom/**',
        'src/storage/**',
        'src/content/capture.ts',
        'src/content/restore.ts',
        'src/content/restore-scheduler.ts',
      ],
      /**
       * content/index.ts 는 배선이고 popover 는 화면이므로 실제 브라우저에서 확인한다.
       * jsdom 으로 흉내 내면 통과하더라도 실제 동작을 보장하지 못한다.
       */
      exclude: ['**/*.test.ts'],
      reporter: ['text', 'json-summary'],
    },
  },
})
