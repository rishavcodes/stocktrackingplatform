const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Service worker enabled in every environment, including `npm run dev`.
  // Trade-off: HMR sometimes serves stale chunks because the SW caches them
  // — if you save a file and see the old version, hard-refresh (Cmd+Shift+R)
  // or toggle DevTools → Application → Service Workers → "Update on reload".
  // Required so the customer's PWA push toggle in /dashboard/user/settings
  // works while developing too, not only in built/UAT/prod environments.
  disable: false,
  // ── UAT NODE_ENV workaround ─────────────────────────────────────────────
  // UAT runs with NODE_ENV=uat (not "production") because many parts of the
  // app rely on that value and changing it would break unrelated things.
  // Side effect: Next.js then emits some dev-style manifest files
  // (`app-build-manifest.json`, etc.) which next-pwa would normally include
  // in its precache list. Those files don't actually exist in the deployed
  // bundle on UAT, so the SW's install step fetches them, gets 404s, and
  // never reaches "activated" — leaving `navigator.serviceWorker.ready`
  // hanging and the push-notification toggle stuck on "unavailable".
  //
  // Excluding the dev-only artifacts from precache solves it without
  // touching NODE_ENV. The runtime cache (workbox default) still handles
  // everything the SW actually needs to serve.
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

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Modify cache behavior without disabling it entirely
    if (!isServer) {
      config.cache = {
        type: 'filesystem', // This helps improve caching behavior for client-side
      }
    }

    // pdfjs-dist conditionally requires `canvas` (Node-only). The browser
    // bundle doesn't need it; stub it so webpack doesn't try to resolve it.
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: false,
    }

    // Add chunking strategies if necessary (optional)
    config.optimization.splitChunks = {
      chunks: 'all',
      maxInitialRequests: 5,
      minSize: 30000,
    }

    return config
  },
  
  // ✅ ADD THIS
  async headers() {
    return [
      // Stop Vercel's edge from caching the service worker file. Without
      // this, a redeploy leaves browsers loading the PREVIOUS build's sw.js
      // — which precaches assets that no longer exist on the new deploy, so
      // the install phase fails, the SW never reaches "activated", and
      // `navigator.serviceWorker.ready` hangs forever. (This was breaking
      // the push-notification toggle on UAT.) Must come BEFORE the catch-
      // all "/(.*)" entry below so Next.js picks the more-specific match.
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/workbox-:hash*.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
      {
        source: "/(.*)", // Apply to all routes
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY", // Prevent iframe embedding
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self';", // Prevent clickjacking via CSP
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
  
}

module.exports = withBundleAnalyzer(withPWA(nextConfig))