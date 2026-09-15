import type { Highlight, HighlightColor, HighlightDraft } from '@highlighter/shared'

import { createAnchor } from '../anchor/locate'
import { applyMark, overlapsMark } from '../dom/mark'
import { buildTextIndex, rangeToOffsets } from '../dom/text-index'
import type { HighlightStore } from '../storage/highlight-store'
import type { PageContext } from './page'

export type CaptureResult =
  | { readonly status: 'created'; readonly highlight: Highlight; readonly range: Range }
  | { readonly status: 'empty' }
  | { readonly status: 'overlapping' }
  | { readonly status: 'unresolvable' }

const currentRange = (): Range | null => {
  const selection = window.getSelection()

  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return null
  }

  const range = selection.getRangeAt(0)

  return range.toString().trim().length > 0 ? range : null
}

/**
 * 선택 영역을 하이라이트로 만든다.
 * 이미 하이라이트된 곳과 겹치면 아무것도 하지 않는다. 중첩 mark 는 삭제 규칙을
 * 복잡하게 만들기 때문에, 예측 가능한 쪽을 택했다.
 */
export async function captureSelection(
  page: PageContext,
  color: HighlightColor,
  store: HighlightStore,
): Promise<CaptureResult> {
  const range = currentRange()

  if (!range) {
    return { status: 'empty' }
  }

  if (overlapsMark(range)) {
    return { status: 'overlapping' }
  }

  const index = buildTextIndex(document.body)
  const offsets = rangeToOffsets(range, index)

  if (!offsets) {
    return { status: 'unresolvable' }
  }

  const draft: HighlightDraft = {
    url: page.url,
    pageTitle: page.title,
    siteHost: page.host,
    text: index.text.slice(offsets.start, offsets.end),
    color,
    anchor: createAnchor(index.text, offsets.start, offsets.end),
  }

  const highlight = await store.add(draft)
  applyMark(range, highlight.id, color)
  window.getSelection()?.removeAllRanges()

  return { status: 'created', highlight, range }
}
