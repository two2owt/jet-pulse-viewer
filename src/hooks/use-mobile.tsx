import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  // Initialize with a check that works on both server and client
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    // Check if window is defined (client-side)
    if (typeof window !== "undefined") {
      return window.innerWidth < MOBILE_BREAKPOINT;
    }
    // Default to false on server
    return false;
  });

  React.useEffect(() => {
    // Ensure we have the correct value after hydration
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Check immediately
    checkMobile();

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => checkMobile();
    
    mql.addEventListener("change", onChange);
    window.addEventListener("resize", onChange);
    
    return () => {
      mql.removeEventListener("change", onChange);
      window.removeEventListener("resize", onChange);
    };
  }, []);

  return isMobile;
}
