import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/:slug.webp',
        destination: '/api/:slug.webp',
      },
    ];
  },
  experimental: {
    serverComponentsExternalPackages: ['@vercel/og']
  },
  reactStrictMode: true,
}

export default nextConfig


