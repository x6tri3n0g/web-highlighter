const TRACKING_PARAM_PREFIXES = ['utm_'] as const

const TRACKING_PARAM_NAMES = [
  'fbclid',
  'gclid',
  'igshid',
  'msclkid',
  'mc_cid',
  'mc_eid',
  'yclid',
] as const

const isTrackingParam = (key: string): boolean => {
  const lowered = key.toLowerCase()

  return (
    TRACKING_PARAM_PREFIXES.some((prefix) => lowered.startsWith(prefix)) ||
    TRACKING_PARAM_NAMES.some((name) => name === lowered)
  )
}

const stripTrailingSlash = (pathname: string): string =>
  pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname

/**
 * 같은 글에 남긴 하이라이트가 여러 레코드로 흩어지지 않도록 URL을 정규화한다.
 * 추적 파라미터와 해시를 제거하고, 남은 쿼리 파라미터를 사전 순으로 정렬한다.
 */
export function normalizeUrl(rawUrl: string): string {
  let url: URL

  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error(`정규화할 수 없는 URL 형식입니다: ${rawUrl}`)
  }

  const params = new URLSearchParams(
    [...url.searchParams].filter(([key]) => !isTrackingParam(key)),
  )
  params.sort()

  const search = params.toString()

  return `${url.origin}${stripTrailingSlash(url.pathname)}${search ? `?${search}` : ''}`
}

/** 사이트별 그룹핑에 사용할 호스트를 추출한다. 앞의 www 는 제거한다. */
export function extractSiteHost(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '')
  } catch {
    throw new Error(`호스트를 추출할 수 없는 URL 형식입니다: ${rawUrl}`)
  }
}
