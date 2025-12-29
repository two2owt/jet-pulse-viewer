import { Map, Compass, Bell, Star, Users } from "lucide-react";
import { useCallback } from "react";
import { Skeleton } from "./ui/skeleton";

type NavItem = "map" | "explore" | "notifications" | "favorites" | "social";

interface BottomNavProps {
  activeTab: NavItem;
  onTabChange: (tab: NavItem) => void;
  notificationCount?: number;
  /** Show skeleton loading state */
  isLoading?: boolean;
  /** Callback to prefetch heavy resources on hover/touch */
  onPrefetch?: (tab: NavItem) => void;
}

export const BottomNav = ({ activeTab, onTabChange, notificationCount = 3, isLoading = false, onPrefetch }: BottomNavProps) => {
  // Track if we've already prefetched to avoid redundant calls
  const handlePrefetch = useCallback((tab: NavItem) => {
    if (onPrefetch && tab !== activeTab) {
      onPrefetch(tab);
    }
  }, [onPrefetch, activeTab]);
  const navItems = [
    { id: "map" as NavItem, icon: Map, label: "Map" },
    { id: "explore" as NavItem, icon: Compass, label: "Explore" },
    { id: "notifications" as NavItem, icon: Bell, label: "Alerts" },
    { id: "favorites" as NavItem, icon: Star, label: "Favorites" },
    { id: "social" as NavItem, icon: Users, label: "Friends" },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-card/98 backdrop-blur-xl border-t border-border/50 z-[60] nav-contained"
      role="navigation"
      aria-label="Main navigation"
      style={{
        paddingBottom: 'var(--safe-area-inset-bottom)',
        paddingLeft: 'var(--safe-area-inset-left)',
        paddingRight: 'var(--safe-area-inset-right)',
        height: 'var(--bottom-nav-total-height)',
        minHeight: 'var(--bottom-nav-total-height)',
        maxHeight: 'var(--bottom-nav-total-height)',
        contain: 'strict',
        transform: 'translateZ(0)',
        willChange: 'transform',
      }}
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-4 h-full flex items-center">
        {isLoading ? (
          // Skeleton loading state - matches nav item dimensions
          <div className="flex items-center justify-around w-full animate-fade-in">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center gap-1 px-3 sm:px-4 md:px-5 py-2 min-w-[48px] sm:min-w-[56px] md:min-w-[64px] min-h-[48px] sm:min-h-[52px] md:min-h-[56px]"
              >
                <Skeleton className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-md animate-pulse" />
                <Skeleton className="w-10 h-2.5 sm:h-3 md:h-3.5 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-around w-full animate-fade-in">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  onMouseEnter={() => handlePrefetch(item.id)}
                  onTouchStart={() => handlePrefetch(item.id)}
                  aria-label={`${item.label}${item.id === 'notifications' && notificationCount > 0 ? `, ${notificationCount} unread` : ''}`}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative flex flex-col items-center justify-center gap-1 px-3 sm:px-4 md:px-5 py-2 rounded-xl transition-all duration-300 min-w-[48px] sm:min-w-[56px] md:min-w-[64px] min-h-[48px] sm:min-h-[52px] md:min-h-[56px] touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    isActive
                      ? "bg-gradient-primary shadow-glow text-primary-foreground scale-105"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 active:bg-secondary/70 active:text-foreground"
                  }`}
                >
                  <Icon 
                    className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 transition-transform duration-300" 
                    strokeWidth={isActive ? 2.5 : 2}
                    aria-hidden="true"
                  />
                  
                  <span className={`text-[10px] sm:text-xs md:text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                    isActive ? "opacity-100" : "opacity-70"
                  }`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
};
