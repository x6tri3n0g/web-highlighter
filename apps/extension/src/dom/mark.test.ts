import { HIGHLIGHT_COLOR_HEX } from '@highlighter/shared'
import { beforeEach, describe, expect, it } from 'vitest'

import { applyMark, findMarks, overlapsMark, removeMark, setMarkColor } from './mark'
import { buildTextIndex, offsetsToRange } from './text-index'

const render = (html: string): HTMLElement => {
  document.body.innerHTML = html
  return document.body
}

/** jsdom 은 style.backgroundColor 를 rgb() 형태로 돌려주므로 비교 전에 맞춰 준다. */
const hexToRgb = (hex: string): string => {
  const value = Number.parseInt(hex.slice(1), 16)

  return `rgb(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255})`
}

const rangeFor = (root: HTMLElement, needle: string): Range => {
  const index = buildTextIndex(root)
  const start = index.text.indexOf(needle)

  if (start === -1) {
    throw new Error(`본문에서 찾지 못했습니다: ${needle}`)
  }

  return offsetsToRange(start, start + needle.length, index)!
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('applyMark', () => {
  it('한 텍스트 노드 안의 구간을 mark 로 감싼다', () => {
    const root = render('<p>문장을 줄이는 일은 생각을 줄인다</p>')

    const marks = applyMark(rangeFor(root, '줄이는'), 'abc', 'yellow')

    expect(marks).toHaveLength(1)
    expect(root.querySelector('mark')!.textContent).toBe('줄이는')
    expect(root.textContent).toBe('문장을 줄이는 일은 생각을 줄인다')
  })

  it('여러 엘리먼트에 걸친 구간을 엘리먼트마다 나누어 감싼다', () => {
    const root = render('<p>문장을 <strong>줄이는</strong> 일은 <em>생각</em>을 줄인다</p>')

    const marks = applyMark(rangeFor(root, '줄이는 일은 생각'), 'abc', 'green')

    expect(marks.length).toBeGreaterThan(1)
    expect(marks.map((mark) => mark.textContent).join('')).toBe('줄이는 일은 생각')
    expect(root.textContent).toBe('문장을 줄이는 일은 생각을 줄인다')
  })

  it('모든 mark 에 같은 식별자와 색상을 남긴다', () => {
    const root = render('<p>문장을 <strong>줄이는</strong> 일은 <em>생각</em>을 줄인다</p>')

    applyMark(rangeFor(root, '줄이는 일은 생각'), 'abc', 'blue')

    for (const mark of root.querySelectorAll('mark')) {
      expect(mark.getAttribute('data-highlighter-id')).toBe('abc')
      expect(mark.getAttribute('data-highlighter-color')).toBe('blue')
    }
  })

  it('엘리먼트 구조를 무너뜨리지 않는다', () => {
    const root = render('<p>문장을 <strong>줄이는</strong> 일은 끝</p>')

    applyMark(rangeFor(root, '줄이는 일은'), 'abc', 'pink')

    expect(root.querySelector('strong')!.textContent).toBe('줄이는')
  })

  it('빈 Range 에는 아무것도 하지 않는다', () => {
    const root = render('<p>본문</p>')
    const empty = document.createRange()
    empty.setStart(root.querySelector('p')!.firstChild!, 1)
    empty.setEnd(root.querySelector('p')!.firstChild!, 1)

    expect(applyMark(empty, 'abc', 'yellow')).toEqual([])
    expect(root.querySelector('mark')).toBeNull()
  })
})

describe('overlapsMark', () => {
  it('이미 하이라이트된 구간과 겹치면 참이다', () => {
    const root = render('<p>문장을 줄이는 일은 생각을 줄인다</p>')
    applyMark(rangeFor(root, '줄이는'), 'abc', 'yellow')

    expect(overlapsMark(rangeFor(root, '줄이는 일은'))).toBe(true)
  })

  it('겹치지 않으면 거짓이다', () => {
    const root = render('<p>문장을 줄이는 일은 생각을 줄인다</p>')
    applyMark(rangeFor(root, '줄이는'), 'abc', 'yellow')

    expect(overlapsMark(rangeFor(root, '생각을'))).toBe(false)
  })

  it('하이라이트가 하나도 없으면 거짓이다', () => {
    const root = render('<p>문장을 줄이는 일은</p>')

    expect(overlapsMark(rangeFor(root, '줄이는'))).toBe(false)
  })
})

describe('setMarkColor', () => {
  it('눈에 보이는 배경색을 바꾼다', () => {
    const root = render('<p>문장을 줄이는 일은</p>')
    applyMark(rangeFor(root, '줄이는'), 'abc', 'yellow')

    setMarkColor('abc', 'blue')

    expect(root.querySelector('mark')!.style.backgroundColor).toBe(
      hexToRgb(HIGHLIGHT_COLOR_HEX.blue),
    )
  })

  it('색상 속성도 함께 바꾼다', () => {
    const root = render('<p>문장을 줄이는 일은</p>')
    applyMark(rangeFor(root, '줄이는'), 'abc', 'yellow')

    setMarkColor('abc', 'pink')

    expect(root.querySelector('mark')!.getAttribute('data-highlighter-color')).toBe('pink')
  })

  it('여러 조각으로 나뉜 하이라이트를 모두 바꾼다', () => {
    const root = render('<p>문장을 <strong>줄이는</strong> 일은 <em>생각</em>을 줄인다</p>')
    applyMark(rangeFor(root, '줄이는 일은 생각'), 'abc', 'yellow')

    setMarkColor('abc', 'green')

    const marks = [...root.querySelectorAll('mark')]

    expect(marks.length).toBeGreaterThan(1)
    for (const mark of marks) {
      expect(mark.style.backgroundColor).toBe(hexToRgb(HIGHLIGHT_COLOR_HEX.green))
      expect(mark.getAttribute('data-highlighter-color')).toBe('green')
    }
  })

  it('다른 하이라이트는 건드리지 않는다', () => {
    const root = render('<p>문장을 줄이는 일은 생각을 줄인다</p>')
    applyMark(rangeFor(root, '줄이는'), 'keep', 'yellow')
    applyMark(rangeFor(root, '생각을'), 'change', 'yellow')

    setMarkColor('change', 'blue')

    expect(findMarks('keep')[0]!.style.backgroundColor).toBe(
      hexToRgb(HIGHLIGHT_COLOR_HEX.yellow),
    )
  })

  it('없는 식별자를 바꿔도 오류가 나지 않는다', () => {
    render('<p>본문</p>')

    expect(() => setMarkColor('없음', 'blue')).not.toThrow()
  })
})

describe('removeMark', () => {
  it('mark 를 풀고 원래 텍스트를 되돌린다', () => {
    const root = render('<p>문장을 줄이는 일은 생각을 줄인다</p>')
    applyMark(rangeFor(root, '줄이는'), 'abc', 'yellow')

    removeMark('abc')

    expect(root.querySelector('mark')).toBeNull()
    expect(root.textContent).toBe('문장을 줄이는 일은 생각을 줄인다')
  })

  it('나뉘어 있던 mark 를 모두 푼다', () => {
    const root = render('<p>문장을 <strong>줄이는</strong> 일은 <em>생각</em>을 줄인다</p>')
    applyMark(rangeFor(root, '줄이는 일은 생각'), 'abc', 'yellow')

    removeMark('abc')

    expect(root.querySelectorAll('mark')).toHaveLength(0)
    expect(root.textContent).toBe('문장을 줄이는 일은 생각을 줄인다')
  })

  it('다른 하이라이트는 건드리지 않는다', () => {
    const root = render('<p>문장을 줄이는 일은 생각을 줄인다</p>')
    applyMark(rangeFor(root, '줄이는'), 'keep', 'yellow')
    applyMark(rangeFor(root, '생각을'), 'drop', 'blue')

    removeMark('drop')

    expect(root.querySelectorAll('mark')).toHaveLength(1)
    expect(findMarks('keep')).toHaveLength(1)
  })

  it('없는 식별자를 지워도 오류가 나지 않는다', () => {
    render('<p>본문</p>')

    expect(() => removeMark('없음')).not.toThrow()
  })

  it('푼 뒤에 텍스트 노드를 다시 이어 붙인다', () => {
    const root = render('<p>문장을 줄이는 일은</p>')
    applyMark(rangeFor(root, '줄이는'), 'abc', 'yellow')

    removeMark('abc')

    expect(root.querySelector('p')!.childNodes).toHaveLength(1)
  })
})

describe('findMarks', () => {
  it('식별자로 mark 들을 찾는다', () => {
    const root = render('<p>문장을 <strong>줄이는</strong> 일은 끝</p>')
    applyMark(rangeFor(root, '줄이는 일은'), 'abc', 'yellow')

    expect(findMarks('abc').length).toBeGreaterThan(0)
  })

  it('없으면 빈 배열을 돌려준다', () => {
    render('<p>본문</p>')

    expect(findMarks('없음')).toEqual([])
  })
})

describe('경계 상황', () => {
  it('문서에 붙어 있지 않은 Range 에는 mark 를 만들지 않는다', () => {
    const detached = document.createElement('p')
    detached.textContent = '문서 밖 본문'

    const range = document.createRange()
    range.setStart(detached.firstChild!, 0)
    range.setEnd(detached.firstChild!, 2)

    expect(applyMark(range, 'abc', 'yellow')).toHaveLength(1)
    expect(document.querySelector('mark')).toBeNull()
  })

  it('부모에서 떨어져 나간 mark 는 건너뛴다', () => {
    const root = render('<p>문장을 줄이는 일은</p>')
    applyMark(rangeFor(root, '줄이는'), 'abc', 'yellow')

    const mark = document.querySelector('mark')!
    const detachedParent = document.createElement('div')
    detachedParent.appendChild(mark)
    detachedParent.removeChild(mark)

    expect(() => removeMark('abc')).not.toThrow()
  })

  it('선택이 다음 문단의 시작에서 끝나면 그 문단에는 빈 mark 를 만들지 않는다', () => {
    const root = render('<p>앞 문단이다</p><p>뒤 문단이다</p>')
    const [first, second] = [...root.querySelectorAll('p')]

    const range = document.createRange()
    range.setStart(first!.firstChild!, 0)
    range.setEnd(second!.firstChild!, 0)

    const marks = applyMark(range, 'abc', 'yellow')

    expect(marks).toHaveLength(1)
    expect(second!.querySelector('mark')).toBeNull()
    expect(root.textContent).toBe('앞 문단이다뒤 문단이다')
  })

  it('선택 구간이 노드 경계와 정확히 맞아떨어지면 쪼개지 않는다', () => {
    const root = render('<p>앞 <strong>가운데</strong> 뒤</p>')
    const strongText = root.querySelector('strong')!.firstChild!

    const range = document.createRange()
    range.setStart(strongText, 0)
    range.setEnd(strongText, 3)

    const marks = applyMark(range, 'abc', 'yellow')

    expect(marks).toHaveLength(1)
    expect(marks[0]!.textContent).toBe('가운데')
  })
})
