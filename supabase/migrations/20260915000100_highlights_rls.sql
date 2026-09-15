-- Row Level Security.
--
-- 이 정책이 사용자별 데이터 격리의 전부이다. 애플리케이션 코드에서 user_id 를
-- 거르는 것에 기대지 않는다. 클라이언트가 직접 데이터베이스에 접근하기 때문이다.

alter table public.highlights enable row level security;

-- 테이블 소유자에게도 정책을 적용한다. 정책을 우회하는 경로를 남기지 않기 위해서이다.
alter table public.highlights force row level security;

create policy "자기 하이라이트만 조회한다"
  on public.highlights
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "자기 이름으로만 추가한다"
  on public.highlights
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- using 은 어떤 행을 고칠 수 있는지, with check 는 고친 결과가 무엇이어야 하는지를 정한다.
-- 둘 다 두어야 남의 행을 고치는 것과, 자기 행을 남에게 넘기는 것을 모두 막을 수 있다.
create policy "자기 하이라이트만 수정한다"
  on public.highlights
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "자기 하이라이트만 삭제한다"
  on public.highlights
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- RLS 정책은 접근을 제한할 뿐 허용하지는 않는다. 테이블 권한을 따로 주어야 한다.
--
-- Supabase 는 public 스키마의 새 테이블에 anon 까지 포함해 권한을 자동으로 부여한다.
-- 익명 사용자가 닿을 이유가 없는 테이블이므로 명시적으로 거둬들인다.
-- 정책 하나를 잘못 추가하더라도 권한이 없으면 뚫리지 않는다.
revoke all on public.highlights from anon;

grant select, insert, update, delete on public.highlights to authenticated;
