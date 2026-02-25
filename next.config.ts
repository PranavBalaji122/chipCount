import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Performance optimizations
  compress: true, // Enable gzip compression
  poweredByHeader: false, // Remove X-Powered-By header
  
  // Bundle optimization
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts']
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
  },

  // Headers for better caching
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          }
        ],
      },
    ]
  },
}

export default nextConfig
