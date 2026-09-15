-- Supabase 환경을 흉내 낸다.
--
-- 실제 Supabase 가 만들어 주는 역할과 auth 스키마를, 정책 검증에 필요한 만큼만 재현한다.
-- auth.uid() 의 구현은 Supabase 의 것과 같다. 요청에 실린 JWT 에서 sub 를 읽는다.

create schema if not exists auth;
create schema if not exists test;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
end;
$$;

create table if not exists auth.users (
  id uuid primary key
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claims', true)::jsonb ->> 'sub',
      ''
    ),
    ''
  )::uuid;
$$;

grant usage on schema public to anon, authenticated;
grant usage on schema auth to anon, authenticated;
-- 검증용 보조 함수도 사용자 역할로 바꾼 뒤에 불러야 하므로 권한이 필요하다.
grant usage on schema test to anon, authenticated;
