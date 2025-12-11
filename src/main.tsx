import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import AdminDashboard from "./pages/AdminDashboard";
import "./index.css";
import { initSentry } from "@/lib/sentry";
import { analytics } from "@/lib/analytics";
import { initPrefetching } from "@/lib/prefetch";

// Initialize error monitoring and analytics
initSentry();
analytics.init();

// Prefetch heavy chunks during idle time
initPrefetching();

// Create QueryClient
const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </ThemeProvider>
);
