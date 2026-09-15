-- 하이라이트 저장소.
--
-- 기본 키는 클라이언트가 만든 uuid 를 그대로 쓴다. 동기화할 때 같은 하이라이트를
-- 두 번 올려도 덮어쓰기로 끝나므로, 별도의 중복 제거 장치가 필요하지 않다.

create table public.highlights (
  id          uuid primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,

  -- 정규화된 URL 이다. 추적 파라미터와 해시를 제거한 형태로 저장한다.
  url         text not null,
  page_title  text not null default '',
  -- 사이트별로 묶어 보기 위한 호스트이다. 앞의 www 는 제거한 형태이다.
  site_host   text not null,

  "text"      text not null,
  color       text not null,
  -- W3C Web Annotation 의 TextQuoteSelector 를 따른 위치 정보이다.
  anchor      jsonb not null,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- 기기 사이의 삭제를 전파하기 위한 표식이다. 실제 행은 지우지 않는다.
  deleted_at  timestamptz,

  constraint highlights_url_not_blank check (length(btrim(url)) > 0),
  constraint highlights_site_host_not_blank check (length(btrim(site_host)) > 0),
  constraint highlights_text_not_blank check (length(btrim("text")) > 0),
  constraint highlights_color_allowed check (color in ('yellow', 'green', 'blue', 'pink')),
  -- 앵커에 반드시 있어야 하는 항목을 확인한다. 이것이 없으면 본문에서 위치를 찾을 수 없다.
  constraint highlights_anchor_shape check (
    jsonb_typeof(anchor) = 'object'
    and anchor ? 'exact'
    and anchor ? 'prefix'
    and anchor ? 'suffix'
    and anchor ? 'textPosition'
    and length(anchor ->> 'exact') > 0
  )
);

comment on table public.highlights is '사용자가 웹에서 하이라이트한 문장';
comment on column public.highlights.id is '클라이언트가 만든 uuid. 동기화를 멱등하게 만든다.';
comment on column public.highlights.deleted_at is '삭제 표식. 기기 사이에 삭제를 전파하기 위해 행을 남겨 둔다.';

-- 날짜별 목록이 가장 잦은 조회이다.
create index highlights_user_created_idx
  on public.highlights (user_id, created_at desc)
  where deleted_at is null;

-- 특정 페이지를 열었을 때의 조회이다.
create index highlights_user_url_idx
  on public.highlights (user_id, url)
  where deleted_at is null;

-- 사이트별 필터이다.
create index highlights_user_host_idx
  on public.highlights (user_id, site_host)
  where deleted_at is null;

-- 동기화할 때 마지막으로 받은 시각 이후의 변경만 가져오기 위한 것이다.
create index highlights_user_updated_idx
  on public.highlights (user_id, updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger highlights_set_updated_at
  before update on public.highlights
  for each row
  execute function public.set_updated_at();
