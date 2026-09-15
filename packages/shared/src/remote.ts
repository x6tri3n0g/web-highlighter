import { z } from 'zod'

import { anchorSchema } from './anchor'
import { HIGHLIGHT_COLORS } from './colors'
import { type Highlight, highlightSchema } from './highlight'

/**
 * 서버에 저장된 행의 모양이다. 클라이언트 형태와 따로 정의하고 이 파일에서만 변환한다.
 * 한쪽이 바뀌어도 다른 쪽이 따라 흔들리지 않게 하려는 의도이다.
 */
export const remoteHighlightSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  url: z.string().min(1),
  page_title: z.string(),
  site_host: z.string().min(1),
  text: z.string().min(1),
  color: z.enum(HIGHLIGHT_COLORS),
  anchor: anchorSchema,
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
})

export type RemoteHighlight = z.infer<typeof remoteHighlightSchema>

/** 서버에 보낼 형태이다. 수정 시각과 삭제 표식은 서버가 정한다. */
export const remoteHighlightInputSchema = remoteHighlightSchema.omit({
  updated_at: true,
  deleted_at: true,
})

export type RemoteHighlightInput = z.infer<typeof remoteHighlightInputSchema>

export function toRemoteHighlight(highlight: Highlight, userId: string): RemoteHighlightInput {
  return {
    id: highlight.id,
    user_id: userId,
    url: highlight.url,
    page_title: highlight.pageTitle,
    site_host: highlight.siteHost,
    text: highlight.text,
    color: highlight.color,
    anchor: highlight.anchor,
    created_at: highlight.createdAt,
  }
}

export function fromRemoteHighlight(row: RemoteHighlight): Highlight {
  return highlightSchema.parse({
    id: row.id,
    userId: row.user_id,
    url: row.url,
    pageTitle: row.page_title,
    siteHost: row.site_host,
    text: row.text,
    color: row.color,
    anchor: row.anchor,
    createdAt: row.created_at,
  })
}

/** 웹사이트에서 페이지 단위로 묶어 보여줄 때 쓰는 행이다. */
export const remoteHighlightPageSchema = z.object({
  user_id: z.uuid(),
  url: z.string().min(1),
  site_host: z.string().min(1),
  page_title: z.string(),
  highlight_count: z.number().int().nonnegative(),
  first_highlighted_at: z.string(),
  last_highlighted_at: z.string(),
})

export type RemoteHighlightPage = z.infer<typeof remoteHighlightPageSchema>

export interface HighlightPage {
  readonly url: string
  readonly siteHost: string
  readonly pageTitle: string
  readonly highlightCount: number
  readonly firstHighlightedAt: string
  readonly lastHighlightedAt: string
}

export function fromRemoteHighlightPage(row: RemoteHighlightPage): HighlightPage {
  return {
    url: row.url,
    siteHost: row.site_host,
    pageTitle: row.page_title,
    highlightCount: row.highlight_count,
    firstHighlightedAt: row.first_highlighted_at,
    lastHighlightedAt: row.last_highlighted_at,
  }
}
