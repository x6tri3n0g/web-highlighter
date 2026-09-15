/**
 * 저장 수단을 추상화한다.
 * chrome.storage.local 의 기본 용량은 10MB 이므로, 본문 스냅샷을 저장하게 되면
 * IndexedDB 로 옮겨야 한다. 그때 호출하는 쪽을 건드리지 않기 위한 경계이다.
 */
export interface StorageAdapter {
  get(key: string): Promise<unknown>
  set(key: string, value: unknown): Promise<void>
  remove(key: string): Promise<void>
  keys(): Promise<string[]>
}

export const chromeStorageAdapter: StorageAdapter = {
  async get(key) {
    try {
      const result = await chrome.storage.local.get(key)
      return result[key]
    } catch (error) {
      throw new Error(`저장소에서 값을 읽지 못했습니다: ${key}`, { cause: error })
    }
  },

  async set(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value })
    } catch (error) {
      throw new Error(`저장소에 값을 쓰지 못했습니다: ${key}`, { cause: error })
    }
  },

  async remove(key) {
    try {
      await chrome.storage.local.remove(key)
    } catch (error) {
      throw new Error(`저장소에서 값을 지우지 못했습니다: ${key}`, { cause: error })
    }
  },

  async keys() {
    try {
      return Object.keys(await chrome.storage.local.get(null))
    } catch (error) {
      throw new Error('저장소의 키 목록을 읽지 못했습니다.', { cause: error })
    }
  },
}

/** 테스트에서 쓰는 메모리 구현이다. */
export function createMemoryAdapter(
  initial: Readonly<Record<string, unknown>> = {},
): StorageAdapter {
  let store: Record<string, unknown> = { ...initial }

  return {
    async get(key) {
      return store[key]
    },
    async set(key, value) {
      store = { ...store, [key]: value }
    },
    async remove(key) {
      const { [key]: _removed, ...rest } = store
      store = rest
    },
    async keys() {
      return Object.keys(store)
    },
  }
}
