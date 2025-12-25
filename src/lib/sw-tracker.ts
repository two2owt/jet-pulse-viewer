import { supabase } from "@/integrations/supabase/client";

interface SWEvent {
  event_type: string;
  sw_state?: string;
  error_message?: string;
  sw_version?: string;
  user_agent: string;
  timestamp: string;
}

/**
 * Tracks service worker lifecycle events to identify users stuck on old versions
 */
class ServiceWorkerTracker {
  private swVersion: string | null = null;

  /**
   * Get current SW controlling state
   */
  private getSWState(): string {
    if (!('serviceWorker' in navigator)) return 'not_supported';
    if (!navigator.serviceWorker.controller) return 'no_controller';
    return navigator.serviceWorker.controller.state || 'unknown';
  }

  /**
   * Log SW event to analytics
   */
  private async logEvent(eventType: string, errorMessage?: string) {
    const event: SWEvent = {
      event_type: eventType,
      sw_state: this.getSWState(),
      error_message: errorMessage,
      sw_version: this.swVersion || undefined,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };

    try {
      const client = supabase as unknown as { 
        from: (table: string) => { 
          insert: (data: unknown) => Promise<{ error: { message: string } | null }> 
        } 
      };
      
      await client.from('analytics_events').insert({
        event_name: 'sw_lifecycle',
        event_data: event,
        page_path: window.location.pathname,
        session_id: sessionStorage.getItem('analytics_session_id'),
      });
    } catch (e) {
      // Silently fail - never break the app for tracking
      if (import.meta.env.DEV) {
        console.warn('[SW Tracker] Failed to log event:', e);
      }
    }
  }

  /**
   * Register service worker with full lifecycle tracking
   */
  async registerWithTracking(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      await this.logEvent('not_supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      
      // Track initial registration
      await this.logEvent('registered');

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        this.logEvent('update_found');

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New version installed, waiting to activate
              this.logEvent('update_installed_waiting');
            } else {
              // First install
              this.logEvent('first_install');
            }
          } else if (newWorker.state === 'activated') {
            this.logEvent('update_activated');
          } else if (newWorker.state === 'redundant') {
            // Worker was replaced or install failed
            this.logEvent('worker_redundant');
          }
        });

        // Track install errors
        newWorker.addEventListener('error', (e) => {
          this.logEvent('install_error', e.message || 'Unknown install error');
        });
      });

      // Track controller changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        this.logEvent('controller_changed');
      });

      // Listen for SW messages (can include version info)
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SW_VERSION') {
          this.swVersion = event.data.version;
          this.logEvent('version_reported');
        }
      });

      // Check for stuck states periodically (every 5 minutes after first check)
      setTimeout(() => this.checkForStuckState(registration), 30000); // First check after 30s
      setInterval(() => this.checkForStuckState(registration), 5 * 60 * 1000);

      return registration;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown registration error';
      await this.logEvent('registration_failed', errorMessage);
      return null;
    }
  }

  /**
   * Detect if user might be stuck on old SW version
   */
  private async checkForStuckState(registration: ServiceWorkerRegistration) {
    try {
      // Check for waiting worker (update available but not activated)
      if (registration.waiting) {
        this.logEvent('update_stuck_waiting');
      }

      // Check for update
      await registration.update();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown update check error';
      this.logEvent('update_check_failed', errorMessage);
    }
  }

  /**
   * Force skip waiting (call from UI "update" button)
   */
  async forceUpdate(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        this.logEvent('force_update_triggered');
        return true;
      }
      
      this.logEvent('force_update_no_waiting');
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown force update error';
      this.logEvent('force_update_failed', errorMessage);
      return false;
    }
  }
}

export const swTracker = new ServiceWorkerTracker();
