import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route, useLocation } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { analytics } from "@/lib/analytics";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLoader } from "@/components/AppLoader";

// Lazy load pages for better performance with webpack magic comments for prefetching
const Index = lazy(() => import(/* webpackPrefetch: true */ "./pages/Index"));
const Auth = lazy(() => import(/* webpackPrefetch: true */ "./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Social = lazy(() => import("./pages/Social"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const VerificationSuccess = lazy(() => import("./pages/VerificationSuccess"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageTracker = () => {
  const location = useLocation();
  
  useEffect(() => {
    analytics.pageView(location.pathname);
  }, [location.pathname]);
  
  return null;
};

const App = () => (
  <ErrorBoundary>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PageTracker />
        <PWAInstallPrompt />
        <Suspense fallback={<AppLoader message="Loading" />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/social" element={<Social />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/verification-success" element={<VerificationSuccess />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </TooltipProvider>
    </AuthProvider>
  </ErrorBoundary>
);

export default App;
