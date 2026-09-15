import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import manifest from './manifest.config.ts'

/**
 * 개발 빌드와 운영 빌드의 결과물은 서로 다르다. 매니페스트가 가리키는 파일 이름도,
 * web_accessible_resources 의 범위도 다르다.
 *
 * 두 빌드가 같은 폴더를 쓰면 운영 빌드가 emptyOutDir 로 폴더를 비우는 순간
 * 크롬이 불러다 쓰던 파일이 사라진다. 그래서 출력 폴더를 나눈다.
 *
 * - dev     → dist     크롬에 불러오는 폴더. 개발 서버만 건드린다.
 * - build   → release  배포용 묶음. 개발 중에 만들어도 dist 를 건드리지 않는다.
 */
export default defineConfig(({ command }) => ({
  plugins: [react(), crx({ manifest })],
  build: {
    outDir: command === 'serve' ? 'dist' : 'release',
    emptyOutDir: true,
  },
}))
