import { describe, expect, it } from 'vitest'

import { formatRelativeTime } from './formatRelativeTime'

const NOW = new Date('2026-09-15T12:00:00.000Z').getTime()
const ago = (milliseconds: number): string => new Date(NOW - milliseconds).toISOString()

describe('formatRelativeTime', () => {
  it('1분이 지나지 않았으면 방금이라고 한다', () => {
    expect(formatRelativeTime(ago(30_000), NOW)).toBe('방금')
  })

  it('한 시간 안쪽은 분으로 표시한다', () => {
    expect(formatRelativeTime(ago(5 * 60_000), NOW)).toBe('5분 전')
  })

  it('하루 안쪽은 시간으로 표시한다', () => {
    expect(formatRelativeTime(ago(3 * 3_600_000), NOW)).toBe('3시간 전')
  })

  it('하루가 넘으면 일로 표시한다', () => {
    expect(formatRelativeTime(ago(2 * 86_400_000), NOW)).toBe('2일 전')
  })

  it('날짜 형식이 아니면 빈 문자열을 돌려준다', () => {
    expect(formatRelativeTime('날짜 아님', NOW)).toBe('')
  })
})
