import { ReactNode } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import {
  MapSkeleton,
  FavoritesSkeleton,
  SettingsSkeleton,
  ProfileSkeleton,
  SocialPageSkeleton,
  ExploreTabSkeleton,
} from "@/components/skeletons";
import { NotificationSkeleton } from "@/components/skeletons/NotificationSkeleton";

export type PageType = 
  | "map" 
  | "explore" 
  | "notifications" 
  | "favorites" 
  | "social" 
  | "settings" 
  | "profile" 
  | "auth" 
  | "admin"
  | "generic";

interface PageLoadingWrapperProps {
  pageType: PageType;
  showHeader?: boolean;
  showBottomNav?: boolean;
  children?: ReactNode;
}

const NotificationListSkeleton = () => (
  <div className="space-y-3">
    {[0, 1, 2, 3, 4].map((i) => (
      <NotificationSkeleton key={i} />
    ))}
  </div>
);

const GenericSkeleton = () => (
  <div className="space-y-6">
    <div className="space-y-2">
      <div className="h-8 w-48 bg-muted rounded animate-shimmer" />
      <div className="h-4 w-64 bg-muted rounded animate-shimmer" style={{ animationDelay: '100ms' }} />
    </div>
    <div className="h-40 w-full bg-muted rounded-xl animate-shimmer" style={{ animationDelay: '200ms' }} />
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 w-full bg-muted rounded-lg animate-shimmer" style={{ animationDelay: `${300 + i * 100}ms` }} />
      ))}
    </div>
  </div>
);

const SkeletonContent = ({ pageType }: { pageType: PageType }) => {
  switch (pageType) {
    case "map":
      return <MapSkeleton />;
    case "explore":
      return <ExploreTabSkeleton />;
    case "notifications":
      return <NotificationListSkeleton />;
    case "favorites":
      return <FavoritesSkeleton />;
    case "social":
      return <SocialPageSkeleton />;
    case "settings":
      return <SettingsSkeleton />;
    case "profile":
      return <ProfileSkeleton />;
    case "auth":
    case "admin":
    case "generic":
    default:
      return <GenericSkeleton />;
  }
};

export const PageLoadingWrapper = ({
  pageType,
  showHeader = true,
  showBottomNav = true,
}: PageLoadingWrapperProps) => {
  const isFullScreen = pageType === "map" || pageType === "auth";

  return (
    <>
      {showHeader && (
        <Header 
          venues={[]}
          deals={[]}
          onVenueSelect={() => {}}
        />
      )}
      <div className={`bg-background ${isFullScreen ? 'h-screen overflow-hidden' : 'min-h-screen pb-[calc(5rem+var(--safe-area-inset-bottom))]'}`}>
        {pageType === "map" ? (
          <div 
            className="relative w-full"
            style={{ 
              height: 'calc(100dvh - 7rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
              minHeight: '400px',
            }}
          >
            <SkeletonContent pageType={pageType} />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-fluid-md py-fluid-lg">
            <SkeletonContent pageType={pageType} />
          </div>
        )}
      </div>
      {showBottomNav && (
        <BottomNav 
          activeTab={pageType === "map" ? "map" : pageType === "explore" ? "explore" : pageType === "notifications" ? "notifications" : pageType === "favorites" ? "favorites" : pageType === "social" ? "social" : "map"}
          onTabChange={() => {}}
          notificationCount={0}
        />
      )}
    </>
  );
};

// Utility function to get page type from route
export const getPageTypeFromRoute = (pathname: string): PageType => {
  if (pathname === "/" || pathname === "") return "map";
  if (pathname.includes("tab=explore")) return "explore";
  if (pathname.includes("tab=notifications")) return "notifications";
  if (pathname === "/favorites") return "favorites";
  if (pathname === "/social") return "social";
  if (pathname === "/settings") return "settings";
  if (pathname === "/profile") return "profile";
  if (pathname === "/auth") return "auth";
  if (pathname === "/admin") return "admin";
  return "generic";
};

export default PageLoadingWrapper;
