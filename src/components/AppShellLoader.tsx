import { useEffect } from "react";

/**
 * Component that hides the HTML app shell once React has rendered
 * This ensures we have visible content for FCP while React loads
 */
export const AppShellLoader = () => {
  useEffect(() => {
    // Hide the static app shell now that React has rendered
    if (typeof window !== 'undefined' && window.__hideAppShell) {
      window.__hideAppShell();
    }
    
    // Also remove it directly in case the function wasn't defined
    const shell = document.getElementById('app-shell');
    if (shell) {
      shell.style.display = 'none';
    }
  }, []);
  
  return null;
};

// Extend Window interface for TypeScript
declare global {
  interface Window {
    __hideAppShell?: () => void;
  }
}
