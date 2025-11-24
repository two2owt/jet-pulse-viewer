import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.tsx";
import AdminDashboard from "./pages/AdminDashboard";
import "./index.css";
import { initSentry } from "@/lib/sentry";
import { analytics } from "@/lib/analytics";

// Initialize error monitoring and analytics
initSentry();
analytics.init();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </ThemeProvider>
);
