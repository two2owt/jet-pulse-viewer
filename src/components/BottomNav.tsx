import { Map, Compass, Bell, User } from "lucide-react";
import { useState } from "react";

type NavItem = "map" | "explore" | "notifications" | "profile";

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
    { id: "profile" as NavItem, icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/98 backdrop-blur-xl border-t border-border/50 safe-area-bottom z-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-3 md:py-4">
        <div className="flex items-center justify-around gap-1 sm:gap-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`relative flex flex-col items-center justify-center gap-1 sm:gap-1.5 md:gap-2 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-xl sm:rounded-2xl transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-primary shadow-glow text-primary-foreground scale-105"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <Icon 
                  className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 transition-transform duration-300" 
                  strokeWidth={isActive ? 2.5 : 2}
                />
                
                <span className={`text-xs sm:text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
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
