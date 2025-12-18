import { Map, Compass, Bell, Star, Users } from "lucide-react";
import { useState } from "react";

type NavItem = "map" | "explore" | "notifications" | "favorites" | "social";

interface BottomNavProps {
  activeTab: NavItem;
  onTabChange: (tab: NavItem) => void;
  notificationCount?: number;
}

export const BottomNav = ({ activeTab, onTabChange, notificationCount = 3 }: BottomNavProps) => {
  const navItems = [
    { id: "map" as NavItem, icon: Map, label: "Map" },
    { id: "explore" as NavItem, icon: Compass, label: "Explore" },
    { id: "notifications" as NavItem, icon: Bell, label: "Alerts" },
    { id: "favorites" as NavItem, icon: Star, label: "Favorites" },
    { id: "social" as NavItem, icon: Users, label: "Friends" },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-card/98 backdrop-blur-xl border-t border-border/50 z-50 nav-contained"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.25rem)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
        minHeight: '56px',
        contain: 'layout style',
      }}
    >
      <div className="max-w-7xl mx-auto px-1 sm:px-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`relative flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-300 min-w-[44px] min-h-[44px] touch-manipulation ${
                  isActive
                    ? "bg-gradient-primary shadow-glow text-primary-foreground scale-105"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 active:bg-secondary/70 active:text-foreground"
                }`}
              >
                <Icon 
                  className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300" 
                  strokeWidth={isActive ? 2.5 : 2}
                />
                
                <span className={`text-[10px] sm:text-xs font-semibold transition-all duration-300 whitespace-nowrap ${
                  isActive ? "opacity-100" : "opacity-70"
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
