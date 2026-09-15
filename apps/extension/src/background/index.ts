import { MESSAGE_TYPE } from '@highlighter/shared'

const HIGHLIGHT_COMMAND = 'highlight-selection'

/**
 * 단축키 입력은 service worker 만 받을 수 있는 반면에 선택 영역은 페이지 안에서만 읽을 수 있다.
 * 따라서 여기에서 명령을 받아 활성 탭의 content script 로 전달한다.
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
