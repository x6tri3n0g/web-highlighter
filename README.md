# Web Highlighter

읽고 있는 글에서 마음에 든 문장을 단축키로 하이라이트하고, 그 기록을 날짜별로 모아 보는 도구입니다.
크롬 익스텐션과 웹사이트 두 개의 앱으로 구성되어 있습니다.

## 구성

| 경로 | 이름 | 설명 |
|------|------|------|
| `apps/extension` | `@highlighter/extension` | 크롬 익스텐션 (Manifest V3, Vite + CRXJS + React) |
| `apps/web` | `@highlighter/web` | 하이라이트 열람 웹사이트 (Next.js App Router) |
| `packages/shared` | `@highlighter/shared` | 두 앱이 함께 쓰는 타입, zod 스키마, 색상 상수, URL 정규화 |

## 시작하기

```bash
pnpm install

pnpm dev:extension   # apps/extension/dist 를 크롬에 "압축해제된 확장 프로그램" 으로 불러온다
pnpm dev:web         # http://localhost:3000
```

## 검증 명령

```bash
pnpm typecheck
pnpm test
pnpm build
```

## 단축키

문장을 선택한 뒤 `option` + `S` 를 누르면 하이라이트됩니다.
일부 사이트가 같은 조합을 이미 사용하고 있다면 `chrome://extensions/shortcuts` 에서 변경할 수 있습니다.

## 구현 순서

1. 익스텐션이 로컬 저장소만으로 동작한다. (단축키, 4색, 재방문 시 복원)
2. Supabase 스키마와 Row Level Security 정책을 구성한다.
3. 익스텐션에 구글 로그인과 서버 동기화를 붙인다.
4. 웹에 로그인과 날짜별 목록 화면을 만든다.
5. 필터와 검색을 추가한다.

설계 문서는 옵시디언 저장소의 `Make/웹 하이라이터.md` 에 정리되어 있습니다.
