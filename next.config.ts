import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

// Phase 3 - Bundle Analysis: Configure bundle analyzer
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/**",
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 86400, // Cache optimized images for 24 hours
  },

  // Performance optimizations & Security
  experimental: {
    optimizePackageImports: ['@/components/ui', '@/components/admin', '@/components/public'],
    // Phase 1 Backend Audit - Security: Request size limits (2MB)
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Client-side router cache: keep dynamic pages fresh for 60s,
    // static/ISR pages for 5 minutes — avoids redundant refetches on back-navigation
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
  },

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Production optimizations
  productionBrowserSourceMaps: false,

  // Compress responses
  compress: true,

  // Turbopack configuration (Next.js 16+)
  turbopack: {
    // Enable code splitting
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // Security headers
  async headers() {
    // 'unsafe-inline' is required for Next.js App Router streaming SSR:
    // React uses inline <script> tags (e.g. $RC()) to swap Suspense fallbacks
    // with streamed content. Without this, Suspense skeletons are never replaced.
    // 'unsafe-eval' is additionally required in development for HMR / fast refresh.
    const isDev = process.env.NODE_ENV === 'development';
    const scriptSrc = [
      "'self'",
      "'unsafe-inline'",
      ...(isDev ? ["'unsafe-eval'"] : []),
      "https://cdn.jsdelivr.net",
      // cdn.tailwindcss.com removed — Tailwind v4 is bundled locally, no CDN script needed
    ].join(' ');

    const ContentSecurityPolicy = [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://res.cloudinary.com https://lh3.googleusercontent.com https://i.ytimg.com https://*.ytimg.com https://img.youtube.com",
      "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com",
      "connect-src 'self' https://res.cloudinary.com https://generativelanguage.googleapis.com",
      "media-src 'self' https://res.cloudinary.com https://*.ytimg.com",
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests",
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=(self), payment=(self)'
          },
          {
            key: 'Content-Security-Policy',
            value: ContentSecurityPolicy
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Public read-only API routes — aggressively cached at CDN edge
        source: '/api/public/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // Admin and auth API routes — must never be cached in shared caches
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store',
          },
          // CORS: restrict API routes to the configured app origin
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, x-csrf-token',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
        ],
      },
    ];
  },
};

// Phase 3 - Bundle Analysis: Wrap config with analyzer
export default withBundleAnalyzer(nextConfig);
