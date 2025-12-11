import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "@/lib/sentry";
import { analytics } from "@/lib/analytics";
import { initPrefetching } from "@/lib/prefetch";

// Lazy load admin dashboard - rarely accessed
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

// Initialize error monitoring and analytics
initSentry();
analytics.init();

// Prefetch heavy chunks during idle time
initPrefetching();

// Create QueryClient
const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/*" element={<App />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  </ThemeProvider>
);
