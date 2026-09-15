import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { chromeStorageAdapter, createMemoryAdapter } from './adapter'

type LocalStorageStub = {
  get: ReturnType<typeof vi.fn>
  set: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
}

const stubChrome = (local: LocalStorageStub): void => {
  Object.defineProperty(globalThis, 'chrome', {
    value: { storage: { local } },
    configurable: true,
    writable: true,
  })
}

describe('createMemoryAdapter', () => {
  it('넣은 값을 그대로 돌려준다', async () => {
    const adapter = createMemoryAdapter()

    await adapter.set('키', { 값: 1 })

    expect(await adapter.get('키')).toEqual({ 값: 1 })
  })

  it('처음 값을 주고 시작할 수 있다', async () => {
    const adapter = createMemoryAdapter({ 미리: '있음' })

    expect(await adapter.get('미리')).toBe('있음')
  })

  it('없는 키는 undefined 를 돌려준다', async () => {
    expect(await createMemoryAdapter().get('없음')).toBeUndefined()
  })

  it('지운 키는 목록에서도 빠진다', async () => {
    const adapter = createMemoryAdapter({ 하나: 1, 둘: 2 })

    await adapter.remove('하나')

    expect(await adapter.keys()).toEqual(['둘'])
  })
})

describe('chromeStorageAdapter', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('정상 동작', () => {
    beforeEach(() => {
      stubChrome({
        get: vi.fn(async (key: string | null) =>
          key === null ? { 하나: 1, 둘: 2 } : { [key as string]: '값' },
        ),
        set: vi.fn(async () => undefined),
        remove: vi.fn(async () => undefined),
      })
    })

    it('키에 해당하는 값만 꺼낸다', async () => {
      expect(await chromeStorageAdapter.get('어떤키')).toBe('값')
    })

    it('키와 값을 객체로 감싸 저장한다', async () => {
      await chromeStorageAdapter.set('어떤키', { 값: 1 })

      expect(chrome.storage.local.set).toHaveBeenCalledWith({ 어떤키: { 값: 1 } })
    })

    it('키를 지운다', async () => {
      await chromeStorageAdapter.remove('어떤키')

      expect(chrome.storage.local.remove).toHaveBeenCalledWith('어떤키')
    })

    it('전체 키 목록을 돌려준다', async () => {
      expect(await chromeStorageAdapter.keys()).toEqual(['하나', '둘'])
    })
  })

  describe('크롬 API 가 실패할 때', () => {
    beforeEach(() => {
      const 실패 = vi.fn(async () => {
        throw new Error('QUOTA_BYTES quota exceeded')
      })

      stubChrome({ get: 실패, set: 실패, remove: 실패 })
    })

    it('읽기 실패를 맥락이 담긴 오류로 바꾼다', async () => {
      await expect(chromeStorageAdapter.get('어떤키')).rejects.toThrow(
        '저장소에서 값을 읽지 못했습니다: 어떤키',
      )
    })

    it('쓰기 실패를 맥락이 담긴 오류로 바꾼다', async () => {
      await expect(chromeStorageAdapter.set('어떤키', 1)).rejects.toThrow(
        '저장소에 값을 쓰지 못했습니다: 어떤키',
      )
    })

    it('삭제 실패를 맥락이 담긴 오류로 바꾼다', async () => {
      await expect(chromeStorageAdapter.remove('어떤키')).rejects.toThrow(
        '저장소에서 값을 지우지 못했습니다: 어떤키',
      )
    })

    it('키 목록 조회 실패를 맥락이 담긴 오류로 바꾼다', async () => {
      await expect(chromeStorageAdapter.keys()).rejects.toThrow(
        '저장소의 키 목록을 읽지 못했습니다.',
      )
    })

    it('원래 오류를 cause 로 남긴다', async () => {
      await expect(chromeStorageAdapter.get('어떤키')).rejects.toMatchObject({
        cause: expect.objectContaining({ message: 'QUOTA_BYTES quota exceeded' }),
      })
    })
  })
})
