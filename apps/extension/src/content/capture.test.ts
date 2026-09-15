import { beforeEach, describe, expect, it } from 'vitest'

import { applyMark } from '../dom/mark'
import { buildTextIndex, offsetsToRange } from '../dom/text-index'
import { createMemoryAdapter } from '../storage/adapter'
import { createHighlightStore, type HighlightStore } from '../storage/highlight-store'
import { captureSelection } from './capture'
import type { PageContext } from './page'

const ARTICLE = '<article><p>초고는 언제나 버리기 위해 쓴다.</p></article>'

const PAGE: PageContext = {
  url: 'https://brunch.co.kr/@writer/12',
  title: '글쓰기',
  host: 'brunch.co.kr',
}

const rangeFor = (needle: string): Range => {
  const index = buildTextIndex(document.body)
  const start = index.text.indexOf(needle)

  return offsetsToRange(start, start + needle.length, index)!
}

const select = (range: Range): void => {
  const selection = window.getSelection()!
  selection.removeAllRanges()
  selection.addRange(range)
}

let store: HighlightStore

beforeEach(() => {
  document.body.innerHTML = ARTICLE
  window.getSelection()?.removeAllRanges()
  store = createHighlightStore(createMemoryAdapter())
})

describe('captureSelection', () => {
  it('고른 문장을 저장하고 mark 를 칠한다', async () => {
    select(rangeFor('초고는 언제나'))

    const result = await captureSelection(PAGE, 'yellow', store)

    expect(result.status).toBe('created')
    expect(document.querySelector('mark')!.textContent).toBe('초고는 언제나')
    expect(await store.listByUrl(PAGE.url)).toHaveLength(1)
  })

  it('고른 것이 없으면 아무것도 하지 않는다', async () => {
    expect(await captureSelection(PAGE, 'yellow', store)).toEqual({ status: 'empty' })
    expect(await store.listByUrl(PAGE.url)).toEqual([])
  })

  it('접힌 선택은 무시한다', async () => {
    const collapsed = document.createRange()
    const textNode = document.querySelector('p')!.firstChild!
    collapsed.setStart(textNode, 3)
    collapsed.setEnd(textNode, 3)
    select(collapsed)

    expect(await captureSelection(PAGE, 'yellow', store)).toEqual({ status: 'empty' })
  })

  it('공백만 고르면 무시한다', async () => {
    document.body.innerHTML = '<p>앞     뒤</p>'
    const textNode = document.querySelector('p')!.firstChild as Text
    const whitespace = document.createRange()
    whitespace.setStart(textNode, 1)
    whitespace.setEnd(textNode, 5)
    select(whitespace)

    expect(await captureSelection(PAGE, 'yellow', store)).toEqual({ status: 'empty' })
  })

  it('이미 하이라이트된 곳과 겹치면 아무것도 하지 않는다', async () => {
    applyMark(rangeFor('초고는'), '기존', 'green')
    select(rangeFor('초고는 언제나'))

    expect(await captureSelection(PAGE, 'yellow', store)).toEqual({ status: 'overlapping' })
    expect(await store.listByUrl(PAGE.url)).toEqual([])
  })

  it('저장한 뒤에는 선택을 해제한다', async () => {
    select(rangeFor('초고는 언제나'))

    await captureSelection(PAGE, 'yellow', store)

    expect(window.getSelection()!.rangeCount).toBe(0)
  })

  it('고른 문장과 앞뒤 문맥을 앵커에 담는다', async () => {
    select(rangeFor('버리기 위해'))

    const result = await captureSelection(PAGE, 'blue', store)

    expect(result.status).toBe('created')

    const [saved] = await store.listByUrl(PAGE.url)

    expect(saved!.anchor.exact).toBe('버리기 위해')
    expect(saved!.anchor.prefix).toContain('초고는')
    expect(saved!.text).toBe('버리기 위해')
    expect(saved!.color).toBe('blue')
  })
})

describe('본문으로 다루지 않는 영역', () => {
  it('입력 상자 안의 글자를 골라도 하이라이트하지 않는다', async () => {
    document.body.innerHTML = '<p>본문이다</p><textarea>입력한 값이다</textarea>'
    const textareaText = document.querySelector('textarea')!.firstChild as Text

    const range = document.createRange()
    range.setStart(textareaText, 0)
    range.setEnd(textareaText, 3)
    select(range)

    expect(await captureSelection(PAGE, 'yellow', store)).toEqual({ status: 'unresolvable' })
    expect(await store.listByUrl(PAGE.url)).toEqual([])
  })
})
