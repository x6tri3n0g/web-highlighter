import {
  extensionMessageSchema,
  type HighlightColor,
  MESSAGE_TYPE,
} from '@highlighter/shared'

import { findMarks, MARK_COLOR_ATTRIBUTE, MARK_ID_ATTRIBUTE, removeMark } from '../dom/mark'
import { createHighlightStore } from '../storage/highlight-store'
import { createSettingsStore } from '../storage/settings-store'
import { captureSelection } from './capture'
import { readPageContext } from './page'
import { createPopover } from './popover'
import { restoreHighlights } from './restore'
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
      const marks = findMarks(id)

      for (const mark of marks) {
        mark.setAttribute(MARK_COLOR_ATTRIBUTE, picked)
      }

      await Promise.all([
        highlightStore.updateColor(page.url, id, picked),
        settingsStore.setLastUsedColor(picked),
      ])

      popover.hide()
    },
    onRemove: async () => {
      removeMark(id)
      await highlightStore.remove(page.url, id)
      popover.hide()
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

const restoreOnLoad = async (): Promise<void> => {
  if (!page || (await settingsStore.isHostDisabled(page.host))) {
    return
  }

  try {
    const report = restoreHighlights(await highlightStore.listByUrl(page.url))

    if (report.failed > 0) {
      console.info(`하이라이트 ${report.failed}개는 본문에서 찾지 못했습니다.`)
    }
  } catch (error) {
    console.warn('하이라이트를 복원하지 못했습니다.', error)
  }
}

void restoreOnLoad()
