export const MOTION_STORAGE_KEY = "pinpong-motion";
export function animationsEnabled(value: string | null, reduced: boolean) {
  return value !== "off" && !reduced;
}
export function isPageNavigation(href: string, current: string) {
  const next = new URL(href, current);
  const previous = new URL(current);
  return next.origin === previous.origin && (next.pathname !== previous.pathname || next.search !== previous.search);
}
/** Delays only the indicator, never the navigation. A watchdog clears abandoned requests. */
export function createNavigationTimer(show: (visible: boolean) => void) {
  let delay: ReturnType<typeof setTimeout> | undefined;
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  const stop = () => { if (delay !== undefined) clearTimeout(delay); if (watchdog !== undefined) clearTimeout(watchdog); delay = undefined; watchdog = undefined; show(false); };
  return {
    start() { stop(); delay = setTimeout(() => { delay = undefined; show(true); }, 150); watchdog = setTimeout(() => { watchdog = undefined; stop(); }, 10000); },
    stop,
  };
}
