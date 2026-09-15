import { ANCHOR_CONTEXT_LENGTH, type Anchor } from '@highlighter/shared'

/** 앵커를 어느 단계에서 찾았는지 나타낸다. 복원 품질을 진단할 때 쓴다. */
export type LocateStrategy = 'position' | 'context' | 'exact'

export interface LocatedRange {
  readonly start: number
  readonly end: number
  readonly strategy: LocateStrategy
}

/** 본문 텍스트의 한 구간으로부터 앵커를 만든다. */
export function createAnchor(documentText: string, start: number, end: number): Anchor {
  if (end <= start) {
    throw new Error('빈 구간으로는 앵커를 만들 수 없습니다.')
  }

  return {
    exact: documentText.slice(start, end),
    prefix: documentText.slice(Math.max(0, start - ANCHOR_CONTEXT_LENGTH), start),
    suffix: documentText.slice(end, end + ANCHOR_CONTEXT_LENGTH),
    textPosition: start,
  }
}

const foundAt = (start: number, anchor: Anchor, strategy: LocateStrategy): LocatedRange => ({
  start,
  end: start + anchor.exact.length,
  strategy,
})

/** ① 저장해 둔 위치에 문장이 그대로 있는지 확인한다. */
const byPosition = (documentText: string, anchor: Anchor): LocatedRange | null => {
  const { textPosition, exact } = anchor

  return documentText.startsWith(exact, textPosition)
    ? foundAt(textPosition, anchor, 'position')
    : null
}

/**
 * ② 앞뒤 문맥을 붙인 문자열로 찾는다.
 * 문맥이 길수록 정확하므로, 양쪽 문맥을 모두 붙인 경우를 먼저 시도한다.
 */
const byContext = (documentText: string, anchor: Anchor): LocatedRange | null => {
  const { prefix, exact, suffix } = anchor

  const candidates = [
    { needle: prefix + exact + suffix, offset: prefix.length },
    { needle: prefix + exact, offset: prefix.length },
    { needle: exact + suffix, offset: 0 },
  ].filter(({ needle }) => needle !== exact)

  for (const { needle, offset } of candidates) {
    const index = documentText.indexOf(needle)

    if (index !== -1 && documentText.indexOf(needle, index + 1) === -1) {
      return foundAt(index + offset, anchor, 'context')
    }
  }

  return null
}

/**
 * ③ 문장만으로 찾는다.
 * 후보가 여럿이면 엉뚱한 자리에 칠하는 것보다 칠하지 않는 편이 나으므로 포기한다.
 */
const byExact = (documentText: string, anchor: Anchor): LocatedRange | null => {
  const index = documentText.indexOf(anchor.exact)

  if (index === -1 || documentText.indexOf(anchor.exact, index + 1) !== -1) {
    return null
  }

  return foundAt(index, anchor, 'exact')
}

/**
 * 본문 텍스트에서 앵커가 가리키는 구간을 찾는다.
 * 세 단계를 차례로 시도하고, 모두 실패하면 null 을 돌려준다.
 */
export function locateAnchor(documentText: string, anchor: Anchor): LocatedRange | null {
  return (
    byPosition(documentText, anchor) ??
    byContext(documentText, anchor) ??
    byExact(documentText, anchor)
  )
}
