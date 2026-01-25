import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PageLayout } from "./PageLayout";

// Mock the hooks
vi.mock("@/hooks/useBottomNavigation", () => ({
  useBottomNavigation: vi.fn(() => ({
    activeTab: "map",
    setActiveTab: vi.fn(),
    handleTabChange: vi.fn(),
  })),
}));

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: vi.fn(() => ({
    notifications: [],
    isLoading: false,
  })),
}));

// Mock Header component
vi.mock("./Header", () => ({
  Header: vi.fn(({ venues, deals, isLoading, cityName }) => (
    <header data-testid="mock-header">
      <span data-testid="header-venues-count">{venues?.length ?? 0}</span>
      <span data-testid="header-deals-count">{deals?.length ?? 0}</span>
      <span data-testid="header-loading">{isLoading ? "loading" : "ready"}</span>
      {cityName && <span data-testid="header-city">{cityName}</span>}
    </header>
  )),
}));

// Mock BottomNav component
vi.mock("./BottomNav", () => ({
  BottomNav: vi.fn(({ activeTab, notificationCount, isLoading, onTabChange }) => (
    <nav data-testid="mock-bottom-nav">
      <span data-testid="nav-active-tab">{activeTab}</span>
      <span data-testid="nav-notification-count">{notificationCount}</span>
      <span data-testid="nav-loading">{isLoading ? "loading" : "ready"}</span>
      <button data-testid="nav-tab-button" onClick={() => onTabChange?.("favorites")}>
        Change Tab
      </button>
    </nav>
  )),
}));

// Helper to create test wrapper with providers
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

// Helper to get elements by test id from container
const getByTestId = (container: HTMLElement, testId: string) =>
  container.querySelector(`[data-testid="${testId}"]`);

const getByRole = (container: HTMLElement, role: string) =>
  container.querySelector(`[role="${role}"]`) ?? container.querySelector(role);

describe("PageLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("should render Header, main content, and BottomNav", () => {
      const { container } = render(
        <PageLayout>
          <div data-testid="test-content">Test Content</div>
        </PageLayout>,
        { wrapper: createWrapper() }
      );

      expect(getByTestId(container, "mock-header")).toBeTruthy();
      expect(getByTestId(container, "test-content")).toBeTruthy();
      expect(getByTestId(container, "mock-bottom-nav")).toBeTruthy();
    });

    it("should render children within main content area", () => {
      const { container } = render(
        <PageLayout>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </PageLayout>,
        { wrapper: createWrapper() }
      );

      expect(getByTestId(container, "child-1")).toBeTruthy();
      expect(getByTestId(container, "child-2")).toBeTruthy();
    });

    it("should render main element with role='main'", () => {
      const { container } = render(
        <PageLayout>
          <div>Content</div>
        </PageLayout>,
        { wrapper: createWrapper() }
      );

      expect(getByRole(container, "main")).toBeTruthy();
    });
  });

  describe("header configuration", () => {
    it("should pass empty arrays to Header by default", () => {
      const { container } = render(
        <PageLayout>
          <div>Content</div>
        </PageLayout>,
        { wrapper: createWrapper() }
      );

      expect(getByTestId(container, "header-venues-count")?.textContent).toBe("0");
      expect(getByTestId(container, "header-deals-count")?.textContent).toBe("0");
    });

    it("should pass venues and deals to Header when provided", () => {
      const mockVenues = [
        { id: "1", name: "Venue 1", latitude: 0, longitude: 0 },
        { id: "2", name: "Venue 2", latitude: 0, longitude: 0 },
      ];
      const mockDeals = [{ id: "1", title: "Deal 1" }];

      const { container } = render(
        <PageLayout
          headerConfig={{
            venues: mockVenues as any,
            deals: mockDeals as any,
          }}
        >
          <div>Content</div>
        </PageLayout>,
        { wrapper: createWrapper() }
      );

      expect(getByTestId(container, "header-venues-count")?.textContent).toBe("2");
      expect(getByTestId(container, "header-deals-count")?.textContent).toBe("1");
    });

    it("should pass isLoading to Header", () => {
      const { container } = render(
        <PageLayout headerConfig={{ isLoading: true }}>
          <div>Content</div>
        </PageLayout>,
        { wrapper: createWrapper() }
      );

      expect(getByTestId(container, "header-loading")?.textContent).toBe("loading");
    });

    it("should pass cityName to Header", () => {
      const { container } = render(
        <PageLayout headerConfig={{ cityName: "Charlotte" }}>
          <div>Content</div>
        </PageLayout>,
        { wrapper: createWrapper() }
      );

      expect(getByTestId(container, "header-city")?.textContent).toBe("Charlotte");
    });
  });

  describe("bottom nav configuration", () => {
    it("should pass activeTab from hook to BottomNav", () => {
      const { container } = render(
        <PageLayout defaultTab="map">
          <div>Content</div>
        </PageLayout>,
        { wrapper: createWrapper() }
      );

      expect(getByTestId(container, "nav-active-tab")?.textContent).toBe("map");
    });

    it("should pass isBottomNavLoading to BottomNav", () => {
      const { container } = render(
        <PageLayout isBottomNavLoading={true}>
          <div>Content</div>
        </PageLayout>,
        { wrapper: createWrapper() }
      );

      expect(getByTestId(container, "nav-loading")?.textContent).toBe("loading");
    });

    it("should use override notificationCount when provided", () => {
      const { container } = render(
        <PageLayout notificationCount={5}>
          <div>Content</div>
        </PageLayout>,
        { wrapper: createWrapper() }
      );

      expect(getByTestId(container, "nav-notification-count")?.textContent).toBe("5");
    });

    it("should default notification count to 0 when no notifications", () => {
      const { container } = render(
        <PageLayout>
          <div>Content</div>
        </PageLayout>,
        { wrapper: createWrapper() }
      );

      expect(getByTestId(container, "nav-notification-count")?.textContent).toBe("0");
    });
  });

  describe("layout modes", () => {
    it("should apply page-container class when fullBleed is false", () => {
      const { container } = render(
        <PageLayout fullBleed={false}>
          <div>Content</div>
        </PageLayout>,
        { wrapper: createWrapper() }
      );

      const main = getByRole(container, "main");
      expect(main?.classList.contains("page-container")).toBe(true);
    });

    it("should not apply page-container class when fullBleed is true", () => {
      const { container } = render(
        <PageLayout fullBleed={true}>
          <div>Content</div>
        </PageLayout>,
        { wrapper: createWrapper() }
      );

      const main = getByRole(container, "main");
      expect(main?.classList.contains("page-container")).toBe(false);
    });

    it("should apply custom mainClassName", () => {
      const { container } = render(
        <PageLayout mainClassName="custom-class">
          <div>Content</div>
        </PageLayout>,
        { wrapper: createWrapper() }
      );

      const main = getByRole(container, "main");
      expect(main?.classList.contains("custom-class")).toBe(true);
    });
  });

  describe("accessibility", () => {
    it("should have main content with role='main'", () => {
      const { container } = render(
        <PageLayout>
          <div>Content</div>
        </PageLayout>,
        { wrapper: createWrapper() }
      );

      expect(getByRole(container, "main")).toBeTruthy();
    });

    it("should render header element", () => {
      const { container } = render(
        <PageLayout>
          <div>Content</div>
        </PageLayout>,
        { wrapper: createWrapper() }
      );

      expect(getByTestId(container, "mock-header")).toBeTruthy();
    });

    it("should render navigation element", () => {
      const { container } = render(
        <PageLayout>
          <div>Content</div>
        </PageLayout>,
        { wrapper: createWrapper() }
      );

      expect(getByTestId(container, "mock-bottom-nav")).toBeTruthy();
    });
  });
});

describe("PageLayout with notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should calculate unread count from notifications when not overridden", async () => {
    // Mock notifications with some unread
    const { useNotifications } = await import("@/hooks/useNotifications");
    vi.mocked(useNotifications).mockReturnValue({
      notifications: [
        { id: "1", read: false },
        { id: "2", read: true },
        { id: "3", read: false },
      ] as any,
      isLoading: false,
    } as any);

    const { container } = render(
      <PageLayout>
        <div>Content</div>
      </PageLayout>,
      { wrapper: createWrapper() }
    );

    // With 2 unread notifications
    expect(getByTestId(container, "nav-notification-count")?.textContent).toBe("2");
  });
});
