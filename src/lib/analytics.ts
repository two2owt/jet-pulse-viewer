import mixpanel from "mixpanel-browser";

const MIXPANEL_TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN;

class Analytics {
  private initialized = false;

  init() {
    if (MIXPANEL_TOKEN && !this.initialized) {
      mixpanel.init(MIXPANEL_TOKEN, {
        debug: import.meta.env.DEV,
        track_pageview: true,
        persistence: "localStorage",
      });
      this.initialized = true;
    }
  }

  identify(userId: string, traits?: Record<string, any>) {
    if (!this.initialized) return;
    mixpanel.identify(userId);
    if (traits) {
      mixpanel.people.set(traits);
    }
  }

  track(eventName: string, properties?: Record<string, any>) {
    if (!this.initialized) return;
    mixpanel.track(eventName, properties);
  }

  pageView(pageName: string, properties?: Record<string, any>) {
    this.track("Page Viewed", {
      page: pageName,
      ...properties,
    });
  }

  dealViewed(dealId: string, dealName: string, properties?: Record<string, any>) {
    this.track("Deal Viewed", {
      deal_id: dealId,
      deal_name: dealName,
      ...properties,
    });
  }

  dealClicked(dealId: string, dealName: string, action: string) {
    this.track("Deal Clicked", {
      deal_id: dealId,
      deal_name: dealName,
      action,
    });
  }

  buttonClicked(buttonName: string, location: string) {
    this.track("Button Clicked", {
      button: buttonName,
      location,
    });
  }

  searchPerformed(query: string, resultsCount: number) {
    this.track("Search Performed", {
      query,
      results_count: resultsCount,
    });
  }

  authEvent(event: "signup" | "login" | "logout") {
    this.track("Auth Event", {
      event,
    });
  }

  reset() {
    if (!this.initialized) return;
    mixpanel.reset();
  }
}

export const analytics = new Analytics();
