import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route, useLocation } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLoader } from "@/components/AppLoader";

// Lazy load toaster components - not needed until a toast is triggered
const Toaster = lazy(() => import("@/components/ui/toaster").then(m => ({ default: m.Toaster })));
const Sonner = lazy(() => import("@/components/ui/sonner").then(m => ({ default: m.Toaster })));

// Lazy load PWA prompt - only needed after initial render
const PWAInstallPrompt = lazy(() => import("@/components/PWAInstallPrompt").then(m => ({ default: m.PWAInstallPrompt })));

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
const InvestorDeck = lazy(() => import("./pages/InvestorDeck"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageTracker = () => {
  const location = useLocation();
  const analyticsRef = useRef<typeof import("@/lib/analytics").analytics | null>(null);
  
  useEffect(() => {
    // Lazy load analytics module to reduce initial bundle
    if (!analyticsRef.current) {
      import("@/lib/analytics").then(({ analytics }) => {
        analyticsRef.current = analytics;
        analytics.pageView(location.pathname);
      });
    } else {
      analyticsRef.current.pageView(location.pathname);
    }
  }, [location.pathname]);
  
  return null;
};

// Deferred loading wrapper for non-critical UI
const DeferredUI = () => {
  const [showDeferred, setShowDeferred] = useState(false);
  
  useEffect(() => {
    // Delay loading of toasters and PWA prompt until after first paint
    const timer = requestAnimationFrame(() => {
      setTimeout(() => setShowDeferred(true), 100);
    });
    return () => cancelAnimationFrame(timer);
  }, []);
  
  if (!showDeferred) return null;
  
  return (
    <Suspense fallback={null}>
      <Toaster />
      <Sonner />
      <PWAInstallPrompt />
    </Suspense>
  );
};

const App = () => (
  <ErrorBoundary>
    <AuthProvider>
      <TooltipProvider>
        <div className="app-wrapper">
          <DeferredUI />
          <PageTracker />
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
              <Route path="/investor-deck" element={<InvestorDeck />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </div>
      </TooltipProvider>
    </AuthProvider>
  </ErrorBoundary>
);

export default App;
