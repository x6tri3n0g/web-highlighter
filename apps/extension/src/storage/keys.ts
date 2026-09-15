export const STORAGE_SCHEMA_VERSION = 1

const PAGE_KEY_PREFIX = 'wh:page:'

export const INDEX_KEY = 'wh:index'
export const SETTINGS_KEY = 'wh:settings'

export const pageKey = (normalizedUrl: string): string => `${PAGE_KEY_PREFIX}${normalizedUrl}`

export const isPageKey = (key: string): boolean => key.startsWith(PAGE_KEY_PREFIX)

export const urlFromPageKey = (key: string): string => key.slice(PAGE_KEY_PREFIX.length)
