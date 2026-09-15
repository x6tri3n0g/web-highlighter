import type { Highlight } from '@highlighter/shared'
import { beforeEach, describe, expect, it } from 'vitest'

import { createMemoryAdapter, type StorageAdapter } from './adapter'
import { createHighlightStore, type HighlightStore } from './highlight-store'
import { INDEX_KEY, pageKey } from './keys'

const PAGE = 'https://brunch.co.kr/@writer/12'
const OTHER_PAGE = 'https://velog.io/@dev/post'

const draftFor = (text: string, url = PAGE) => ({
  url,
  pageTitle: '글쓰기의 감각을 되찾는 법',
  siteHost: new URL(url).hostname,
  text,
  color: 'yellow' as const,
  anchor: { exact: text, prefix: '', suffix: '', textPosition: 0 },
})

let adapter: StorageAdapter
let store: HighlightStore

beforeEach(() => {
  adapter = createMemoryAdapter()
  store = createHighlightStore(adapter)
})

describe('add', () => {
  it('하이라이트를 저장하고 식별자와 생성 시각을 채운다', async () => {
    const saved = await store.add(draftFor('초고는 버리기 위해 쓴다'))

    expect(saved.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(saved.userId).toBeNull()
    expect(() => new Date(saved.createdAt).toISOString()).not.toThrow()
    expect(saved.text).toBe('초고는 버리기 위해 쓴다')
  })

  it('같은 페이지의 하이라이트를 한 키에 모은다', async () => {
    await store.add(draftFor('첫째'))
    await store.add(draftFor('둘째'))

    const stored = (await adapter.get(pageKey(PAGE))) as { highlights: Highlight[] }

    expect(stored.highlights).toHaveLength(2)
  })

  it('저장하는 값에 스키마 버전을 남긴다', async () => {
    await store.add(draftFor('첫째'))

    expect((await adapter.get(pageKey(PAGE))) as { version: number }).toMatchObject({ version: 1 })
  })

  it('색인에 페이지 정보를 함께 기록한다', async () => {
    await store.add(draftFor('첫째'))
    await store.add(draftFor('둘째'))

    const index = await store.listPages()

    expect(index).toHaveLength(1)
    expect(index[0]).toMatchObject({
      url: PAGE,
      title: '글쓰기의 감각을 되찾는 법',
      host: 'brunch.co.kr',
      count: 2,
    })
  })

  it('페이지가 여러 개면 색인도 여러 개가 된다', async () => {
    await store.add(draftFor('첫째'))
    await store.add(draftFor('둘째', OTHER_PAGE))

    expect(await store.listPages()).toHaveLength(2)
  })

  it('형식에 맞지 않는 값은 저장하지 않는다', async () => {
    await expect(store.add({ ...draftFor(''), text: '' })).rejects.toThrow(
      '하이라이트 형식이 올바르지 않습니다',
    )
  })

  it('동시에 저장해도 하나도 잃지 않는다', async () => {
    await Promise.all([
      store.add(draftFor('첫째')),
      store.add(draftFor('둘째')),
      store.add(draftFor('셋째')),
      store.add(draftFor('넷째')),
      store.add(draftFor('다섯째')),
    ])

    expect(await store.listByUrl(PAGE)).toHaveLength(5)
    expect((await store.listPages())[0]?.count).toBe(5)
  })
})

describe('listByUrl', () => {
  it('저장된 것이 없으면 빈 배열을 돌려준다', async () => {
    expect(await store.listByUrl(PAGE)).toEqual([])
  })

  it('해당 페이지의 하이라이트만 돌려준다', async () => {
    await store.add(draftFor('이 페이지'))
    await store.add(draftFor('다른 페이지', OTHER_PAGE))

    const found = await store.listByUrl(PAGE)

    expect(found).toHaveLength(1)
    expect(found[0]?.text).toBe('이 페이지')
  })

  it('저장된 값이 깨져 있으면 빈 배열을 돌려준다', async () => {
    await adapter.set(pageKey(PAGE), { version: 1, highlights: [{ 엉뚱한: '값' }] })

    expect(await store.listByUrl(PAGE)).toEqual([])
  })
})

describe('remove', () => {
  it('하이라이트를 지우고 색인의 개수를 줄인다', async () => {
    const first = await store.add(draftFor('첫째'))
    await store.add(draftFor('둘째'))

    await store.remove(PAGE, first.id)

    expect(await store.listByUrl(PAGE)).toHaveLength(1)
    expect((await store.listPages())[0]?.count).toBe(1)
  })

  it('마지막 하나를 지우면 페이지 키와 색인 항목을 모두 지운다', async () => {
    const only = await store.add(draftFor('하나뿐'))

    await store.remove(PAGE, only.id)

    expect(await adapter.get(pageKey(PAGE))).toBeUndefined()
    expect(await store.listPages()).toEqual([])
  })

  it('없는 식별자를 지워도 오류가 나지 않는다', async () => {
    await store.add(draftFor('첫째'))

    await expect(store.remove(PAGE, '없는-식별자')).resolves.toBeUndefined()
    expect(await store.listByUrl(PAGE)).toHaveLength(1)
  })
})

describe('updateColor', () => {
  it('색상을 바꾼다', async () => {
    const saved = await store.add(draftFor('첫째'))

    await store.updateColor(PAGE, saved.id, 'blue')

    expect((await store.listByUrl(PAGE))[0]?.color).toBe('blue')
  })

  it('없는 식별자면 아무것도 바꾸지 않는다', async () => {
    await store.add(draftFor('첫째'))

    await store.updateColor(PAGE, '없는-식별자', 'blue')

    expect((await store.listByUrl(PAGE))[0]?.color).toBe('yellow')
  })
})

describe('rebuildIndex', () => {
  it('색인이 사라졌어도 페이지 키를 훑어 되살린다', async () => {
    await store.add(draftFor('첫째'))
    await store.add(draftFor('둘째', OTHER_PAGE))
    await adapter.remove(INDEX_KEY)

    await store.rebuildIndex()

    expect(await store.listPages()).toHaveLength(2)
  })

  it('색인이 실제 데이터와 어긋나 있으면 실제 데이터에 맞춘다', async () => {
    await store.add(draftFor('첫째'))
    await adapter.set(INDEX_KEY, {
      version: 1,
      pages: [{ url: '사라진 페이지', title: '없음', host: 'gone.com', count: 9, updatedAt: '' }],
    })

    await store.rebuildIndex()

    const pages = await store.listPages()

    expect(pages).toHaveLength(1)
    expect(pages[0]?.url).toBe(PAGE)
  })

  it('깨진 페이지 데이터는 색인에서 제외한다', async () => {
    await store.add(draftFor('첫째'))
    await adapter.set(pageKey(OTHER_PAGE), { 엉뚱한: '값' })

    await store.rebuildIndex()

    expect(await store.listPages()).toHaveLength(1)
  })
})
