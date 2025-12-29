export function ServiceWorkerUpdater() {
  // Intentionally no-op.
  // Auto-reloading on service worker updates can cause reload loops in production.
  // Updates will apply on the next user-initiated reload / next visit.
  return null;
}
