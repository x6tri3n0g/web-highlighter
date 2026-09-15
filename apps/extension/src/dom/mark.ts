import {
  HIGHLIGHT_COLOR_HEX,
  HIGHLIGHT_TEXT_COLOR,
  type HighlightColor,
} from '@highlighter/shared'

export const MARK_ID_ATTRIBUTE = 'data-highlighter-id'
export const MARK_COLOR_ATTRIBUTE = 'data-highlighter-color'

/**
 * Range 안에 완전히 또는 부분적으로 들어가는 텍스트 노드를 모은다.
 * Range.surroundContents() 는 여러 엘리먼트에 걸치면 예외를 던지므로,
 * 텍스트 노드를 하나씩 잘라 감싸는 방식을 쓴다.
 */
const textNodesIn = (range: Range): Text[] => {
  const walker = document.createTreeWalker(
    range.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? (range.commonAncestorContainer.parentNode ?? range.commonAncestorContainer)
      : range.commonAncestorContainer,
    NodeFilter.SHOW_TEXT,
  )

  const nodes: Text[] = []

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const textNode = node as Text

    if (textNode.data.length > 0 && range.intersectsNode(textNode)) {
      nodes.push(textNode)
    }
  }

  return nodes
}

/** Range 가 이 노드에서 실제로 덮는 구간을 구한다. */
const sliceWithin = (node: Text, range: Range): { start: number; end: number } => ({
  start: node === range.startContainer ? range.startOffset : 0,
  end: node === range.endContainer ? range.endOffset : node.data.length,
})

/**
 * 눈에 보이는 색은 인라인 배경색이 결정하고, 속성은 지금 색이 무엇인지 알려 준다.
 * 둘이 어긋나면 저장된 색과 보이는 색이 달라지므로 언제나 함께 바꾼다.
 */
const paint = (mark: HTMLElement, color: HighlightColor): void => {
  mark.setAttribute(MARK_COLOR_ATTRIBUTE, color)
  mark.style.backgroundColor = HIGHLIGHT_COLOR_HEX[color]
  // 인라인으로 지정해야 사이트의 다크 모드 규칙보다 우선한다.
  mark.style.color = HIGHLIGHT_TEXT_COLOR
}

const wrap = (node: Text, id: string, color: HighlightColor): HTMLElement => {
  const mark = document.createElement('mark')
  mark.setAttribute(MARK_ID_ATTRIBUTE, id)
  paint(mark, color)

  node.parentNode?.insertBefore(mark, node)
  mark.appendChild(node)

  return mark
}

/** 선택 영역을 mark 로 감싼다. 여러 엘리먼트에 걸치면 엘리먼트마다 나누어 감싼다. */
export function applyMark(range: Range, id: string, color: HighlightColor): HTMLElement[] {
  if (range.collapsed) {
    return []
  }

  // 감싸는 과정에서 DOM 이 바뀌므로, 대상 노드를 먼저 모두 확정해 둔다.
  const targets = textNodesIn(range).flatMap((node) => {
    const { start, end } = sliceWithin(node, range)

    if (end <= start) {
      return []
    }

    // splitText 로 필요한 부분만 남긴다. 뒤쪽을 먼저 잘라야 앞쪽 오프셋이 유지된다.
    if (end < node.data.length) {
      node.splitText(end)
    }

    return [start > 0 ? node.splitText(start) : node]
  })

  return targets.map((node) => wrap(node, id, color))
}

/** 선택 영역이 이미 하이라이트된 곳과 겹치는지 확인한다. */
export function overlapsMark(range: Range): boolean {
  return [...document.querySelectorAll<HTMLElement>(`mark[${MARK_ID_ATTRIBUTE}]`)].some((mark) =>
    range.intersectsNode(mark),
  )
}

export function findMarks(id: string): HTMLElement[] {
  return [
    ...document.querySelectorAll<HTMLElement>(`mark[${MARK_ID_ATTRIBUTE}="${CSS.escape(id)}"]`),
  ]
}

/** 하이라이트의 색을 바꾼다. 여러 조각으로 나뉘어 있으면 모두 바꾼다. */
export function setMarkColor(id: string, color: HighlightColor): void {
  for (const mark of findMarks(id)) {
    paint(mark, color)
  }
}

/** mark 를 풀어 원래 텍스트로 되돌린다. */
export function removeMark(id: string): void {
  for (const mark of findMarks(id)) {
    const parent = mark.parentNode

    /* v8 ignore next 3 -- querySelectorAll 이 돌려준 노드는 항상 부모를 갖지만, 타입상 확인이 필요하다. */
    if (!parent) {
      continue
    }

    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark)
    }

    parent.removeChild(mark)
    // 감싸면서 쪼개졌던 텍스트 노드를 다시 하나로 합친다.
    parent.normalize()
  }
}
