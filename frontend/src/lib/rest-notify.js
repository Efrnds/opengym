// Rest-timer alerts for the PWA: service-worker scheduling, push fallback, permission prompts.
import { api } from './api.js'
import { ensurePushSubscribed } from './push.js'
import { t } from './i18n.js'
import { MOBILE } from './mobile.js'

export const REST_NOTIF_TAG = 'rest-timer'
export const REST_NOTIF_ID = 9001

export const restNotifTitle = () => 'openGym'
export const restNotifBody = () => t('Rest over — next set!')

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window

const notifOpts = (title, body) => ({
  body: body || title,
  tag: REST_NOTIF_TAG,
  renotify: true,
  silent: false,
  requireInteraction: true,
  vibrate: [300, 120, 300, 120, 400],
  icon: 'icon-512.png',
  badge: 'icon-180.png',
})

let permP = null

export const requestRestNotificationPermission = async () => {
  if (!notificationsSupported()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  if (!permP) {
    permP = Notification.requestPermission()
      .then(p => p === 'granted')
      .catch(() => false)
      .finally(() => { permP = null })
  }
  return permP
}

const swPost = msg => {
  if (MOBILE || !('serviceWorker' in navigator)) return
  const post = () => {
    const target = navigator.serviceWorker.controller
      || navigator.serviceWorker.ready.then(r => r.active).catch(() => null)
    Promise.resolve(target).then(t => t?.postMessage?.(msg)).catch(() => {})
  }
  if (navigator.serviceWorker.controller) post()
  else navigator.serviceWorker.ready.then(post).catch(() => {})
}

/** Best-effort local notification from the service worker (works for guests, no server). */
export const scheduleSwRestNotification = sec => {
  if (MOBILE || !(sec > 0)) return
  const title = restNotifTitle()
  const body = restNotifBody()
  swPost({ type: 'schedule-rest', at: Date.now() + sec * 1000, title, body })
}

export const cancelSwRestNotification = () => {
  if (MOBILE) return
  swPost({ type: 'cancel-rest' })
}

const scheduleMobileRestNotif = async sec => {
  if (!MOBILE || !(sec > 0)) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.cancel({ notifications: [{ id: REST_NOTIF_ID }] }).catch(() => {})
    let perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions()
    if (perm.display !== 'granted') return
    const title = restNotifTitle()
    const body = restNotifBody()
    await LocalNotifications.schedule({
      notifications: [{
        id: REST_NOTIF_ID,
        title,
        body,
        schedule: { at: new Date(Date.now() + sec * 1000), allowWhileIdle: true },
        sound: 'default',
      }],
    })
  } catch { /* */ }
}

const cancelMobileRestNotif = async () => {
  if (!MOBILE) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.cancel({ notifications: [{ id: REST_NOTIF_ID }] }).catch(() => {})
  } catch { /* */ }
}

export const showRestNotification = async () => {
  if (MOBILE) return
  if (!notificationsSupported()) return
  if (Notification.permission !== 'granted' && !(await requestRestNotificationPermission())) return
  const title = restNotifTitle()
  const body = restNotifBody()
  const opts = notifOpts(title, body)
  try {
    const reg = await navigator.serviceWorker?.getRegistration?.()
    if (reg?.showNotification) {
      await reg.showNotification(title, opts)
      return
    }
    new Notification(title, opts)
  } catch { /* */ }
}

const pushRestTimer = async sec => {
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') return
  const { useStore } = await import('../store/useStore.js')
  if (!useStore.getState().user) return
  try {
    const reg = await navigator.serviceWorker?.ready
    const sub = await reg?.pushManager?.getSubscription?.()
    if (!sub) return
    api('/api/push/rest-timer', { method: 'POST', body: JSON.stringify({ seconds: sec }) }).catch(() => {})
  } catch { /* */ }
}

const cancelPushRestTimer = async () => {
  const { useStore } = await import('../store/useStore.js')
  if (useStore.getState().user) {
    api('/api/push/rest-timer/cancel', { method: 'POST', body: '{}' }).catch(() => {})
  }
}

export const syncRestPush = sec => {
  pushRestTimer(sec)
  scheduleSwRestNotification(sec)
  scheduleMobileRestNotif(sec)
}

export const cancelRestPush = () => {
  cancelPushRestTimer()
  cancelSwRestNotification()
  cancelMobileRestNotif()
}

/** Ask for notification permission before a long rest; subscribe to push when signed in. */
export const ensureRestAlertPermission = async () => {
  if (MOBILE) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      let perm = await LocalNotifications.checkPermissions()
      if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions()
    } catch { /* */ }
    return
  }
  await requestRestNotificationPermission()
  const { useStore } = await import('../store/useStore.js')
  if (useStore.getState().user && Notification.permission === 'granted') {
    ensurePushSubscribed().catch(() => {})
  }
}
