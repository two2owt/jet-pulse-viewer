import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { analytics } from "@/lib/analytics";

export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    analytics.pageView(location.pathname);
  }, [location.pathname]);
};

export const useAnalytics = () => {
  return {
    track: analytics.track.bind(analytics),
    identify: analytics.identify.bind(analytics),
    dealViewed: analytics.dealViewed.bind(analytics),
    dealClicked: analytics.dealClicked.bind(analytics),
    buttonClicked: analytics.buttonClicked.bind(analytics),
    searchPerformed: analytics.searchPerformed.bind(analytics),
    authEvent: analytics.authEvent.bind(analytics),
  };
};
