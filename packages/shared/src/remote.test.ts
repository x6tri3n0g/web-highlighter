import { describe, expect, it } from 'vitest'

import type { Highlight } from './highlight'
import {
  fromRemoteHighlight,
  fromRemoteHighlightPage,
  type RemoteHighlight,
  remoteHighlightSchema,
  toRemoteHighlight,
} from './remote'

const USER_ID = '11111111-1111-4111-8111-111111111111'

const HIGHLIGHT: Highlight = {
  id: 'aaaaaaaa-0000-4000-8000-000000000001',
  userId: USER_ID,
  url: 'https://brunch.co.kr/@writer/12',
  pageTitle: '글쓰기의 감각을 되찾는 법',
  siteHost: 'brunch.co.kr',
  text: '초고는 언제나 버리기 위해 쓴다',
  color: 'yellow',
  anchor: { exact: '초고는 언제나 버리기 위해 쓴다', prefix: '앞', suffix: '뒤', textPosition: 42 },
  createdAt: '2026-09-15T12:00:00.000Z',
}

const ROW: RemoteHighlight = {
  id: HIGHLIGHT.id,
  user_id: USER_ID,
  url: HIGHLIGHT.url,
  page_title: HIGHLIGHT.pageTitle,
  site_host: HIGHLIGHT.siteHost,
  text: HIGHLIGHT.text,
  color: HIGHLIGHT.color,
  anchor: HIGHLIGHT.anchor,
  created_at: HIGHLIGHT.createdAt,
  updated_at: '2026-09-15T12:00:00.000Z',
  deleted_at: null,
}

describe('toRemoteHighlight', () => {
  it('열 이름을 서버 형태로 바꾼다', () => {
    expect(toRemoteHighlight(HIGHLIGHT, USER_ID)).toEqual({
      id: HIGHLIGHT.id,
      user_id: USER_ID,
      url: HIGHLIGHT.url,
      page_title: HIGHLIGHT.pageTitle,
      site_host: HIGHLIGHT.siteHost,
      text: HIGHLIGHT.text,
      color: HIGHLIGHT.color,
      anchor: HIGHLIGHT.anchor,
      created_at: HIGHLIGHT.createdAt,
    })
  })

  it('수정 시각과 삭제 표식은 보내지 않는다', () => {
    const sent = toRemoteHighlight(HIGHLIGHT, USER_ID)

    expect(sent).not.toHaveProperty('updated_at')
    expect(sent).not.toHaveProperty('deleted_at')
  })

  it('로그인 전 기록이라도 보낼 때는 소유자를 채운다', () => {
    const local = { ...HIGHLIGHT, userId: null }

    expect(toRemoteHighlight(local, USER_ID).user_id).toBe(USER_ID)
  })
})

describe('fromRemoteHighlight', () => {
  it('열 이름을 클라이언트 형태로 되돌린다', () => {
    expect(fromRemoteHighlight(ROW)).toEqual(HIGHLIGHT)
  })

  it('양방향으로 오가도 값이 변하지 않는다', () => {
    const roundTripped = fromRemoteHighlight({
      ...toRemoteHighlight(HIGHLIGHT, USER_ID),
      updated_at: ROW.updated_at,
      deleted_at: null,
    })

    expect(roundTripped).toEqual(HIGHLIGHT)
  })

  it('서버가 보낸 값이 스키마에 맞지 않으면 오류를 던진다', () => {
    expect(() => fromRemoteHighlight({ ...ROW, color: '보라' } as unknown as RemoteHighlight)).toThrow()
  })
})

describe('remoteHighlightSchema', () => {
  it('서버 행을 검증한다', () => {
    expect(remoteHighlightSchema.safeParse(ROW).success).toBe(true)
  })

  it('삭제된 행도 받아들인다', () => {
    const deleted = { ...ROW, deleted_at: '2026-09-15T13:00:00.000Z' }

    expect(remoteHighlightSchema.safeParse(deleted).success).toBe(true)
  })

  it('앵커가 모자라면 거절한다', () => {
    const broken = { ...ROW, anchor: { exact: '문장' } }

    expect(remoteHighlightSchema.safeParse(broken).success).toBe(false)
  })
})

describe('fromRemoteHighlightPage', () => {
  it('페이지 묶음을 클라이언트 형태로 바꾼다', () => {
    expect(
      fromRemoteHighlightPage({
        user_id: USER_ID,
        url: HIGHLIGHT.url,
        site_host: HIGHLIGHT.siteHost,
        page_title: HIGHLIGHT.pageTitle,
        highlight_count: 3,
        first_highlighted_at: '2026-09-15T10:00:00.000Z',
        last_highlighted_at: '2026-09-15T12:00:00.000Z',
      }),
    ).toEqual({
      url: HIGHLIGHT.url,
      siteHost: HIGHLIGHT.siteHost,
      pageTitle: HIGHLIGHT.pageTitle,
      highlightCount: 3,
      firstHighlightedAt: '2026-09-15T10:00:00.000Z',
      lastHighlightedAt: '2026-09-15T12:00:00.000Z',
    })
  })
})
