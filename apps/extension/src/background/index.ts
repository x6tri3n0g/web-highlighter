import { MESSAGE_TYPE, normalizeUrl } from '@highlighter/shared'

import { createHighlightStore } from '../storage/highlight-store'

const HIGHLIGHT_COMMAND = 'highlight-selection'
const BADGE_BACKGROUND = '#5B6BDB'
const LOG_PREFIX = '[Highlighter]'

const highlightStore = createHighlightStore()

/**
 * service worker 는 어떤 창에도 속해 있지 않으므로 currentWindow 로는 탭을 찾지 못할 수 있다.
 * 마지막으로 다룬 창을 기준으로 물어야 한다.
 */
const findActiveTab = async (): Promise<chrome.tabs.Tab | null> => {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })

  return tab ?? null
}

/**
 * 단축키 입력은 service worker 만 받을 수 있는 반면에 선택 영역은 페이지 안에서만
 * 읽을 수 있다. 그래서 여기에서 명령을 받아 활성 탭의 content script 로 전달한다.
 */
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== HIGHLIGHT_COMMAND) {
    return
  }

  // 크롬이 명령과 함께 넘겨준 탭을 그대로 쓴다. 다시 찾을 이유가 없고, 다시 찾으면 틀릴 수 있다.
  const targetTab = tab ?? (await findActiveTab())

  if (targetTab?.id === undefined) {
    console.warn(`${LOG_PREFIX} 명령을 보낼 탭을 찾지 못했습니다.`)
    return
  }

  try {
    await chrome.tabs.sendMessage(targetTab.id, { type: MESSAGE_TYPE.HIGHLIGHT_SELECTION })
  } catch (error) {
    // chrome:// 페이지나 확장 프로그램을 새로 불러온 직후의 탭에는 content script 가 없다.
    console.warn(
      `${LOG_PREFIX} 하이라이트 명령을 전달하지 못했습니다. 페이지를 새로고침해 보세요.`,
      error,
    )
  }
})

const updateBadge = async (tabId: number, rawUrl: string | undefined): Promise<void> => {
  if (!rawUrl) {
    return
  }

  let count: number

  try {
    count = (await highlightStore.listByUrl(normalizeUrl(rawUrl))).length
  } catch {
    // chrome:// 처럼 정규화할 수 없는 주소이다. 배지를 건드리지 않는다.
    return
  }

  try {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_BACKGROUND })
    await chrome.action.setBadgeText({ tabId, text: count > 0 ? String(count) : '' })
  } catch (error) {
    console.warn(`${LOG_PREFIX} 배지를 갱신하지 못했습니다.`, error)
  }
}

const refreshActiveBadge = async (): Promise<void> => {
  const tab = await findActiveTab()

  if (tab?.id !== undefined) {
    await updateBadge(tab.id, tab.url)
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
chrome.storage.onChanged.addListener((_changes, areaName) => {
  if (areaName === 'local') {
    void refreshActiveBadge()
  }
})
