import { z } from 'zod'

import { anchorSchema } from './anchor'
import { HIGHLIGHT_COLORS } from './colors'

export const highlightSchema = z.object({
  id: z.uuid(),
  /** 로그인 전 로컬에만 저장된 하이라이트는 소유자가 정해지지 않는다. */
  userId: z.uuid().nullable(),
  url: z.url(),
  pageTitle: z.string(),
  siteHost: z.string().min(1),
  text: z.string().min(1),
  color: z.enum(HIGHLIGHT_COLORS),
  anchor: anchorSchema,
  createdAt: z.iso.datetime(),
})

export type Highlight = z.infer<typeof highlightSchema>

/** 클라이언트가 서버로 보내는 신규 하이라이트이다. 식별자와 소유자는 서버가 채운다. */
export const highlightDraftSchema = highlightSchema.omit({
  id: true,
  userId: true,
  createdAt: true,
})

export type HighlightDraft = z.infer<typeof highlightDraftSchema>

export const highlightListSchema = z.array(highlightSchema)
