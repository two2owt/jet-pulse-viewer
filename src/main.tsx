import React from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import App from "./App.tsx";
import "./index.css";
import { AppLoader } from "@/components/AppLoader";

// Lazy load admin dashboard - rarely accessed
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

// Defer Sentry init - dynamically import to avoid bundling in main chunk
const initCritical = () => {
  const loadSentry = () => {
    import("@/lib/sentry").then(({ initSentry }) => initSentry());
  };
  
  // Use requestIdleCallback for non-urgent initialization
  if ('requestIdleCallback' in window) {
    requestIdleCallback(loadSentry, { timeout: 3000 });
  } else {
    setTimeout(loadSentry, 1000);
  }
};
initCritical();

// Helper to yield to main thread and break up long tasks
const yieldToMain = (): Promise<void> => {
  return new Promise((resolve) => {
    if ('scheduler' in window && 'yield' in (window as any).scheduler) {
      (window as any).scheduler.yield().then(resolve);
    } else {
      // Use multiple frames to ensure browser can render
      requestAnimationFrame(() => setTimeout(resolve, 0));
    }
  });
};

// Defer non-critical initialization significantly
const initNonCritical = async () => {
  // Wait longer for first meaningful paint and user interaction
  await new Promise<void>((resolve) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => resolve(), { timeout: 8000 });
    } else {
      setTimeout(resolve, 5000);
    }
  });
  
  // Yield before analytics to break up long tasks
  await yieldToMain();
  
  // Import and init analytics lazily in small chunks
  const { analytics } = await import("@/lib/analytics");
  await yieldToMain();
  analytics.init();
  
  // Yield again before prefetching
  await yieldToMain();
  
  const { initPrefetching } = await import("@/lib/prefetch");
  await yieldToMain();
  initPrefetching();
  
  // Register service worker after all critical work is done
  await yieldToMain();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
  }
};

// Start non-critical initialization after render
requestAnimationFrame(() => {
  initNonCritical();
});

// Create QueryClient with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (was cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<AppLoader message="Starting JET" showProgress />}>
          <Routes>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/*" element={<App />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  </ThemeProvider>
);
