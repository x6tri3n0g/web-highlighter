import { beforeEach, describe, expect, it } from 'vitest'

import { MARK_ID_ATTRIBUTE } from '../dom/mark'
import { createMemoryAdapter, type StorageAdapter } from '../storage/adapter'
import { createHighlightStore, type HighlightStore } from '../storage/highlight-store'
import { captureSelection } from './capture'
import type { PageContext } from './page'
import { restoreHighlights } from './restore'

const ARTICLE_HTML = `
  <header><h1>글쓰기의 감각을 되찾는 법</h1></header>
  <article>
    <p>글을 쓰는 일은 생각을 정리하는 일과 같다고 사람들은 말한다.</p>
    <p>문장을 <strong>줄이는</strong> 일은 생각을 줄이는 일과 다르다.</p>
    <p>초고는 언제나 버리기 위해 쓴다.</p>
  </article>
`

const PAGE: PageContext = {
  url: 'https://brunch.co.kr/@writer/12',
  title: '글쓰기의 감각을 되찾는 법',
  host: 'brunch.co.kr',
}

const renderArticle = (): void => {
  document.body.innerHTML = ARTICLE_HTML
}

/** 사용자가 문장을 드래그해서 고른 상황을 만든다. */
const selectText = (needle: string): void => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const textNode = node as Text
    const offset = textNode.data.indexOf(needle)

    if (offset === -1) {
      continue
    }

    const range = document.createRange()
    range.setStart(textNode, offset)
    range.setEnd(textNode, offset + needle.length)

    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)
    return
  }

  throw new Error(`본문에서 찾지 못했습니다: ${needle}`)
}

let adapter: StorageAdapter
let store: HighlightStore

beforeEach(() => {
  renderArticle()
  adapter = createMemoryAdapter()
  store = createHighlightStore(adapter)
})

describe('하이라이트를 남기고 페이지를 새로고침하는 흐름', () => {
  it('한 문단 안의 문장이 새로고침 뒤에도 복원된다', async () => {
    selectText('생각을 정리하는 일')
    const captured = await captureSelection(PAGE, 'yellow', store)

    expect(captured.status).toBe('created')

    // 새로고침: DOM 을 처음 상태로 되돌린다.
    renderArticle()
    expect(document.querySelector('mark')).toBeNull()

    const report = restoreHighlights(await store.listByUrl(PAGE.url))

    expect(report).toEqual({ restored: 1, failed: 0 })
    expect(document.querySelector('mark')!.textContent).toBe('생각을 정리하는 일')
  })

  it('여러 엘리먼트에 걸친 문장도 복원된다', async () => {
    const index = (await import('../dom/text-index')).buildTextIndex(document.body)
    const start = index.text.indexOf('줄이는 일은')
    const range = (await import('../dom/text-index')).offsetsToRange(
      start,
      start + '줄이는 일은'.length,
      index,
    )!

    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)

    expect((await captureSelection(PAGE, 'green', store)).status).toBe('created')

    renderArticle()
    const report = restoreHighlights(await store.listByUrl(PAGE.url))

    expect(report).toEqual({ restored: 1, failed: 0 })
    expect(
      [...document.querySelectorAll('mark')].map((mark) => mark.textContent).join(''),
    ).toBe('줄이는 일은')
  })

  it('여러 개를 남겨도 모두 복원된다', async () => {
    selectText('생각을 정리하는 일')
    await captureSelection(PAGE, 'yellow', store)

    selectText('초고는 언제나')
    await captureSelection(PAGE, 'blue', store)

    renderArticle()
    const report = restoreHighlights(await store.listByUrl(PAGE.url))

    expect(report).toEqual({ restored: 2, failed: 0 })
    expect(document.querySelectorAll(`mark[${MARK_ID_ATTRIBUTE}]`).length).toBeGreaterThanOrEqual(2)
  })

  it('복원된 하이라이트가 원래 색을 유지한다', async () => {
    selectText('초고는 언제나')
    await captureSelection(PAGE, 'pink', store)

    renderArticle()
    restoreHighlights(await store.listByUrl(PAGE.url))

    expect(document.querySelector('mark')!.getAttribute('data-highlighter-color')).toBe('pink')
  })
})
