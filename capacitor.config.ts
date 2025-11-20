import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor configuration for native iOS and Android apps
// The app works in both web and native contexts:
// - Web: Deployed as a standard web app (native features gracefully degrade)
// - Native: Full access to device features (haptics, push notifications, etc.)
const config: CapacitorConfig = {
  appId: 'app.lovable.dafac77279084bdb873c58a805d7581e',
  appName: 'jet-pulse-viewer',
  webDir: 'dist',
  server: {
    // Hot-reload from Lovable during development
    // Remove this when building for production
    url: 'https://dafac772-7908-4bdb-873c-58a805d7581e.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#000000',
      showSpinner: false,
    },
  },
};

export default config;
