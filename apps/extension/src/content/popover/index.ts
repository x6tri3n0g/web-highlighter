import {
  HIGHLIGHT_COLOR_LABEL,
  HIGHLIGHT_COLORS,
  type HighlightColor,
} from '@highlighter/shared'

import { POPOVER_STYLES } from './styles'

export const POPOVER_HOST_ID = 'web-highlighter-popover-root'
const POPOVER_GAP = 8
const POPOVER_ESTIMATED_HEIGHT = 36

export interface PopoverHandlers {
  readonly onSelectColor: (color: HighlightColor) => void
  readonly onRemove: () => void
}

interface PopoverController {
  show(anchorRect: DOMRect, activeColor: HighlightColor, handlers: PopoverHandlers): void
  hide(): void
}

const createShadowRoot = (): ShadowRoot => {
  const host = document.createElement('div')
  host.id = POPOVER_HOST_ID
  document.body.appendChild(host)

  const shadow = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = POPOVER_STYLES
  shadow.appendChild(style)

  return shadow
}

/** 화면 위쪽에 자리가 없으면 아래쪽에 띄운다. */
const positionOf = (anchorRect: DOMRect): { left: number; top: number } => {
  const fitsAbove = anchorRect.top > POPOVER_ESTIMATED_HEIGHT + POPOVER_GAP

  return {
    left: Math.max(POPOVER_GAP, anchorRect.left),
    top: fitsAbove
      ? anchorRect.top - POPOVER_ESTIMATED_HEIGHT - POPOVER_GAP
      : anchorRect.bottom + POPOVER_GAP,
  }
}

export function createPopover(): PopoverController {
  let shadow: ShadowRoot | null = null
  let panel: HTMLElement | null = null

  const render = (activeColor: HighlightColor, handlers: PopoverHandlers): HTMLElement => {
    const container = document.createElement('div')
    container.className = 'popover'

    for (const color of HIGHLIGHT_COLORS) {
      const swatch = document.createElement('button')
      swatch.className = 'swatch'
      swatch.dataset.color = color
      swatch.type = 'button'
      swatch.title = HIGHLIGHT_COLOR_LABEL[color]
      swatch.setAttribute('aria-label', HIGHLIGHT_COLOR_LABEL[color])
      swatch.setAttribute('aria-pressed', String(color === activeColor))
      swatch.addEventListener('click', () => handlers.onSelectColor(color))
      container.appendChild(swatch)
    }

    const divider = document.createElement('span')
    divider.className = 'divider'
    container.appendChild(divider)

    const remove = document.createElement('button')
    remove.className = 'remove'
    remove.type = 'button'
    remove.textContent = '🗑'
    remove.title = '하이라이트 지우기'
    remove.setAttribute('aria-label', '하이라이트 지우기')
    remove.addEventListener('click', () => handlers.onRemove())
    container.appendChild(remove)

    return container
  }

  return {
    show(anchorRect, activeColor, handlers) {
      shadow ??= createShadowRoot()
      panel?.remove()

      panel = render(activeColor, handlers)
      const { left, top } = positionOf(anchorRect)
      panel.style.left = `${left}px`
      panel.style.top = `${top}px`

      shadow.appendChild(panel)
    },

    hide() {
      panel?.remove()
      panel = null
    },
  }
}
