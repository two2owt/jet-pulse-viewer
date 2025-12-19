import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import cssnano from "cssnano";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    // Optimize chunk splitting for better caching and reduced unused JS
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React - always needed
          if (id.includes('react-dom') || id.includes('react/') || id.includes('/react/')) {
            return 'vendor-react';
          }
          // React Router - needed for navigation
          if (id.includes('react-router')) {
            return 'vendor-router';
          }
          // TanStack Query - data fetching
          if (id.includes('@tanstack/react-query')) {
            return 'vendor-query';
          }
          // Supabase - split into separate chunk
          if (id.includes('@supabase/supabase-js') || id.includes('@supabase/')) {
            return 'supabase';
          }
          // Sentry - error monitoring, load deferred
          if (id.includes('@sentry/')) {
            return 'sentry';
          }
          // Sonner/toast - deferred loading
          if (id.includes('sonner')) {
            return 'toasts';
          }
          // Mapbox - heavy, load on demand
          if (id.includes('mapbox-gl')) {
            return 'mapbox';
          }
          // Split Radix UI into smaller chunks by usage frequency
          if (id.includes('@radix-ui/react-dialog') || id.includes('@radix-ui/react-alert-dialog')) {
            return 'ui-dialogs';
          }
          if (id.includes('@radix-ui/react-select') || id.includes('@radix-ui/react-dropdown-menu')) {
            return 'ui-menus';
          }
          if (id.includes('@radix-ui/react-tooltip') || id.includes('@radix-ui/react-popover')) {
            return 'ui-overlays';
          }
          if (id.includes('@radix-ui/react-tabs') || id.includes('@radix-ui/react-accordion')) {
            return 'ui-panels';
          }
          if (id.includes('@radix-ui/react-switch') || id.includes('@radix-ui/react-checkbox') || id.includes('@radix-ui/react-radio-group')) {
            return 'ui-inputs';
          }
          if (id.includes('@radix-ui/react-toast')) {
            return 'toasts';
          }
          if (id.includes('@radix-ui')) {
            return 'ui-core';
          }
          // Recharts - charts, load on demand
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'charts';
          }
          // Date utilities
          if (id.includes('date-fns')) {
            return 'date-utils';
          }
          // Lucide icons - split from main bundle
          if (id.includes('lucide-react')) {
            return 'icons';
          }
          // Form handling
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
            return 'forms';
          }
          // Framer motion / animations
          if (id.includes('framer-motion')) {
            return 'animations';
          }
          // Next-themes - theme management
          if (id.includes('next-themes')) {
            return 'theme';
          }
        },
      },
    },
    // Target modern browsers only - avoids unnecessary polyfills for ES6+ features
    target: ['es2022', 'chrome100', 'firefox100', 'safari15'],
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 600,
    // Enable minification optimizations
    minify: 'esbuild',
    // Enable tree shaking
    treeshake: true,
  },
  css: {
    postcss: {
      plugins: [
        cssnano({
          preset: ['default', {
            discardComments: { removeAll: true },
            normalizeWhitespace: true,
            colormin: false, // Disable to preserve HSL color values
            reduceIdents: false,
            mergeRules: true,
            calc: false, // Preserve calc() and clamp() functions
          }],
        }),
      ],
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      // Defer service worker registration to avoid render-blocking
      injectRegister: null,
      includeAssets: ["favicon.ico", "robots.txt", "jet-email-logo.png"],
      manifest: {
        name: "JET - Discover What's Hot",
        short_name: "JET",
        description: "Find trending venues, live events, and exclusive deals with real-time heatmaps",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff,woff2,jpg,jpeg}"],
        // Precache critical navigation routes
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api/, /^\/functions/],
        // Skip waiting for faster updates
        skipWaiting: true,
        clientsClaim: true,
        // Clean old caches
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          // Cache static JS/CSS assets with long TTL
          {
            urlPattern: /^https:\/\/jet-around\.lovable\.app\/assets\/.*\.(js|css)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "static-assets-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year (immutable hashed assets)
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Cache page navigations with network-first
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: "NetworkFirst",
            options: {
              cacheName: "pages-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
              networkTimeoutSeconds: 3,
            },
          },
          // Cache Supabase API calls with stale-while-revalidate
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "supabase-api-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Cache Mapbox tiles and API
          {
            urlPattern: /^https:\/\/api\.mapbox\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "mapbox-api-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/tiles\.mapbox\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "mapbox-tiles-cache",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Cache Google Fonts stylesheets
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Cache Google Fonts webfonts
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Cache external images (venue images, etc.)
          {
            urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|webp|gif|svg)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "external-images-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Cache Supabase storage images
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "supabase-storage-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
