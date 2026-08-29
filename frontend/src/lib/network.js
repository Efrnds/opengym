/** Whether the browser reports a network connection (best-effort — may lie on captive portals). */
export function isOnline() {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

/** Subscribe to online/offline transitions. Returns an unsubscribe function. */
export function watchNetwork(onChange) {
  if (typeof window === 'undefined') return () => {}
  const fn = () => onChange(isOnline())
  window.addEventListener('online', fn)
  window.addEventListener('offline', fn)
  return () => {
    window.removeEventListener('online', fn)
    window.removeEventListener('offline', fn)
  }
}
