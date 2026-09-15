import { z } from 'zod'

import { HIGHLIGHT_COLORS } from './colors'

/** 익스텐션의 service worker, content script, popup 이 주고받는 메시지 종류이다. */
export const MESSAGE_TYPE = {
  HIGHLIGHT_SELECTION: 'HIGHLIGHT_SELECTION',
  SCROLL_TO_HIGHLIGHT: 'SCROLL_TO_HIGHLIGHT',
  REMOVE_HIGHLIGHT: 'REMOVE_HIGHLIGHT',
} as const

const highlightSelectionMessageSchema = z.object({
  type: z.literal(MESSAGE_TYPE.HIGHLIGHT_SELECTION),
  color: z.enum(HIGHLIGHT_COLORS).optional(),
})

const scrollToHighlightMessageSchema = z.object({
  type: z.literal(MESSAGE_TYPE.SCROLL_TO_HIGHLIGHT),
  id: z.string().min(1),
})

const removeHighlightMessageSchema = z.object({
  type: z.literal(MESSAGE_TYPE.REMOVE_HIGHLIGHT),
  id: z.string().min(1),
})

export const extensionMessageSchema = z.discriminatedUnion('type', [
  highlightSelectionMessageSchema,
  scrollToHighlightMessageSchema,
  removeHighlightMessageSchema,
])

export type ExtensionMessage = z.infer<typeof extensionMessageSchema>
