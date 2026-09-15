import type { Highlight } from '@highlighter/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createRestoreScheduler } from './restore-scheduler'

const ARTICLE = '<article><p>초고는 언제나 버리기 위해 쓴다.</p></article>'

const highlightOf = (text: string, id: string): Highlight => ({
  id,
  userId: null,
  url: 'https://brunch.co.kr/@writer/12',
  pageTitle: '글쓰기',
  siteHost: 'brunch.co.kr',
  text,
  color: 'yellow',
  anchor: { exact: text, prefix: '', suffix: '', textPosition: 0 },
  createdAt: new Date().toISOString(),
})

/** 사이트가 자바스크립트로 본문을 다시 그리는 상황을 흉내 낸다. */
const rerenderArticle = (): void => {
  document.body.innerHTML = ARTICLE
}

const markTexts = (): string[] =>
  [...document.querySelectorAll('mark')].map((mark) => mark.textContent ?? '')

beforeEach(() => {
  vi.useFakeTimers()
  document.body.innerHTML = ARTICLE
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createRestoreScheduler', () => {
  it('처음 부를 때 하이라이트를 칠한다', async () => {
    const scheduler = createRestoreScheduler({
      loadHighlights: async () => [highlightOf('초고는 언제나', 'a')],
    })

    await scheduler.runNow()

    expect(markTexts()).toEqual(['초고는 언제나'])
  })

  it('사이트가 본문을 다시 그려도 하이라이트를 되살린다', async () => {
    const scheduler = createRestoreScheduler({
      loadHighlights: async () => [highlightOf('초고는 언제나', 'a')],
    })

    await scheduler.runNow()
    scheduler.start()

    expect(markTexts()).toEqual(['초고는 언제나'])

    rerenderArticle()
    expect(markTexts()).toEqual([])

    await vi.advanceTimersByTimeAsync(300)

    expect(markTexts()).toEqual(['초고는 언제나'])

    scheduler.stop()
  })

  it('이미 칠해져 있으면 다시 칠하지 않는다', async () => {
    const loadHighlights = vi.fn(async () => [highlightOf('초고는 언제나', 'a')])
    const onRestored = vi.fn()
    const scheduler = createRestoreScheduler({ loadHighlights, onRestored })

    await scheduler.runNow()
    onRestored.mockClear()

    await scheduler.runNow()

    expect(markTexts()).toEqual(['초고는 언제나'])
    expect(onRestored).not.toHaveBeenCalled()
  })

  it('본문이 잇달아 바뀌어도 한 번만 복원한다', async () => {
    const loadHighlights = vi.fn(async () => [highlightOf('초고는 언제나', 'a')])
    const scheduler = createRestoreScheduler({ loadHighlights })

    scheduler.start()
    loadHighlights.mockClear()

    rerenderArticle()
    rerenderArticle()
    rerenderArticle()

    await vi.advanceTimersByTimeAsync(300)

    expect(loadHighlights).toHaveBeenCalledTimes(1)

    scheduler.stop()
  })

  it('복원한 개수와 실패한 개수를 알려준다', async () => {
    const onRestored = vi.fn()
    const scheduler = createRestoreScheduler({
      loadHighlights: async () => [
        highlightOf('초고는 언제나', 'a'),
        highlightOf('본문에 없는 문장', 'b'),
      ],
      onRestored,
    })

    await scheduler.runNow()

    expect(onRestored).toHaveBeenCalledWith(1, 1)
  })

  it('저장소를 읽지 못해도 페이지를 망가뜨리지 않는다', async () => {
    const scheduler = createRestoreScheduler({
      loadHighlights: async () => {
        throw new Error('저장소 접근 실패')
      },
    })

    await expect(scheduler.runNow()).resolves.toBeUndefined()
  })

  it('멈춘 뒤에는 본문이 바뀌어도 복원하지 않는다', async () => {
    const loadHighlights = vi.fn(async () => [highlightOf('초고는 언제나', 'a')])
    const scheduler = createRestoreScheduler({ loadHighlights })

    scheduler.start()
    scheduler.stop()
    loadHighlights.mockClear()

    rerenderArticle()
    await vi.advanceTimersByTimeAsync(300)

    expect(loadHighlights).not.toHaveBeenCalled()
  })
})

describe('겹쳐서 부를 때', () => {
  it('복원이 진행 중이면 겹쳐 부른 요청은 건너뛴다', async () => {
    let resolveLoad: ((value: Highlight[]) => void) | null = null
    const loadHighlights = vi.fn(
      () =>
        new Promise<Highlight[]>((resolve) => {
          resolveLoad = resolve
        }),
    )
    const scheduler = createRestoreScheduler({ loadHighlights })

    const first = scheduler.runNow()
    const second = scheduler.runNow()

    resolveLoad!([highlightOf('초고는 언제나', 'a')])
    await Promise.all([first, second])

    expect(loadHighlights).toHaveBeenCalledTimes(1)
  })

  it('앞서 예약된 복원을 새 변화가 미룬다', async () => {
    const loadHighlights = vi.fn(async () => [highlightOf('초고는 언제나', 'a')])
    const scheduler = createRestoreScheduler({ loadHighlights })

    scheduler.start()
    loadHighlights.mockClear()

    rerenderArticle()
    await vi.advanceTimersByTimeAsync(100)
    rerenderArticle()
    await vi.advanceTimersByTimeAsync(100)

    expect(loadHighlights).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(150)

    expect(loadHighlights).toHaveBeenCalledTimes(1)

    scheduler.stop()
  })

  it('예약된 복원이 남아 있어도 멈추면 실행하지 않는다', async () => {
    const loadHighlights = vi.fn(async () => [highlightOf('초고는 언제나', 'a')])
    const scheduler = createRestoreScheduler({ loadHighlights })

    scheduler.start()
    loadHighlights.mockClear()

    rerenderArticle()
    await vi.advanceTimersByTimeAsync(50)
    scheduler.stop()

    await vi.advanceTimersByTimeAsync(300)

    expect(loadHighlights).not.toHaveBeenCalled()
  })
})
