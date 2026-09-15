import { z } from 'zod'

/** 앵커에 함께 저장할 앞뒤 문맥의 길이. 길수록 정확하지만 저장 용량이 늘어난다. */
export const ANCHOR_CONTEXT_LENGTH = 32

/**
 * W3C Web Annotation 의 TextQuoteSelector 를 따른 위치 정보이다.
 * XPath 대신 본문 텍스트와 앞뒤 문맥으로 위치를 기록하므로,
 * 사이트가 마크업을 변경해도 복원이 쉽게 깨지지 않는다.
 */
export const anchorSchema = z.object({
  exact: z.string().min(1),
  prefix: z.string(),
  suffix: z.string(),
  textPosition: z.number().int().nonnegative(),
})

export type Anchor = z.infer<typeof anchorSchema>
