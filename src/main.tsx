import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "@/lib/sentry";
import { analytics } from "@/lib/analytics";
import { initPrefetching } from "@/lib/prefetch";
import { AppLoader } from "@/components/AppLoader";

// Lazy load admin dashboard - rarely accessed
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

// Initialize error monitoring immediately (critical)
initSentry();

// Defer analytics initialization to improve LCP
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    analytics.init();
    initPrefetching();
  }, { timeout: 3000 });
} else {
  setTimeout(() => {
    analytics.init();
    initPrefetching();
  }, 2000);
}

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
