import type { Highlight } from '@highlighter/shared'

import { locateAnchor } from '../anchor/locate'
import { applyMark, findMarks } from '../dom/mark'
import { buildTextIndex, offsetsToRange } from '../dom/text-index'

export interface RestoreReport {
  readonly restored: number
  readonly failed: number
}

/**
 * 저장된 하이라이트를 본문에 다시 칠한다.
 * 찾지 못한 것은 지우지 않고 건너뛴다. 사이트가 되돌아오면 다시 살아날 수 있고,
 * 데이터 자체는 웹사이트에서 그대로 읽을 수 있기 때문이다.
 */
export function restoreHighlights(highlights: readonly Highlight[]): RestoreReport {
  return highlights.reduce<RestoreReport>(
    (report, highlight) => {
      // mark 를 칠할 때마다 DOM 이 바뀌므로 색인을 매번 새로 만든다.
      const index = buildTextIndex(document.body)
      const located = locateAnchor(index.text, highlight.anchor)

      if (!located) {
        return { ...report, failed: report.failed + 1 }
      }

      const range = offsetsToRange(located.start, located.end, index)

      /* v8 ignore next 3 -- 같은 색인에서 찾은 구간이므로 Range 변환은 실패하지 않는다. */
      if (!range) {
        return { ...report, failed: report.failed + 1 }
      }

      applyMark(range, highlight.id, highlight.color)

      return { ...report, restored: report.restored + 1 }
    },
    { restored: 0, failed: 0 },
  )
}

/**
 * 아직 본문에 칠해지지 않은 하이라이트만 골라 복원한다.
 * 사이트가 본문을 다시 그리면 mark 가 함께 사라지므로, 사라진 것만 다시 칠한다.
 */
export function restoreMissing(highlights: readonly Highlight[]): RestoreReport {
  return restoreHighlights(
    highlights.filter((highlight) => findMarks(highlight.id).length === 0),
  )
}
