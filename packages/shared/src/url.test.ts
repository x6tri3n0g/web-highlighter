import { describe, expect, it } from 'vitest'

import { extractSiteHost, normalizeUrl } from './url'

describe('normalizeUrl', () => {
  it('해시를 제거한다', () => {
    expect(normalizeUrl('https://example.com/post#section-2')).toBe('https://example.com/post')
  })

  it('utm 으로 시작하는 추적 파라미터를 제거한다', () => {
    expect(normalizeUrl('https://example.com/post?utm_source=slack&utm_medium=dm')).toBe(
      'https://example.com/post',
    )
  })

  it('알려진 추적 파라미터를 대소문자와 무관하게 제거한다', () => {
    expect(normalizeUrl('https://example.com/post?FBCLID=abc&gclid=def')).toBe(
      'https://example.com/post',
    )
  })

  it('의미가 있는 쿼리 파라미터는 유지하고 사전 순으로 정렬한다', () => {
    expect(normalizeUrl('https://example.com/list?page=2&category=tech&utm_source=rss')).toBe(
      'https://example.com/list?category=tech&page=2',
    )
  })

  it('경로 끝의 슬래시를 제거한다', () => {
    expect(normalizeUrl('https://example.com/post/')).toBe('https://example.com/post')
  })

  it('루트 경로의 슬래시는 유지한다', () => {
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com/')
  })

  it('같은 글을 가리키는 서로 다른 URL 을 같은 값으로 정규화한다', () => {
    const fromSlack = 'https://example.com/post/?utm_source=slack#top'
    const fromSearch = 'https://example.com/post?gclid=xyz'

    expect(normalizeUrl(fromSlack)).toBe(normalizeUrl(fromSearch))
  })

  it('URL 형식이 아니면 오류를 던진다', () => {
    expect(() => normalizeUrl('그냥 문자열')).toThrow('정규화할 수 없는 URL 형식입니다')
  })
})

describe('extractSiteHost', () => {
  it('호스트를 추출한다', () => {
    expect(extractSiteHost('https://brunch.co.kr/@writer/12')).toBe('brunch.co.kr')
  })

  it('앞의 www 를 제거한다', () => {
    expect(extractSiteHost('https://www.example.com/post')).toBe('example.com')
  })

  it('URL 형식이 아니면 오류를 던진다', () => {
    expect(() => extractSiteHost('example.com')).toThrow('호스트를 추출할 수 없는 URL 형식입니다')
  })
})
