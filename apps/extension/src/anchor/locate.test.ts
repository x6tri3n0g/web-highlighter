import type { Anchor } from '@highlighter/shared'
import { describe, expect, it } from 'vitest'

import { createAnchor, locateAnchor } from './locate'

const ARTICLE =
  '글을 쓰는 일은 생각을 정리하는 일과 같다고 사람들은 말한다. ' +
  '문장을 줄이는 일은 생각을 줄이는 일과 다르다. ' +
  '초고는 언제나 버리기 위해 쓴다. ' +
  '고쳐 쓰기를 거치지 않은 글은 아직 글이 아니라 메모에 가깝다. ' +
  '문장을 줄이는 일은 생각을 줄이는 일과 다르다.'

const anchorFor = (text: string, occurrence = 0): Anchor => {
  let position = -1

  for (let index = 0; index <= occurrence; index += 1) {
    position = ARTICLE.indexOf(text, position + 1)
  }

  return createAnchor(ARTICLE, position, position + text.length)
}

describe('createAnchor', () => {
  it('선택 구간과 앞뒤 문맥을 담는다', () => {
    const anchor = createAnchor(ARTICLE, 0, 7)

    expect(anchor.exact).toBe('글을 쓰는 일')
    expect(anchor.prefix).toBe('')
    expect(anchor.textPosition).toBe(0)
    expect(ARTICLE.startsWith(anchor.exact + anchor.suffix)).toBe(true)
  })

  it('문맥을 최대 32자까지만 담는다', () => {
    const middle = ARTICLE.indexOf('초고는')
    const anchor = createAnchor(ARTICLE, middle, middle + 3)

    expect(anchor.prefix).toHaveLength(32)
    expect(anchor.suffix).toHaveLength(32)
  })

  it('선택 구간이 비어 있으면 오류를 던진다', () => {
    expect(() => createAnchor(ARTICLE, 10, 10)).toThrow('빈 구간으로는 앵커를 만들 수 없습니다')
  })

  it('구간이 뒤집혀 있으면 오류를 던진다', () => {
    expect(() => createAnchor(ARTICLE, 20, 10)).toThrow('빈 구간으로는 앵커를 만들 수 없습니다')
  })
})

describe('locateAnchor', () => {
  it('① 저장해 둔 위치에 그대로 있으면 그 자리를 쓴다', () => {
    const anchor = anchorFor('초고는 언제나 버리기 위해 쓴다')

    expect(locateAnchor(ARTICLE, anchor)).toEqual({
      start: anchor.textPosition,
      end: anchor.textPosition + anchor.exact.length,
      strategy: 'position',
    })
  })

  it('② 위치가 밀렸으면 앞뒤 문맥으로 찾는다', () => {
    const anchor = anchorFor('초고는 언제나 버리기 위해 쓴다')
    const shifted = '새로 추가된 도입 문단이다. ' + ARTICLE

    const found = locateAnchor(shifted, anchor)

    expect(found?.strategy).toBe('context')
    expect(shifted.slice(found!.start, found!.end)).toBe(anchor.exact)
  })

  it('② 같은 문장이 여러 번 나와도 문맥으로 올바른 쪽을 고른다', () => {
    const second = anchorFor('문장을 줄이는 일은 생각을 줄이는 일과 다르다', 1)
    const shifted = '머리말. ' + ARTICLE

    const found = locateAnchor(shifted, second)

    expect(found?.strategy).toBe('context')
    expect(found?.start).toBe(shifted.lastIndexOf(second.exact))
  })

  it('③ 문맥까지 바뀌었어도 문장이 유일하면 찾는다', () => {
    const anchor = anchorFor('초고는 언제나 버리기 위해 쓴다')
    const rewritten = '완전히 다른 도입부. 초고는 언제나 버리기 위해 쓴다. 완전히 다른 마무리.'

    const found = locateAnchor(rewritten, anchor)

    expect(found?.strategy).toBe('exact')
    expect(rewritten.slice(found!.start, found!.end)).toBe(anchor.exact)
  })

  it('③ 문장이 여러 번 나오면 엉뚱한 곳을 고르지 않고 포기한다', () => {
    const anchor = anchorFor('문장을 줄이는 일은 생각을 줄이는 일과 다르다')
    const ambiguous = `앞. ${anchor.exact}. 뒤. ${anchor.exact}. 끝.`

    expect(locateAnchor(ambiguous, anchor)).toBeNull()
  })

  it('④ 문장이 사라졌으면 포기한다', () => {
    const anchor = anchorFor('초고는 언제나 버리기 위해 쓴다')

    expect(locateAnchor('전혀 관련 없는 본문입니다.', anchor)).toBeNull()
  })

  it('본문이 앵커보다 짧아도 오류 없이 포기한다', () => {
    const anchor = anchorFor('초고는 언제나 버리기 위해 쓴다')

    expect(locateAnchor('짧다', anchor)).toBeNull()
  })

  it('저장된 위치가 본문 길이를 넘어서도 다른 단계로 넘어간다', () => {
    const anchor = anchorFor('초고는 언제나 버리기 위해 쓴다')
    const outOfRange: Anchor = { ...anchor, textPosition: 99999 }

    const found = locateAnchor(ARTICLE, outOfRange)

    expect(found?.strategy).toBe('context')
    expect(ARTICLE.slice(found!.start, found!.end)).toBe(anchor.exact)
  })
})
