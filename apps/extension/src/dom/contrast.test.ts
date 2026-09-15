import {
  HIGHLIGHT_COLOR_HEX,
  HIGHLIGHT_COLORS,
  HIGHLIGHT_TEXT_COLOR,
} from '@highlighter/shared'
import { beforeEach, describe, expect, it } from 'vitest'

import { applyMark } from './mark'
import { buildTextIndex, offsetsToRange } from './text-index'

/** WCAG 2.1 의 본문 텍스트 기준이다. */
const MINIMUM_CONTRAST_RATIO = 4.5

const channels = (hex: string): number[] => {
  const value = Number.parseInt(hex.slice(1), 16)

  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

const relativeLuminance = (hex: string): number => {
  const [red, green, blue] = channels(hex).map((channel) => {
    const ratio = channel / 255

    return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!
}

const contrastRatio = (foreground: string, background: string): number => {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (a, b) => b - a,
  )

  return (lighter! + 0.05) / (darker! + 0.05)
}

/** 다크 모드 사이트가 본문에 쓰는 밝은 회색이다. news.hada.io 의 실제 값이다. */
const DARK_SITE_TEXT_COLOR = '#d7dbe2'

beforeEach(() => {
  document.body.innerHTML = '<p>초고는 언제나 버리기 위해 쓴다.</p>'
})

describe('하이라이트 글자색', () => {
  it.each(HIGHLIGHT_COLORS)('%s 배경 위에서 본문 기준 명암비를 넘는다', (color) => {
    expect(contrastRatio(HIGHLIGHT_TEXT_COLOR, HIGHLIGHT_COLOR_HEX[color])).toBeGreaterThanOrEqual(
      MINIMUM_CONTRAST_RATIO,
    )
  })

  it.each(HIGHLIGHT_COLORS)(
    '%s 배경 위에 사이트의 다크 모드 글자색을 두면 읽을 수 없다',
    (color) => {
      // 글자색을 지정하지 않고 물려받게 두면 이 상태가 된다. 회귀를 막기 위한 기준선이다.
      expect(contrastRatio(DARK_SITE_TEXT_COLOR, HIGHLIGHT_COLOR_HEX[color])).toBeLessThan(
        MINIMUM_CONTRAST_RATIO,
      )
    },
  )

  it('칠한 mark 는 글자색을 인라인으로 지정한다', () => {
    const index = buildTextIndex(document.body)
    const start = index.text.indexOf('초고는')

    applyMark(offsetsToRange(start, start + 3, index)!, 'abc', 'yellow')

    const mark = document.querySelector('mark')!

    expect(mark.style.color).not.toBe('')
    expect(mark.style.color).toBe('rgb(31, 35, 40)')
  })
})
