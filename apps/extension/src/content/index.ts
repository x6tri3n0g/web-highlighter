import {
  extensionMessageSchema,
  type HighlightColor,
  MESSAGE_TYPE,
} from '@highlighter/shared'

import {
  findMarks,
  MARK_COLOR_ATTRIBUTE,
  MARK_ID_ATTRIBUTE,
  removeMark,
  setMarkColor,
} from '../dom/mark'
import { createHighlightStore } from '../storage/highlight-store'
import { createSettingsStore } from '../storage/settings-store'
import { captureSelection } from './capture'
import { readPageContext } from './page'
import { createPopover, POPOVER_HOST_ID } from './popover'
import { createRestoreScheduler } from './restore-scheduler'
import './content.css'

const highlightStore = createHighlightStore()
const settingsStore = createSettingsStore()
const popover = createPopover()

const page = readPageContext()

const rectOf = (id: string): DOMRect | null => findMarks(id)[0]?.getBoundingClientRect() ?? null

const openPopoverFor = (id: string, color: HighlightColor, rect: DOMRect | null): void => {
  if (!rect || !page) {
    return
  }

  popover.show(rect, color, {
    onSelectColor: async (picked) => {
      setMarkColor(id, picked)

      // 색을 바꾼 뒤에도 팝오버를 열어 두어 다른 색과 비교할 수 있게 한다.
      // 위치는 그대로 두어야 눌렀던 자리에서 버튼이 움직이지 않는다.
      openPopoverFor(id, picked, rect)

      try {
        await Promise.all([
          highlightStore.updateColor(page.url, id, picked),
          settingsStore.setLastUsedColor(picked),
        ])
      } catch (error) {
        console.warn('바뀐 색을 저장하지 못했습니다.', error)
      }
    },
    onRemove: async () => {
      popover.hide()

      try {
        // 저장소에서 먼저 지운다. 화면을 먼저 지우면 그 사이에 복원 관찰기가
        // 아직 남아 있는 저장 기록을 보고 다시 칠할 수 있다.
        await highlightStore.remove(page.url, id)
      } catch (error) {
        console.warn('하이라이트를 지우지 못했습니다.', error)
        return
      }

      removeMark(id)
    },
  })
}

const highlightCurrentSelection = async (requested?: HighlightColor): Promise<void> => {
  if (!page || (await settingsStore.isHostDisabled(page.host))) {
    return
  }

  const color = requested ?? (await settingsStore.read()).lastUsedColor
  const result = await captureSelection(page, color, highlightStore)

  if (result.status !== 'created') {
    return
  }

  openPopoverFor(result.highlight.id, color, rectOf(result.highlight.id))
}

const scrollToHighlight = (id: string): void => {
  findMarks(id)[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

chrome.runtime.onMessage.addListener((rawMessage) => {
  const parsed = extensionMessageSchema.safeParse(rawMessage)

  if (!parsed.success) {
    console.warn('알 수 없는 형식의 메시지를 받았습니다.', parsed.error)
    return
  }

  switch (parsed.data.type) {
    case MESSAGE_TYPE.HIGHLIGHT_SELECTION:
      void highlightCurrentSelection(parsed.data.color)
      break
    case MESSAGE_TYPE.SCROLL_TO_HIGHLIGHT:
      scrollToHighlight(parsed.data.id)
      break
    case MESSAGE_TYPE.REMOVE_HIGHLIGHT:
      removeMark(parsed.data.id)
      break
  }
})

/** 하이라이트를 클릭하면 색을 바꾸거나 지울 수 있는 팝오버를 연다. */
document.addEventListener('click', (event) => {
  const target = event.target

  if (!(target instanceof Element)) {
    return
  }

  // 팝오버 안의 클릭은 Shadow DOM 바깥에서 호스트 엘리먼트로 보이므로 여기에서 걸러낸다.
  if (target.closest(`#${POPOVER_HOST_ID}`)) {
    return
  }

  const mark = target.closest<HTMLElement>(`mark[${MARK_ID_ATTRIBUTE}]`)

  if (!mark) {
    popover.hide()
    return
  }

  const id = mark.getAttribute(MARK_ID_ATTRIBUTE)
  const color = mark.getAttribute(MARK_COLOR_ATTRIBUTE) as HighlightColor | null

  if (id && color) {
    openPopoverFor(id, color, mark.getBoundingClientRect())
  }
})

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    popover.hide()
  }
})

const LOG_PREFIX = '[Highlighter]'

const scheduler = createRestoreScheduler({
  loadHighlights: async () => {
    if (!page) {
      return []
    }

    const highlights = await highlightStore.listByUrl(page.url)

    console.info(`${LOG_PREFIX} ${page.url} 에 저장된 하이라이트 ${highlights.length}개`)

    return highlights
  },
  onRestored: (restored, failed) => {
    console.info(`${LOG_PREFIX} 복원 ${restored}개, 본문에서 찾지 못함 ${failed}개`)
  },
})

const startRestoring = async (): Promise<void> => {
  if (!page) {
    console.info(`${LOG_PREFIX} 다룰 수 없는 주소이므로 동작하지 않습니다.`)
    return
  }

  try {
    if (await settingsStore.isHostDisabled(page.host)) {
      return
    }
  } catch (error) {
    console.warn(`${LOG_PREFIX} 설정을 읽지 못했습니다.`, error)
  }

  await scheduler.runNow()
  // 사이트가 나중에 본문을 다시 그려도 하이라이트가 살아남도록 계속 지켜본다.
  scheduler.start()
}

void startRestoring()
