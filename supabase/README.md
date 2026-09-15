# Supabase

## 구성

| 파일 | 내용 |
|------|------|
| `migrations/20260915000000_create_highlights.sql` | `highlights` 테이블, 제약 조건, 인덱스, 수정 시각 트리거 |
| `migrations/20260915000100_highlights_rls.sql` | Row Level Security 정책과 테이블 권한 |
| `migrations/20260915000200_highlight_pages_view.sql` | 페이지 단위로 묶어 보는 뷰 |
| `tests/run.sh` | 정책 검증을 실행한다 |

## 정책 검증

Docker 만 있으면 Supabase 프로젝트 없이도 정책을 검증할 수 있습니다.

```bash
./supabase/tests/run.sh
```

Postgres 컨테이너를 띄우고 Supabase 환경을 재현한 뒤, 마이그레이션을 적용하고 사용자 두 명으로 서로의 데이터에 닿을 수 없음을 확인합니다. 끝나면 컨테이너를 지웁니다.

## 실제 프로젝트에 적용하기

1. https://supabase.com 에서 프로젝트를 만든다.
2. **SQL Editor** 에서 `migrations/` 의 파일을 이름순으로 실행한다.
3. **Authentication > Providers** 에서 Google 을 켜고, Google Cloud Console 에서 만든 OAuth 클라이언트 정보를 넣는다.
4. **Authentication > URL Configuration** 의 Redirect URLs 에 다음을 더한다.
   - `http://localhost:3000/**` (로컬 개발용)
   - `https://<extension-id>.chromiumapp.org/*` (익스텐션 로그인용, 3단계에서 필요하다)
5. **Project Settings > API** 에서 Project URL 과 anon 키를 복사해 `apps/web/.env.local` 에 넣는다.

`supabase` CLI 를 쓴다면 2번은 `supabase db push` 로 대신할 수 있습니다.

## 키를 다룰 때

`anon` 키는 브라우저에 노출되어도 되는 값입니다. 데이터를 지키는 것은 Row Level Security 이지 키가 아닙니다.

`service_role` 키는 RLS 를 통째로 우회합니다. 저장소에 두거나 `NEXT_PUBLIC_` 으로 시작하는 변수에 넣으면 안 됩니다.
