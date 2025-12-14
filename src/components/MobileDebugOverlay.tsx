import { useState, useEffect } from "react";
import { Bug, X } from "lucide-react";
import { Button } from "./ui/button";

export const MobileDebugOverlay = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    viewportHeight: 0,
    dvh: 0,
    innerHeight: 0,
    scrollY: 0,
    scrollHeight: 0,
    clientHeight: 0,
    safeAreaTop: '0px',
    safeAreaBottom: '0px',
    safeAreaLeft: '0px',
    safeAreaRight: '0px',
    userAgent: '',
  });

  useEffect(() => {
    const updateDebugInfo = () => {
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      
      setDebugInfo({
        viewportHeight: window.innerHeight,
        dvh: parseFloat(computedStyle.getPropertyValue('--dvh') || '0') || window.innerHeight,
        innerHeight: window.innerHeight,
        scrollY: window.scrollY,
        scrollHeight: document.body.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
        safeAreaTop: computedStyle.getPropertyValue('--safe-area-inset-top') || 'env() not supported',
        safeAreaBottom: computedStyle.getPropertyValue('--safe-area-inset-bottom') || 'env() not supported',
        safeAreaLeft: computedStyle.getPropertyValue('--safe-area-inset-left') || 'env() not supported',
        safeAreaRight: computedStyle.getPropertyValue('--safe-area-inset-right') || 'env() not supported',
        userAgent: navigator.userAgent.substring(0, 50) + '...',
      });
    };

    updateDebugInfo();
    
    window.addEventListener('resize', updateDebugInfo);
    window.addEventListener('scroll', updateDebugInfo);
    
    const interval = setInterval(updateDebugInfo, 500);
    
    return () => {
      window.removeEventListener('resize', updateDebugInfo);
      window.removeEventListener('scroll', updateDebugInfo);
      clearInterval(interval);
    };
  }, []);

  // Only show in development
  if (import.meta.env.PROD) return null;

  return (
    <>
      {/* Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="icon"
        variant="outline"
        className="fixed bottom-20 right-2 z-[10000] w-8 h-8 rounded-full bg-destructive/80 border-destructive text-destructive-foreground hover:bg-destructive"
      >
        {isOpen ? <X className="w-4 h-4" /> : <Bug className="w-4 h-4" />}
      </Button>

      {/* Debug Panel */}
      {isOpen && (
        <div className="fixed bottom-32 right-2 z-[10000] w-64 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 text-xs font-mono shadow-lg">
          <h3 className="font-bold text-primary mb-2 text-sm">Mobile Debug</h3>
          
          <div className="space-y-1.5">
            <div className="border-b border-border pb-1.5 mb-1.5">
              <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Viewport</p>
              <p>innerHeight: <span className="text-primary">{debugInfo.innerHeight}px</span></p>
              <p>clientHeight: <span className="text-primary">{debugInfo.clientHeight}px</span></p>
              <p>100vh: <span className="text-primary">{debugInfo.viewportHeight}px</span></p>
            </div>

            <div className="border-b border-border pb-1.5 mb-1.5">
              <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Scroll</p>
              <p>scrollY: <span className="text-primary">{debugInfo.scrollY}px</span></p>
              <p>scrollHeight: <span className="text-primary">{debugInfo.scrollHeight}px</span></p>
            </div>

            <div className="border-b border-border pb-1.5 mb-1.5">
              <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Safe Area Insets</p>
              <p>top: <span className="text-primary">{debugInfo.safeAreaTop}</span></p>
              <p>bottom: <span className="text-primary">{debugInfo.safeAreaBottom}</span></p>
              <p>left: <span className="text-primary">{debugInfo.safeAreaLeft}</span></p>
              <p>right: <span className="text-primary">{debugInfo.safeAreaRight}</span></p>
            </div>

            <div>
              <p className="text-muted-foreground text-[10px] uppercase tracking-wider">User Agent</p>
              <p className="text-[9px] break-all text-muted-foreground">{debugInfo.userAgent}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
