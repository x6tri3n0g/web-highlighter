import { z } from 'zod'

import { HIGHLIGHT_COLORS } from './colors'

/** 익스텐션의 service worker 와 content script 가 주고받는 메시지 종류이다. */
export const MESSAGE_TYPE = {
  HIGHLIGHT_SELECTION: 'HIGHLIGHT_SELECTION',
  LIST_PAGE_HIGHLIGHTS: 'LIST_PAGE_HIGHLIGHTS',
} as const

export const highlightSelectionMessageSchema = z.object({
  type: z.literal(MESSAGE_TYPE.HIGHLIGHT_SELECTION),
  color: z.enum(HIGHLIGHT_COLORS).optional(),
})

export const listPageHighlightsMessageSchema = z.object({
  type: z.literal(MESSAGE_TYPE.LIST_PAGE_HIGHLIGHTS),
})

export const extensionMessageSchema = z.discriminatedUnion('type', [
  highlightSelectionMessageSchema,
  listPageHighlightsMessageSchema,
])

export type ExtensionMessage = z.infer<typeof extensionMessageSchema>
