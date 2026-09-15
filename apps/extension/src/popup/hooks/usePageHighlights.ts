import { type Highlight, normalizeUrl } from '@highlighter/shared'
import { useCallback, useEffect, useState } from 'react'

import { createHighlightStore } from '../../storage/highlight-store'

const store = createHighlightStore()

interface ActiveTab {
  readonly id: number
  readonly url: string
}

const readActiveTab = async (): Promise<ActiveTab | null> => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

  if (tab?.id === undefined || !tab.url) {
    return null
  }

  try {
    return { id: tab.id, url: normalizeUrl(tab.url) }
  } catch {
    // chrome:// 처럼 다룰 수 없는 주소이다.
    return null
  }
}

export interface PageHighlightsState {
  readonly highlights: readonly Highlight[]
  readonly isLoading: boolean
  readonly error: string | null
  readonly scrollTo: (id: string) => void
  readonly remove: (id: string) => Promise<void>
}

export function usePageHighlights(): PageHighlightsState {
  const [tab, setTab] = useState<ActiveTab | null>(null)
  const [highlights, setHighlights] = useState<readonly Highlight[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const load = async (): Promise<void> => {
      try {
        const activeTab = await readActiveTab()

        if (!isMounted) {
          return
        }

        setTab(activeTab)
        setHighlights(activeTab ? await store.listByUrl(activeTab.url) : [])
      } catch (caught) {
        console.error('하이라이트를 불러오지 못했습니다.', caught)

        if (isMounted) {
          setError('하이라이트를 불러오지 못했습니다.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [])

  const scrollTo = useCallback(
    (id: string) => {
      if (!tab) {
        return
      }

      void chrome.tabs
        .sendMessage(tab.id, { type: 'SCROLL_TO_HIGHLIGHT', id })
        .then(() => window.close())
        .catch((caught: unknown) => console.warn('해당 위치로 이동하지 못했습니다.', caught))
    },
    [tab],
  )

  const remove = useCallback(
    async (id: string) => {
      if (!tab) {
        return
      }

      try {
        await store.remove(tab.url, id)
        setHighlights((current) => current.filter((highlight) => highlight.id !== id))
        await chrome.tabs.sendMessage(tab.id, { type: 'REMOVE_HIGHLIGHT', id })
      } catch (caught) {
        // 탭이 닫혔거나 content script 가 없어도 저장소에서는 이미 지워졌다.
        console.warn('페이지에서 하이라이트를 지우지 못했습니다.', caught)
      }
    },
    [tab],
  )

  return { highlights, isLoading, error, scrollTo, remove }
}
