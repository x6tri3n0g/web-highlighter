/** 본문으로 취급하지 않는 엘리먼트. 화면에 글로 보이지 않거나 사용자 입력값이다. */
const EXCLUDED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA'])

export interface TextIndexEntry {
  readonly node: Text
  /** 이 노드의 첫 글자가 본문 전체에서 차지하는 위치이다. */
  readonly start: number
  readonly end: number
}

export interface TextIndex {
  readonly text: string
  readonly entries: readonly TextIndexEntry[]
}

export interface TextOffsets {
  readonly start: number
  readonly end: number
}

const isExcluded = (node: Text): boolean => {
  for (let parent = node.parentElement; parent; parent = parent.parentElement) {
    if (EXCLUDED_TAGS.has(parent.tagName)) {
      return true
    }
  }

  return false
}

const collectTextNodes = (root: Node): Text[] => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const textNode = node as Text

    if (textNode.data.length > 0 && !isExcluded(textNode)) {
      nodes.push(textNode)
    }
  }

  return nodes
}

/**
 * 본문 전체 텍스트와, 각 텍스트 노드가 그 안에서 차지하는 구간을 함께 만든다.
 * 이 색인이 DOM 세계와 텍스트 세계를 잇는 유일한 통로이다.
 */
export function buildTextIndex(root: Node): TextIndex {
  const { entries, text } = collectTextNodes(root).reduce<{
    entries: TextIndexEntry[]
    text: string
  }>(
    (accumulated, node) => ({
      entries: [
        ...accumulated.entries,
        { node, start: accumulated.text.length, end: accumulated.text.length + node.data.length },
      ],
      text: accumulated.text + node.data,
    }),
    { entries: [], text: '' },
  )

  return { entries, text }
}

/** Range 의 한쪽 끝을 본문 텍스트의 위치로 바꾼다. */
const boundaryToOffset = (container: Node, offset: number, index: TextIndex): number | null => {
  if (container.nodeType === Node.TEXT_NODE) {
    const entry = index.entries.find(({ node }) => node === container)

    return entry ? entry.start + Math.min(offset, entry.node.data.length) : null
  }

  // 엘리먼트 경계를 가리키는 경우이다. 해당 자식보다 앞에 있는 텍스트의 총 길이를 구한다.
  const childBefore = container.childNodes[offset - 1]

  if (offset === 0) {
    const firstInside = index.entries.find(({ node }) => container.contains(node))

    return firstInside ? firstInside.start : null
  }

  /* v8 ignore next 3 -- Range 는 DOM 변경에 맞춰 경계가 자동 보정되므로 도달하지 않는다. */
  if (!childBefore) {
    return null
  }

  const lastInside = [...index.entries]
    .reverse()
    .find(({ node }) => childBefore === node || childBefore.contains(node))

  return lastInside ? lastInside.end : null
}

/** 선택 영역을 본문 텍스트의 구간으로 바꾼다. */
export function rangeToOffsets(range: Range, index: TextIndex): TextOffsets | null {
  const start = boundaryToOffset(range.startContainer, range.startOffset, index)
  const end = boundaryToOffset(range.endContainer, range.endOffset, index)

  if (start === null || end === null || end <= start) {
    return null
  }

  return { start, end }
}

const entryAt = (offset: number, index: TextIndex, isEnd: boolean): TextIndexEntry | undefined =>
  index.entries.find((entry) =>
    isEnd ? offset > entry.start && offset <= entry.end : offset >= entry.start && offset < entry.end,
  )

/** 본문 텍스트의 구간을 다시 Range 로 되돌린다. */
export function offsetsToRange(start: number, end: number, index: TextIndex): Range | null {
  if (start < 0 || end <= start || end > index.text.length) {
    return null
  }

  const startEntry = entryAt(start, index, false)
  const endEntry = entryAt(end, index, true)

  /* v8 ignore next 3 -- 위 길이 검사를 통과하면 색인이 구간을 빠짐없이 덮으므로 도달하지 않는다. */
  if (!startEntry || !endEntry) {
    return null
  }

  const range = document.createRange()
  range.setStart(startEntry.node, start - startEntry.start)
  range.setEnd(endEntry.node, end - endEntry.start)

  return range
}
