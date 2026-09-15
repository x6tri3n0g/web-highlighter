import { extractSiteHost, normalizeUrl } from '@highlighter/shared'

export interface PageContext {
  readonly url: string
  readonly title: string
  readonly host: string
}

/** 지금 보고 있는 페이지의 정보를 저장 형태로 정리한다. */
export function readPageContext(): PageContext | null {
  try {
    return {
      url: normalizeUrl(location.href),
      title: document.title,
      host: extractSiteHost(location.href),
    }
  } catch (error) {
    // chrome:// 이나 about: 처럼 다룰 수 없는 주소에서는 하이라이트를 만들지 않는다.
    console.warn('페이지 정보를 읽지 못했습니다.', error)
    return null
  }
}
