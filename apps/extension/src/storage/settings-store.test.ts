import { describe, expect, it } from 'vitest'

import { createMemoryAdapter } from './adapter'
import { SETTINGS_KEY } from './keys'
import { createSettingsStore, DEFAULT_SETTINGS } from './settings-store'

describe('createSettingsStore', () => {
  it('저장된 설정이 없으면 기본값을 돌려준다', async () => {
    expect(await createSettingsStore(createMemoryAdapter()).read()).toEqual(DEFAULT_SETTINGS)
  })

  it('저장된 값이 깨져 있으면 기본값으로 되돌아간다', async () => {
    const adapter = createMemoryAdapter({ [SETTINGS_KEY]: { lastUsedColor: '보라' } })

    expect(await createSettingsStore(adapter).read()).toEqual(DEFAULT_SETTINGS)
  })

  it('마지막으로 쓴 색을 기억한다', async () => {
    const store = createSettingsStore(createMemoryAdapter())

    await store.setLastUsedColor('blue')

    expect((await store.read()).lastUsedColor).toBe('blue')
  })

  it('색을 바꿔도 다른 설정은 유지한다', async () => {
    const adapter = createMemoryAdapter({
      [SETTINGS_KEY]: { ...DEFAULT_SETTINGS, disabledHosts: ['example.com'] },
    })
    const store = createSettingsStore(adapter)

    await store.setLastUsedColor('pink')

    expect(await store.read()).toMatchObject({
      lastUsedColor: 'pink',
      disabledHosts: ['example.com'],
    })
  })

  it('꺼 둔 호스트인지 알려준다', async () => {
    const adapter = createMemoryAdapter({
      [SETTINGS_KEY]: { ...DEFAULT_SETTINGS, disabledHosts: ['example.com'] },
    })
    const store = createSettingsStore(adapter)

    expect(await store.isHostDisabled('example.com')).toBe(true)
    expect(await store.isHostDisabled('brunch.co.kr')).toBe(false)
  })
})
