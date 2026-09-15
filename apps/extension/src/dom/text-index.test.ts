import { beforeEach, describe, expect, it } from 'vitest'

import { buildTextIndex, offsetsToRange, rangeToOffsets } from './text-index'

const render = (html: string): HTMLElement => {
  document.body.innerHTML = html
  return document.body
}

const rangeOf = (
  startNode: Node,
  startOffset: number,
  endNode: Node,
  endOffset: number,
): Range => {
  const range = document.createRange()
  range.setStart(startNode, startOffset)
  range.setEnd(endNode, endOffset)
  return range
}

const firstText = (element: Element): Text => element.firstChild as Text

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('buildTextIndex', () => {
  it('중첩된 엘리먼트의 텍스트를 순서대로 이어 붙인다', () => {
    const root = render('<p>문장을 <strong>줄이는</strong> 일은 <em>생각</em>을 줄인다</p>')

    expect(buildTextIndex(root).text).toBe('문장을 줄이는 일은 생각을 줄인다')
  })

  it('script 와 style 의 내용은 본문에서 제외한다', () => {
    const root = render('<p>앞</p><script>var a = 1</script><style>p{color:red}</style><p>뒤</p>')

    expect(buildTextIndex(root).text).toBe('앞뒤')
  })

  it('noscript 와 textarea 의 내용도 제외한다', () => {
    const root = render('<p>앞</p><noscript>대체</noscript><textarea>입력값</textarea><p>뒤</p>')

    expect(buildTextIndex(root).text).toBe('앞뒤')
  })

  it('이미 하이라이트된 mark 의 내용은 본문에 포함한다', () => {
    const root = render('<p>앞 <mark data-highlighter-id="x">가운데</mark> 뒤</p>')

    expect(buildTextIndex(root).text).toBe('앞 가운데 뒤')
  })

  it('빈 텍스트 노드는 건너뛴다', () => {
    const root = render('<p></p><p>본문</p><p></p>')
    const index = buildTextIndex(root)

    expect(index.text).toBe('본문')
    expect(index.entries).toHaveLength(1)
  })

  it('텍스트가 전혀 없으면 빈 색인을 돌려준다', () => {
    const index = buildTextIndex(render('<div><span></span></div>'))

    expect(index.text).toBe('')
    expect(index.entries).toEqual([])
  })
})

describe('rangeToOffsets', () => {
  it('한 텍스트 노드 안의 선택을 오프셋으로 바꾼다', () => {
    const root = render('<p>문장을 줄이는 일은 생각을 줄인다</p>')
    const paragraph = root.querySelector('p')!
    const index = buildTextIndex(root)

    const offsets = rangeToOffsets(rangeOf(firstText(paragraph), 4, firstText(paragraph), 7), index)

    expect(offsets).toEqual({ start: 4, end: 7 })
    expect(index.text.slice(4, 7)).toBe('줄이는')
  })

  it('여러 엘리먼트에 걸친 선택을 오프셋으로 바꾼다', () => {
    const root = render('<p>문장을 <strong>줄이는</strong> 일은 <em>생각</em>을 줄인다</p>')
    const index = buildTextIndex(root)
    const strong = root.querySelector('strong')!
    const em = root.querySelector('em')!

    const offsets = rangeToOffsets(rangeOf(firstText(strong), 0, firstText(em), 2), index)

    expect(index.text.slice(offsets!.start, offsets!.end)).toBe('줄이는 일은 생각')
  })

  it('엘리먼트 경계를 가리키는 Range 도 처리한다', () => {
    const root = render('<p>앞</p><p>뒤</p>')
    const index = buildTextIndex(root)

    const offsets = rangeToOffsets(rangeOf(root, 0, root, 2), index)

    expect(offsets).toEqual({ start: 0, end: 2 })
  })

  it('색인 밖의 노드를 가리키면 null 을 돌려준다', () => {
    const root = render('<p>본문</p>')
    const index = buildTextIndex(root)
    const detached = document.createTextNode('바깥')

    expect(rangeToOffsets(rangeOf(detached, 0, detached, 2), index)).toBeNull()
  })
})

describe('offsetsToRange', () => {
  it('한 텍스트 노드 안의 구간을 Range 로 되돌린다', () => {
    const root = render('<p>문장을 줄이는 일은 생각을 줄인다</p>')
    const index = buildTextIndex(root)

    expect(offsetsToRange(4, 7, index)!.toString()).toBe('줄이는')
  })

  it('여러 엘리먼트에 걸친 구간을 Range 로 되돌린다', () => {
    const root = render('<p>문장을 <strong>줄이는</strong> 일은 <em>생각</em>을 줄인다</p>')
    const index = buildTextIndex(root)
    const start = index.text.indexOf('줄이는')

    expect(offsetsToRange(start, start + 9, index)!.toString()).toBe('줄이는 일은 생각')
  })

  it('오프셋과 Range 변환이 서로 맞물린다', () => {
    const root = render('<p>문장을 <strong>줄이는</strong> 일은 <em>생각</em>을 줄인다</p>')
    const index = buildTextIndex(root)

    const restored = offsetsToRange(3, 11, index)!

    expect(rangeToOffsets(restored, index)).toEqual({ start: 3, end: 11 })
  })

  it('본문 길이를 넘는 구간은 null 을 돌려준다', () => {
    const index = buildTextIndex(render('<p>짧다</p>'))

    expect(offsetsToRange(0, 99, index)).toBeNull()
  })

  it('빈 구간은 null 을 돌려준다', () => {
    const index = buildTextIndex(render('<p>본문</p>'))

    expect(offsetsToRange(1, 1, index)).toBeNull()
  })

  it('음수 구간은 null 을 돌려준다', () => {
    const index = buildTextIndex(render('<p>본문</p>'))

    expect(offsetsToRange(-1, 2, index)).toBeNull()
  })
})

describe('경계 상황', () => {
  it('엘리먼트 안에 텍스트가 없으면 시작 경계를 구하지 못한다', () => {
    const root = render('<div><span></span></div><p>본문</p>')
    const index = buildTextIndex(root)
    const emptySpan = root.querySelector('span')!

    expect(rangeToOffsets(rangeOf(emptySpan, 0, emptySpan, 0), index)).toBeNull()
  })

  it('가리키는 자식이 없는 끝 경계는 null 을 돌려준다', () => {
    const root = render('<p>본문</p>')
    const index = buildTextIndex(root)
    const paragraph = root.querySelector('p')!

    const range = document.createRange()
    range.setStart(firstText(paragraph), 0)
    // 자식 수를 넘어서는 경계를 가리키게 만든다.
    range.setEnd(paragraph, paragraph.childNodes.length)
    const withoutChild = rangeOf(root, 0, root, 0)

    expect(rangeToOffsets(withoutChild, index)).toBeNull()
  })

  it('끝 오프셋이 색인의 어느 노드에도 닿지 않으면 null 을 돌려준다', () => {
    const index = buildTextIndex(render('<p>본문</p>'))

    expect(offsetsToRange(0, index.text.length + 1, index)).toBeNull()
  })

  it('본문이 비어 있으면 어떤 구간도 만들지 못한다', () => {
    const index = buildTextIndex(render('<div></div>'))

    expect(offsetsToRange(0, 1, index)).toBeNull()
  })
})
