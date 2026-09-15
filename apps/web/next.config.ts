import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /** 워크스페이스 패키지를 소스 그대로 가져다 쓰므로 Next 가 직접 변환하게 한다. */
  transpilePackages: ['@highlighter/shared'],
}

export default nextConfig
