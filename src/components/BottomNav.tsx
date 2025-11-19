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
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border safe-area-bottom z-50">
      <div className="max-w-lg mx-auto px-4 py-3">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-300 ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="relative">
                  <Icon className={`w-6 h-6 transition-transform duration-300 ${
                    isActive ? "scale-110" : ""
                  }`} />
                </div>
                
                <span className={`text-xs font-medium transition-all duration-300 ${
                  isActive ? "opacity-100" : "opacity-60"
                }`}>
                  {item.label}
                </span>
                
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
