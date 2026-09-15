import { extensionMessageSchema, MESSAGE_TYPE } from '@highlighter/shared'

import './content.css'

chrome.runtime.onMessage.addListener((rawMessage) => {
  const parsed = extensionMessageSchema.safeParse(rawMessage)

  if (!parsed.success) {
    console.warn('알 수 없는 형식의 메시지를 받았습니다.', parsed.error)
    return
  }

  if (parsed.data.type === MESSAGE_TYPE.HIGHLIGHT_SELECTION) {
    // 1단계에서 선택 영역을 mark 로 감싸는 구현을 채운다.
    console.info('하이라이트 명령을 받았습니다.', window.getSelection()?.toString())
  }
})
