import { DEFAULT_HIGHLIGHT_COLOR, type HighlightColor, HIGHLIGHT_COLORS } from '@highlighter/shared'
import { z } from 'zod'

import { chromeStorageAdapter, type StorageAdapter } from './adapter'
import { SETTINGS_KEY, STORAGE_SCHEMA_VERSION } from './keys'

/**
 * showPopover 와 disabledHosts 는 1단계에서 UI 를 붙이지 않지만 스키마에는 넣어 둔다.
 * 나중에 추가하면 저장된 데이터를 옮기는 작업이 필요해지기 때문이다.
 */
const settingsSchema = z.object({
  version: z.number().int().positive(),
  lastUsedColor: z.enum(HIGHLIGHT_COLORS),
  showPopover: z.boolean(),
  disabledHosts: z.array(z.string()),
})

export type Settings = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: Settings = {
  version: STORAGE_SCHEMA_VERSION,
  lastUsedColor: DEFAULT_HIGHLIGHT_COLOR,
  showPopover: true,
  disabledHosts: [],
}

export interface SettingsStore {
  read(): Promise<Settings>
  setLastUsedColor(color: HighlightColor): Promise<void>
  isHostDisabled(host: string): Promise<boolean>
}

export function createSettingsStore(
  adapter: StorageAdapter = chromeStorageAdapter,
): SettingsStore {
  const read = async (): Promise<Settings> => {
    const parsed = settingsSchema.safeParse(await adapter.get(SETTINGS_KEY))

    return parsed.success ? parsed.data : DEFAULT_SETTINGS
  }

  return {
    read,

    async setLastUsedColor(color) {
      await adapter.set(SETTINGS_KEY, { ...(await read()), lastUsedColor: color })
    },

    async isHostDisabled(host) {
      return (await read()).disabledHosts.includes(host)
    },
  }
}
