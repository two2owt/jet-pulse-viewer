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

// Initialize error monitoring and analytics
initSentry();
analytics.init();

// Prefetch heavy chunks during idle time
initPrefetching();

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
