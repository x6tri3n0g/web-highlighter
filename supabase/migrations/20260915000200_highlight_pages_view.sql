-- 웹사이트는 하이라이트를 개별 카드로 나열하지 않고 출처 페이지 단위로 묶어 보여준다.
-- 그 묶음을 만들기 위한 뷰이다.
--
-- security_invoker 를 켜야 뷰가 호출한 사람의 권한으로 동작한다. 이것이 없으면
-- 뷰를 만든 사람의 권한으로 돌아가면서 아래 테이블의 RLS 를 통째로 우회한다.

create view public.highlight_pages
with (security_invoker = true)
as
select
  user_id,
  url,
  site_host,
  -- 같은 페이지의 제목이 바뀐 적이 있다면 가장 최근 것을 쓴다.
  (array_agg(page_title order by created_at desc))[1] as page_title,
  count(*)                                            as highlight_count,
  min(created_at)                                     as first_highlighted_at,
  max(created_at)                                     as last_highlighted_at
from public.highlights
where deleted_at is null
group by user_id, url, site_host;

comment on view public.highlight_pages is '하이라이트를 출처 페이지 단위로 묶은 목록';

revoke all on public.highlight_pages from anon;

grant select on public.highlight_pages to authenticated;
