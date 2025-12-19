import { Plane } from "lucide-react";

interface AppLoaderProps {
  message?: string;
  showProgress?: boolean;
}

export const AppLoader = ({ message = "Loading JET", showProgress = false }: AppLoaderProps) => {
  return (
    <div 
      className="app-loader-container flex items-center justify-center min-h-screen bg-background"
      style={{
        // Inline fallback colors ensure visibility even if CSS hasn't loaded
        // Light mode default
        backgroundColor: 'hsl(0, 0%, 98%)',
      }}
    >
      {/* Apply theme-aware background via inline style for reliability on mobile */}
      <style>{`
        @media (prefers-color-scheme: dark) {
          .app-loader-container {
            background-color: hsl(0, 0%, 6%) !important;
          }
          .app-loader-container .loader-text {
            color: hsl(0, 0%, 98%) !important;
          }
          .app-loader-container .loader-ring-bg {
            stroke: rgba(255, 140, 51, 0.2) !important;
          }
          .app-loader-container .loader-ring-fg {
            stroke: hsl(24, 100%, 60%) !important;
          }
          .app-loader-container .loader-icon {
            color: hsl(24, 100%, 60%) !important;
          }
        }
        .dark .app-loader-container {
          background-color: hsl(0, 0%, 6%) !important;
        }
        .dark .app-loader-container .loader-text {
          color: hsl(0, 0%, 98%) !important;
        }
        .dark .app-loader-container .loader-ring-bg {
          stroke: rgba(255, 140, 51, 0.2) !important;
        }
        .dark .app-loader-container .loader-ring-fg {
          stroke: hsl(24, 100%, 60%) !important;
        }
        .dark .app-loader-container .loader-icon {
          color: hsl(24, 100%, 60%) !important;
        }
        @keyframes loader-float {
          0%, 100% { transform: rotate(-45deg) translateY(0); }
          50% { transform: rotate(-45deg) translateY(-4px); }
        }
        @keyframes loader-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
      {/* Subtle background gradient */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(255, 140, 51, 0.15) 0%, transparent 70%)',
        }}
      />
      
      <div className="relative flex flex-col items-center gap-4 px-4 z-10">
        {/* Progress circle with centered plane */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
          {/* Spinning progress ring */}
          <svg 
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            style={{ animation: 'loader-spin 1.5s linear infinite' }}
          >
            <circle
              className="loader-ring-bg"
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="rgba(255, 140, 51, 0.2)"
              strokeWidth="4"
            />
            <circle
              className="loader-ring-fg"
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="hsl(24, 100%, 50%)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="70 213"
            />
          </svg>
          
          {/* Centered plane icon */}
          <Plane 
            className="loader-icon w-8 h-8 sm:w-10 sm:h-10 text-primary z-10"
            style={{ 
              transform: 'rotate(-45deg)',
              animation: 'loader-float 2s ease-in-out infinite',
              color: 'hsl(24, 100%, 50%)',
            }}
          />
        </div>
        
        {/* Loading text */}
        <div className="text-center space-y-1">
          <p 
            className="loader-text text-sm sm:text-base font-medium text-foreground tracking-wide"
            style={{ color: 'hsl(0, 0%, 10%)' }}
          >
            {message}
          </p>
          {showProgress && (
            <div className="flex items-center gap-1 justify-center">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'hsl(24, 100%, 50%)', animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'hsl(24, 100%, 50%)', animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'hsl(24, 100%, 50%)', animationDelay: '300ms' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
