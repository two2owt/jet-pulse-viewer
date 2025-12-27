import { useEffect } from "react";

/**
 * Component that hides the HTML app shell once React has rendered
 * This ensures we have visible content for FCP while React loads
 */
export const AppShellLoader = () => {
  useEffect(() => {
    // Hide the static app shell now that React has rendered
    const shell = document.getElementById('app-shell');
    if (shell) {
      shell.classList.add('hidden');
    }
  }, []);
  
  return null;
};
