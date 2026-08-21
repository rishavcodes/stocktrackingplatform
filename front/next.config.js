const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,

  // Service worker enabled in every environment, including npm run dev.
  // Trade-off: HMR sometimes serves stale chunks because the SW caches them.
  // If you save a file and see the old version, hard-refresh
  // (Cmd+Shift+R) or use DevTools → Application → Service Workers →
  // "Update on reload".
  disable: false,

  // UAT NODE_ENV workaround
  //
  // UAT runs with NODE_ENV=uat (not "production") because many parts of
  // the app rely on that value.
  //
  // Exclude dev-only artifacts from the PWA precache.
  buildExcludes: [
    /app-build-manifest\.json$/,
    /react-loadable-manifest\.json$/,
    /middleware-manifest\.json$/,
    /_buildManifest\.js$/,
    /_ssgManifest\.js$/,
    /\.map$/,
  ],
})

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,

  // ============================================================
  // VERCEL → EC2 API PROXY
  // ============================================================
  //
  // Frontend calls:
  //
  //   /api/auth/requestoptformobile
  //
  // Vercel internally forwards it to:
  //
  //   http://13.204.148.45:8080/api/auth/requestoptformobile
  //
  // This prevents the browser from making an HTTP request from
  // the HTTPS Vercel frontend, which would otherwise cause a
  // Mixed Content error.
  //
  // IMPORTANT — the proxy must NOT swallow Next.js's own API routes.
  // `[...nextauth]` is a *dynamic* route, and
  // dynamic routes are matched AFTER rewrites, so a bare `/api/:path*`
  // catch-all wins over them and proxies NextAuth to Express — which
  // answers `Cannot GET /api/auth/session` and breaks every login.
  //
  // We cannot simply exclude the whole `/api/auth` namespace: the Express
  // backend mounts its own routes there too (requestoptformobile,
  // checkotpnumber, getuserdata, signin, …). So the negative lookahead
  // below excludes only NextAuth's *reserved* sub-paths, everything else
  // under /api/auth still proxies to the backend.
  //
  // Note `signin` is deliberately NOT excluded — that one belongs to the
  // backend. NextAuth never needs it because `pages.signIn` in
  // src/middleware.ts points at /auth/provider/signin instead.
  //
  async rewrites() {
    const NEXTAUTH_RESERVED =
      'session|csrf|providers|signout|error|verify-request|_log|callback'

    return [
      {
        source: `/api/:path((?!auth/(?:${NEXTAUTH_RESERVED})).*)`,
        destination: 'http://13.204.148.45:8080/api/:path',
      },
    ]
  },

  // ============================================================
  // IMAGES
  // ============================================================

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // ============================================================
  // WEBPACK
  // ============================================================

  webpack: (config, { isServer }) => {
    // Modify cache behavior without disabling it entirely
    if (!isServer) {
      config.cache = {
        type: 'filesystem',
      }
    }

    // pdfjs-dist conditionally requires canvas (Node-only).
    // The browser bundle doesn't need it, so stub it.
    config.resolve = config.resolve || {}

    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: false,
    }

    // Chunking strategy
    config.optimization.splitChunks = {
      chunks: 'all',
      maxInitialRequests: 5,
      minSize: 30000,
    }

    return config
  },

  // ============================================================
  // SECURITY + PWA HEADERS
  // ============================================================

  async headers() {
    return [
      // ----------------------------------------------------------
      // Service Worker
      // ----------------------------------------------------------

      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },

      {
        source: '/workbox-:hash*.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },

      // ----------------------------------------------------------
      // General security headers
      // ----------------------------------------------------------

      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self';",
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ]
  },
}

module.exports = withBundleAnalyzer(withPWA(nextConfig))