import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import cssnano from "cssnano";
import { visualizer } from "rollup-plugin-visualizer";
// @ts-ignore - critters types are in a non-standard location
import Critters from "critters";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    // Enable modulepreload for critical chunks only - improves LCP by reducing request chain depth
    // Filter out heavy lazy chunks (mapbox, charts, sentry) to avoid unused JS warnings
    modulePreload: {
      polyfill: true,
      resolveDependencies: (filename, deps, { hostId, hostType }) => {
        // Critical chunks to preload - needed for initial render
        const criticalChunks = [
          'vendor-react',
          'vendor-router', 
          'vendor-query',
          'supabase',
          'ui-core',
          'forms',
          'index',
        ];
        
        // Lazy chunks to exclude - loaded on demand
        const lazyChunks = [
          'mapbox',
          'MapboxHeatmap',
          'sentry',
          'charts',
          'ui-dialogs',
          'animations',
        ];
        
        // Filter dependencies to only preload critical ones
        return deps.filter(dep => {
          const depName = dep.toLowerCase();
          // Exclude lazy chunks
          if (lazyChunks.some(lazy => depName.includes(lazy.toLowerCase()))) {
            return false;
          }
          // Include if it's a critical chunk or a core dependency
          return criticalChunks.some(critical => depName.includes(critical.toLowerCase())) ||
                 depName.includes('index') ||
                 depName.endsWith('.css');
        });
      },
    },
    // Optimize chunk splitting for better caching and reduced unused JS
    rollupOptions: {
      // Externalize mapbox-gl - load from CDN instead of bundling (saves ~448KB)
      external: mode === 'production' ? ['mapbox-gl'] : [],
      output: {
        // Map externalized modules to their global variable names
        globals: {
          'mapbox-gl': 'mapboxgl',
        },
        manualChunks: (id) => {
          // Core React - always needed, load first
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
          // Supabase - split into separate chunk, needed early for auth
          if (id.includes('@supabase/supabase-js') || id.includes('@supabase/')) {
            return 'supabase';
          }
          // Sentry - error monitoring, deferred loading (loaded on user interaction)
          if (id.includes('@sentry/')) {
            return 'sentry';
          }
          // Mapbox geometry deps - keep separate from charts to avoid initialization issues
          // Note: mapbox-gl itself is externalized to CDN in production
          const isMapboxDep =
            id.includes("martinez-polygon-clipping") ||
            id.includes("robust-predicates") ||
            id.includes("splaytree") ||
            id.includes("tinyqueue") ||
            id.includes("delaunator");

          if (isMapboxDep) {
            return "mapbox-deps";
          }

          // Recharts + D3 are only used in the admin analytics view.
          // IMPORTANT: Do not force them into a dedicated vendor chunk.
          // In some builds, splitting these ESM modules can lead to initialization-order issues
          // (e.g. "Cannot access 'S' before initialization" in the generated charts chunk).
          // Let Vite/Rollup decide optimal chunking so these modules stay co-located with their entry.

          // Dialogs - lazy loaded on user interaction
          if (id.includes('@radix-ui/react-dialog') || id.includes('@radix-ui/react-alert-dialog')) {
            return 'ui-dialogs';
          }
          // Form handling - needed for auth and settings
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
            return 'forms';
          }
          // Sonner/toast - frequently used but can defer
          if (id.includes('sonner')) {
            return 'toasts';
          }
          // Date utilities - used across the app
          if (id.includes('date-fns')) {
            return 'date-utils';
          }
          // Lucide icons - split from main bundle (tree-shaken but still notable)
          if (id.includes('lucide-react')) {
            return 'icons';
          }
          // Next-themes - small but separate for clarity
          if (id.includes('next-themes')) {
            return 'theme';
          }
          // Framer motion / animations
          if (id.includes('framer-motion')) {
            return 'animations';
          }
          // Split Radix UI into smaller chunks by usage frequency
          // Dialogs - used for modals, confirmations (common)
          if (id.includes('@radix-ui/react-dialog') || id.includes('@radix-ui/react-alert-dialog')) {
            return 'ui-dialogs';
          }
          // Menus - dropdowns, selects (common)
          if (id.includes('@radix-ui/react-select') || id.includes('@radix-ui/react-dropdown-menu')) {
            return 'ui-menus';
          }
          // Overlays - tooltips, popovers (common)
          if (id.includes('@radix-ui/react-tooltip') || id.includes('@radix-ui/react-popover')) {
            return 'ui-overlays';
          }
          // Panels - tabs, accordion (common)
          if (id.includes('@radix-ui/react-tabs') || id.includes('@radix-ui/react-accordion')) {
            return 'ui-panels';
          }
          // Form inputs - switch, checkbox, radio (settings/forms)
          if (id.includes('@radix-ui/react-switch') || id.includes('@radix-ui/react-checkbox') || id.includes('@radix-ui/react-radio-group')) {
            return 'ui-inputs';
          }
          // Toast radix - group with sonner
          if (id.includes('@radix-ui/react-toast')) {
            return 'toasts';
          }
          // Other Radix UI components
          if (id.includes('@radix-ui')) {
            return 'ui-core';
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
    // Transform CSS links to preload for non-blocking render
    {
      name: 'css-preload',
      transformIndexHtml(html: string) {
        // Only transform in production build
        if (mode === 'development') return html;
        // Convert CSS link tags to preload with media="print" hack for non-blocking load
        return html.replace(
          /<link rel="stylesheet" crossorigin href="(\/assets\/[^"]+\.css)">/g,
          '<link rel="preload" as="style" href="$1" onload="this.onload=null;this.rel=\'stylesheet\'">' +
          '<noscript><link rel="stylesheet" href="$1"></noscript>'
        );
      },
    },
    // Critical CSS extraction - inlines above-the-fold styles
    mode === 'production' && {
      name: 'critters-plugin',
      async transformIndexHtml(html: string) {
        try {
          const critters = new Critters({
            // Inline critical CSS
            inlineThreshold: 0,
            // Preload remaining CSS
            preload: 'swap',
            // Don't remove original CSS (already handled by css-preload plugin)
            pruneSource: false,
            // Reduce unused CSS
            reduceInlineStyles: true,
            // Inline fonts for faster LCP
            inlineFonts: true,
            // Compress inlined CSS
            compress: true,
            // Don't merge stylesheets
            mergeStylesheets: false,
            // Add noscript fallback
            noscriptFallback: true,
          });
          
          return await critters.process(html);
        } catch (e) {
          console.warn('Critters CSS extraction failed, using original HTML:', e);
          return html;
        }
      },
    },
    VitePWA({
      registerType: "prompt",
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
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api/, /^\/functions/],
        // Stability: don't force-activate and claim clients (can create controller churn)
        skipWaiting: false,
        clientsClaim: false,
        cleanupOutdatedCaches: true,
runtimeCaching: [
          // Cache all /assets/* files with immutable-like behavior
          // This bypasses the CDN's missing cache headers
          {
            urlPattern: /^https:\/\/[^/]+\/assets\/.+\.(js|css|woff|woff2|png|jpg|jpeg|webp|svg|ico)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "static-assets-cache",
              expiration: { 
                maxEntries: 200, 
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year - assets have content hashes
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Mapbox API (styles, fonts, glyphs) - NetworkFirst for freshness, fallback to cache offline
            urlPattern: /^https:\/\/api\.mapbox\.com\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "mapbox-api-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
              networkTimeoutSeconds: 3, // Fall back to cache if network is slow
            },
          },
          {
            // Mapbox tiles from main domain - CacheFirst for speed, works offline
            urlPattern: /^https:\/\/tiles\.mapbox\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "mapbox-tiles-cache",
              expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Mapbox tiles from subdomains (a, b, c, d) - CacheFirst for offline
            urlPattern: /^https:\/\/[a-d]\.tiles\.mapbox\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "mapbox-tiles-cache",
              expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Supabase API - no longer needed for fonts since self-hosted
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "supabase-api-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|webp|gif|svg)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "external-images-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "supabase-storage-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
    // Bundle analyzer - generates stats.html in project root after build
    mode === "production" && visualizer({
      filename: "stats.html",
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: "treemap", // Options: sunburst, treemap, network
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
