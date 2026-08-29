/* openGym service worker
   - Install: precache the built app shell (precache.json from Vite build)
   - Media: cache-first (same-origin img/gif + exercise CDN)
   - App assets: network-first, offline fallback to cache / index.html
   - /api/*: never cached — localStorage holds state offline */
const SHELL = 'opengym-shell-v2'
const MEDIA = 'opengym-media-v2'
const CDN = 'cdn.jsdelivr.net'

self.addEventListener('install', e => {
  e.waitUntil(
    fetch('./precache.json', { cache: 'no-cache' })
      .then(r => (r.ok ? r.json() : []))
      .catch(() => [])
      .then(urls => caches.open(SHELL).then(async c => {
        await Promise.allSettled((urls || []).filter(Boolean).map(u => c.add(u)))
      }))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== SHELL && k !== MEDIA).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {}
  e.waitUntil(self.registration.showNotification(data.title || 'openGym', restNotifOpts(data.title, data.body, data.tag)))
})

let restAlarm = null

function restNotifOpts(title, body, tag) {
  return {
    body: body || title || '',
    icon: 'icon-512.png',
    badge: 'icon-180.png',
    tag: tag || 'rest-timer',
    renotify: true,
    silent: false,
    requireInteraction: true,
    vibrate: [300, 120, 300, 120, 400],
  }
}

self.addEventListener('message', e => {
  const d = e.data
  if (!d || typeof d !== 'object') return
  if (d.type === 'schedule-rest') {
    clearTimeout(restAlarm)
    restAlarm = null
    const delay = Math.max(0, d.at - Date.now())
    if (delay <= 0 || delay > 3600000) return
    restAlarm = setTimeout(() => {
      restAlarm = null
      self.registration.showNotification(d.title || 'openGym', restNotifOpts(d.title, d.body, d.tag))
    }, delay)
  }
  if (d.type === 'cancel-rest') {
    clearTimeout(restAlarm)
    restAlarm = null
  }
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(clients => {
    const c = clients.find(c => 'focus' in c)
    return c ? c.focus() : self.clients.openWindow('./')
  }))
})

function isMedia(url) {
  if (url.pathname.includes('/img/') || url.pathname.includes('/gif/')) return true
  return url.hostname === CDN && url.pathname.includes('/exercises-dataset/')
}

async function cacheFirst(req, name) {
  const c = await caches.open(name)
  const hit = await c.match(req)
  if (hit) return hit
  try {
    const res = await fetch(req)
    if (res.ok) c.put(req, res.clone())
    return res
  } catch (e) {
    return hit || Response.error()
  }
}

async function networkFirstShell(req) {
  try {
    const res = await fetch(req)
    if (res.ok) {
      const c = await caches.open(SHELL)
      c.put(req, res.clone())
    }
    return res
  } catch {
    const hit = await caches.match(req)
    if (hit) return hit
    const nav = req.mode === 'navigate'
      || (req.headers.get('accept') || '').includes('text/html')
    if (nav) {
      return (await caches.match('./index.html'))
        || (await caches.match('index.html'))
        || Response.error()
    }
    return Response.error()
  }
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  const url = new URL(e.request.url)
  if (url.pathname.startsWith('/api/')) return

  if (isMedia(url)) {
    e.respondWith(cacheFirst(e.request, MEDIA))
    return
  }
  if (url.origin !== location.origin) return

  e.respondWith(networkFirstShell(e.request))
})
