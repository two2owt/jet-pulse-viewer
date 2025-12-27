import { useEffect } from "react";

/**
 * Component that coordinates hiding the HTML app shell with smooth transitions.
 * 
 * The shell should be hidden once the main content is ready to display.
 * For the map view, this means waiting until the Mapbox token is available.
 * 
 * This component provides a fallback timeout to ensure the shell is always
 * eventually hidden, even if something goes wrong with the normal flow.
 */

// Export a function that can be called when the app is truly ready
export const hideAppShell = () => {
  const shell = document.getElementById('app-shell');
  if (shell && !shell.classList.contains('hidden')) {
    // Use RAF to ensure we're after paint
    requestAnimationFrame(() => {
      // Add smooth transition with easing
      shell.style.transition = 'opacity 300ms cubic-bezier(0.4, 0, 0.2, 1), transform 300ms cubic-bezier(0.4, 0, 0.2, 1)';
      shell.style.opacity = '0';
      shell.style.transform = 'scale(1.02)';
      shell.style.pointerEvents = 'none';
      
      // Remove from DOM after transition completes
      setTimeout(() => {
        shell.classList.add('hidden');
        shell.style.display = 'none';
      }, 300);
    });
  }
};

// Check if shell is already hidden
export const isAppShellHidden = () => {
  const shell = document.getElementById('app-shell');
  return !shell || shell.classList.contains('hidden');
};

// Prepare the shell for transition (call before hiding for smoother effect)
export const prepareShellTransition = () => {
  const shell = document.getElementById('app-shell');
  if (shell && !shell.classList.contains('hidden')) {
    shell.style.willChange = 'opacity, transform';
  }
};

export const AppShellLoader = () => {
  useEffect(() => {
    // Prepare for smooth transition
    prepareShellTransition();
    
    // Fallback: if nothing else hides the shell after 5 seconds,
    // hide it anyway to prevent getting permanently stuck
    const maxTimeout = setTimeout(() => {
      if (!isAppShellHidden()) {
        console.warn('AppShellLoader: Force hiding shell after timeout');
        hideAppShell();
      }
    }, 5000);
    
    return () => clearTimeout(maxTimeout);
  }, []);
  
  return null;
};
