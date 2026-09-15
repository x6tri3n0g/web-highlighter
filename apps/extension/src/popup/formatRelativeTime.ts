const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** 팝업에서는 초 단위까지 보여줄 필요가 없으므로 큰 단위로 반올림한다. */
export function formatRelativeTime(isoDate: string, now: number = Date.now()): string {
  const elapsed = now - new Date(isoDate).getTime()

  if (Number.isNaN(elapsed)) {
    return ''
  }

  if (elapsed < MINUTE) {
    return '방금'
  }

  if (elapsed < HOUR) {
    return `${Math.floor(elapsed / MINUTE)}분 전`
  }

  if (elapsed < DAY) {
    return `${Math.floor(elapsed / HOUR)}시간 전`
  }

  return `${Math.floor(elapsed / DAY)}일 전`
}
