import { useEffect } from "react";

/**
 * Component that hides the HTML app shell once React has rendered
 * This ensures we have visible content for FCP while React loads
 */
export const AppShellLoader = () => {
  useEffect(() => {
    // Hide the static app shell immediately since React has rendered
    // Use RAF to ensure we're after paint
    requestAnimationFrame(() => {
      const shell = document.getElementById('app-shell');
      if (shell) {
        // Add transition for smooth fade
        shell.style.transition = 'opacity 150ms ease-out';
        shell.style.opacity = '0';
        
        // Remove from DOM after fade completes
        setTimeout(() => {
          shell.classList.add('hidden');
          shell.style.display = 'none';
        }, 150);
      }
    });
  }, []);
  
  return null;
};
