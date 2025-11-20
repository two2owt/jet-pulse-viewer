import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.dafac77279084bdb873c58a805d7581e',
  appName: 'jet-pulse-viewer',
  webDir: 'dist',
  server: {
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
