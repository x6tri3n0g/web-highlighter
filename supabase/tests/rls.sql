-- Row Level Security 정책 검증.
--
-- 사용자 두 명을 만들어 서로의 데이터에 닿을 수 없음을 확인한다.
-- 정책이 무너지면 한 사용자가 다른 사용자의 하이라이트를 모두 읽게 되므로,
-- 이 프로젝트에서 가장 중요한 검증이다.

\set ON_ERROR_STOP on

begin;

create or replace function test.assert(condition boolean, description text)
returns void
language plpgsql
as $$
begin
  if condition then
    raise notice '  통과: %', description;
  else
    raise exception '  실패: %', description;
  end if;
end;
$$;

-- 사용자를 흉내 낸다. Supabase 의 auth.uid() 는 요청에 실린 JWT 에서 sub 를 읽는다.
create or replace function test.act_as(user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', user_id::text, 'role', 'authenticated')::text,
    true
  );
end;
$$;

create or replace function test.act_as_owner()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

do $$
declare
  alice uuid := '11111111-1111-4111-8111-111111111111';
  bob   uuid := '22222222-2222-4222-8222-222222222222';
  visible_count int;
  affected int;
  blocked boolean;
begin
  raise notice '--- 준비: 사용자 두 명의 하이라이트를 심는다 ---';

  perform test.act_as_owner();

  insert into auth.users (id) values (alice), (bob);

  insert into public.highlights (id, user_id, url, page_title, site_host, "text", color, anchor)
  values
    ('aaaaaaaa-0000-4000-8000-000000000001', alice,
     'https://brunch.co.kr/@writer/12', '글쓰기', 'brunch.co.kr',
     '초고는 언제나 버리기 위해 쓴다', 'yellow',
     '{"exact":"초고는 언제나 버리기 위해 쓴다","prefix":"","suffix":"","textPosition":0}'),
    ('aaaaaaaa-0000-4000-8000-000000000002', alice,
     'https://brunch.co.kr/@writer/12', '글쓰기', 'brunch.co.kr',
     '문장을 줄이는 일', 'blue',
     '{"exact":"문장을 줄이는 일","prefix":"","suffix":"","textPosition":40}'),
    ('bbbbbbbb-0000-4000-8000-000000000001', bob,
     'https://velog.io/@dev/post', '개발', 'velog.io',
     '밥의 비밀 메모', 'green',
     '{"exact":"밥의 비밀 메모","prefix":"","suffix":"","textPosition":0}');

  raise notice '--- 조회 격리 ---';

  perform test.act_as(alice);
  select count(*) into visible_count from public.highlights;
  perform test.assert(visible_count = 2, '앨리스에게는 자기 하이라이트 2개만 보인다');

  select count(*) into visible_count from public.highlights where user_id = bob;
  perform test.assert(visible_count = 0, '앨리스가 밥의 하이라이트를 지목해도 보이지 않는다');

  perform test.act_as(bob);
  select count(*) into visible_count from public.highlights;
  perform test.assert(visible_count = 1, '밥에게는 자기 하이라이트 1개만 보인다');

  raise notice '--- 뷰도 같은 격리를 따른다 ---';

  perform test.act_as(alice);
  select count(*) into visible_count from public.highlight_pages;
  perform test.assert(visible_count = 1, '앨리스에게는 페이지 묶음 1개만 보인다');

  select highlight_count into visible_count
  from public.highlight_pages where url = 'https://brunch.co.kr/@writer/12';
  perform test.assert(visible_count = 2, '페이지 묶음의 개수가 맞다');

  raise notice '--- 남의 이름으로 추가할 수 없다 ---';

  blocked := false;
  begin
    insert into public.highlights (id, user_id, url, page_title, site_host, "text", color, anchor)
    values ('cccccccc-0000-4000-8000-000000000001', bob,
            'https://example.com/a', '제목', 'example.com', '끼워 넣기', 'yellow',
            '{"exact":"끼워 넣기","prefix":"","suffix":"","textPosition":0}');
  exception when insufficient_privilege then
    blocked := true;
  end;
  perform test.assert(blocked, '앨리스가 밥의 이름으로 추가하려 하면 막힌다');

  raise notice '--- 자기 이름으로는 추가할 수 있다 ---';

  insert into public.highlights (id, user_id, url, page_title, site_host, "text", color, anchor)
  values ('aaaaaaaa-0000-4000-8000-000000000003', alice,
          'https://example.com/a', '제목', 'example.com', '내 것', 'pink',
          '{"exact":"내 것","prefix":"","suffix":"","textPosition":0}');
  select count(*) into visible_count from public.highlights;
  perform test.assert(visible_count = 3, '앨리스가 자기 이름으로 추가하면 들어간다');

  raise notice '--- 남의 것을 고치거나 지울 수 없다 ---';

  update public.highlights set color = 'pink'
  where id = 'bbbbbbbb-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  perform test.assert(affected = 0, '앨리스가 밥의 하이라이트를 고쳐도 한 건도 바뀌지 않는다');

  delete from public.highlights
  where id = 'bbbbbbbb-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  perform test.assert(affected = 0, '앨리스가 밥의 하이라이트를 지워도 한 건도 지워지지 않는다');

  perform test.act_as(bob);
  select count(*) into visible_count from public.highlights where user_id = bob;
  perform test.assert(visible_count = 1, '밥의 하이라이트는 그대로 남아 있다');

  raise notice '--- 자기 것을 남에게 넘길 수 없다 ---';

  blocked := false;
  begin
    update public.highlights set user_id = alice
    where id = 'bbbbbbbb-0000-4000-8000-000000000001';
  exception when insufficient_privilege then
    blocked := true;
  end;
  perform test.assert(blocked, '밥이 자기 하이라이트를 앨리스 것으로 넘기려 하면 막힌다');

  raise notice '--- 로그인하지 않으면 테이블에 닿지도 못한다 ---';

  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '', true);

  blocked := false;
  begin
    select count(*) into visible_count from public.highlights;
  exception when insufficient_privilege then
    blocked := true;
  end;
  perform test.assert(blocked, '익명 사용자는 하이라이트 테이블에 접근조차 못한다');

  blocked := false;
  begin
    select count(*) into visible_count from public.highlight_pages;
  exception when insufficient_privilege then
    blocked := true;
  end;
  perform test.assert(blocked, '익명 사용자는 페이지 묶음 뷰에도 접근하지 못한다');

  raise notice '--- 제약 조건 ---';

  perform test.act_as(alice);

  blocked := false;
  begin
    insert into public.highlights (id, user_id, url, page_title, site_host, "text", color, anchor)
    values ('aaaaaaaa-0000-4000-8000-000000000009', alice,
            'https://example.com/b', '제목', 'example.com', '색이 이상하다', '보라',
            '{"exact":"색이 이상하다","prefix":"","suffix":"","textPosition":0}');
  exception when check_violation then
    blocked := true;
  end;
  perform test.assert(blocked, '정해진 네 가지 밖의 색은 들어가지 않는다');

  blocked := false;
  begin
    insert into public.highlights (id, user_id, url, page_title, site_host, "text", color, anchor)
    values ('aaaaaaaa-0000-4000-8000-00000000000a', alice,
            'https://example.com/b', '제목', 'example.com', '앵커가 모자라다', 'yellow',
            '{"exact":"앵커가 모자라다"}');
  exception when check_violation then
    blocked := true;
  end;
  perform test.assert(blocked, '앵커에 필요한 항목이 빠지면 들어가지 않는다');

  raise notice '--- 수정 시각은 서버가 정한다 ---';

  -- now() 는 트랜잭션 시작 시각이므로 한 트랜잭션 안에서는 created_at 과 값이 같다.
  -- 그래서 시각을 비교하는 대신, 클라이언트가 보낸 값을 트리거가 덮어쓰는지 확인한다.
  -- 동기화할 때 클라이언트가 수정 시각을 속이지 못하게 하는 것이 이 트리거의 목적이다.
  update public.highlights
  set color = 'green', updated_at = timestamptz '2000-01-01 00:00:00+00'
  where id = 'aaaaaaaa-0000-4000-8000-000000000001';

  select count(*) into visible_count from public.highlights
  where id = 'aaaaaaaa-0000-4000-8000-000000000001'
    and updated_at > timestamptz '2020-01-01 00:00:00+00';
  perform test.assert(visible_count = 1, '클라이언트가 보낸 수정 시각을 서버 시각으로 덮어쓴다');

  select count(*) into visible_count from public.highlights
  where id = 'aaaaaaaa-0000-4000-8000-000000000001' and color = 'green';
  perform test.assert(visible_count = 1, '수정 내용 자체는 반영된다');

  raise notice '';
  raise notice '모든 검증을 통과했습니다.';
end;
$$;

rollback;
