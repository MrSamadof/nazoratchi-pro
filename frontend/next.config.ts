import type { NextConfig } from 'next';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  // Docker production uchun minimal standalone server (.next/standalone/server.js).
  output: 'standalone',
  // Monorepo: bir nechta lockfile bor — workspace root'ni shu (frontend) papkaga qadaymiz.
  outputFileTracingRoot: process.cwd(),
  /**
   * /api/* so'rovlarini Express backend ga yo'naltiramiz.
   * Bu cookie domain'ni bitta (frontend) qilib ushlab turadi,
   * shuning uchun Server Components ham, Client Components ham bir xil sessiyani ko'radi.
   */
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
