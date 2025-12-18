import { Plane } from "lucide-react";

interface AppLoaderProps {
  message?: string;
  showProgress?: boolean;
}

export const AppLoader = ({ message = "Loading JET", showProgress = false }: AppLoaderProps) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      {/* Subtle background gradient */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
        }}
      />
      
      <div className="relative flex flex-col items-center gap-4 px-4 z-10">
        {/* Animated plane with glow */}
        <div className="relative">
          <div 
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary) / 0.15) 0%, hsl(var(--accent) / 0.1) 100%)',
              boxShadow: '0 0 40px hsl(var(--primary) / 0.2)',
            }}
          >
            <Plane 
              className="w-8 h-8 sm:w-10 sm:h-10 text-primary"
              style={{ 
                transform: 'rotate(-45deg)',
                animation: 'loader-float 2s ease-in-out infinite',
              }}
            />
          </div>
          
          {/* Pulsing ring */}
          <div 
            className="absolute inset-0 rounded-full border-2 border-primary/30"
            style={{ animation: 'loader-pulse-ring 1.5s ease-out infinite' }}
          />
        </div>
        
        {/* Loading text */}
        <div className="text-center space-y-1">
          <p className="text-sm sm:text-base font-medium text-foreground tracking-wide">
            {message}
          </p>
          {showProgress && (
            <div className="flex items-center gap-1 justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes loader-float {
          0%, 100% { transform: rotate(-45deg) translateY(0); }
          50% { transform: rotate(-45deg) translateY(-6px); }
        }
        @keyframes loader-pulse-ring {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.3); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
