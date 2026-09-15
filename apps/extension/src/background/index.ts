import { MESSAGE_TYPE, normalizeUrl } from '@highlighter/shared'

import { createHighlightStore } from '../storage/highlight-store'

const HIGHLIGHT_COMMAND = 'highlight-selection'
const BADGE_BACKGROUND = '#5B6BDB'

const highlightStore = createHighlightStore()

/**
 * 단축키 입력은 service worker 만 받을 수 있는 반면에 선택 영역은 페이지 안에서만
 * 읽을 수 있다. 그래서 여기에서 명령을 받아 활성 탭의 content script 로 전달한다.
 */
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== HIGHLIGHT_COMMAND) {
    return
  }

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })

  if (activeTab?.id === undefined) {
    return
  }

  try {
    await chrome.tabs.sendMessage(activeTab.id, { type: MESSAGE_TYPE.HIGHLIGHT_SELECTION })
  } catch (error) {
    // chrome:// 페이지나 확장 프로그램 설치 직후의 탭에는 content script 가 없다.
    console.warn('하이라이트 명령을 전달하지 못했습니다.', error)
  }
})

const updateBadge = async (tabId: number, rawUrl: string | undefined): Promise<void> => {
  if (!rawUrl) {
    return
  }

  try {
    const count = (await highlightStore.listByUrl(normalizeUrl(rawUrl))).length

    await chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_BACKGROUND })
    await chrome.action.setBadgeText({ tabId, text: count > 0 ? String(count) : '' })
  } catch {
    // 다룰 수 없는 주소이거나 탭이 이미 닫혔다. 배지는 부가 정보이므로 조용히 넘어간다.
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    void updateBadge(tabId, tab.url)
  }
})

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId).catch(() => null)

  if (tab) {
    void updateBadge(tabId, tab.url)
  }
})

/** 하이라이트가 늘거나 줄면 배지를 다시 계산한다. */
chrome.storage.onChanged.addListener(async (_changes, areaName) => {
  if (areaName !== 'local') {
    return
  }

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })

  if (activeTab?.id !== undefined) {
    void updateBadge(activeTab.id, activeTab.url)
  }
})
