import { z } from 'zod'

/**
 * NEXT_PUBLIC_ 이 붙은 값은 브라우저 번들에 그대로 들어간다.
 * anon 키는 공개해도 되는 값이지만, service_role 키는 절대 여기에 두면 안 된다.
 * 그 키는 RLS 를 통째로 우회한다.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
})

export type PublicEnv = z.infer<typeof publicEnvSchema>

export function readPublicEnv(): PublicEnv {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })

  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')

    throw new Error(
      `Supabase 환경 변수가 설정되지 않았습니다: ${missing}. apps/web/.env.example 을 참고해 .env.local 을 만들어 주세요.`,
    )
  }

  return parsed.data
}
