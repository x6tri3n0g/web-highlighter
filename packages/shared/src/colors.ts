/** 1차 구현에서 제공하는 하이라이트 색상. 순서가 팝오버의 노출 순서와 같다. */
export const HIGHLIGHT_COLORS = ['yellow', 'green', 'blue', 'pink'] as const

export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number]

export const DEFAULT_HIGHLIGHT_COLOR: HighlightColor = 'yellow'

export const HIGHLIGHT_COLOR_HEX: Record<HighlightColor, string> = {
  yellow: '#FFE58A',
  green: '#B6E8B8',
  blue: '#A8D4FF',
  pink: '#FFC2D4',
}

export const HIGHLIGHT_COLOR_LABEL: Record<HighlightColor, string> = {
  yellow: '노랑',
  green: '초록',
  blue: '파랑',
  pink: '핑크',
}

/**
 * 하이라이트 배경은 네 가지 모두 밝은 파스텔이므로, 글자색은 언제나 어두워야 한다.
 * 페이지의 글자색을 물려받게 두면 다크 모드 사이트에서 밝은 글자가 밝은 배경 위에
 * 놓여 읽을 수 없게 된다.
 */
export const HIGHLIGHT_TEXT_COLOR = '#1f2328'
