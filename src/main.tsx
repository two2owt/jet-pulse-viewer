import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "@/lib/sentry";
import { AppLoader } from "@/components/AppLoader";

// Lazy load admin dashboard - rarely accessed
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

// Initialize error monitoring immediately (critical)
initSentry();

// Helper to yield to main thread and break up long tasks
const yieldToMain = (): Promise<void> => {
  return new Promise((resolve) => {
    if ('scheduler' in window && 'yield' in (window as any).scheduler) {
      (window as any).scheduler.yield().then(resolve);
    } else {
      setTimeout(resolve, 0);
    }
  });
};

// Defer non-critical initialization after first paint
const initNonCritical = async () => {
  // Wait for first paint
  await new Promise<void>((resolve) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => resolve(), { timeout: 5000 });
    } else {
      setTimeout(resolve, 3000);
    }
  });
  
  // Yield before analytics to break up long tasks
  await yieldToMain();
  
  // Import and init analytics lazily
  const { analytics } = await import("@/lib/analytics");
  analytics.init();
  
  // Yield again before prefetching
  await yieldToMain();
  
  const { initPrefetching } = await import("@/lib/prefetch");
  initPrefetching();
};

// Start non-critical initialization
initNonCritical();

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
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
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
