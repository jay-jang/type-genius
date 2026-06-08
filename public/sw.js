// TypeGenius service worker — offline + installable PWA.
// Base-aware (works at site root or under a sub-path like /type-genius/).
// Strategy: network-first for navigations (always try fresh HTML), cache-first
// for hashed build assets (safe — their URLs change on every build).

const VERSION = 'typegenius-v1'
const BASE = new URL('./', self.location).pathname // sw.js sits at the deploy base
const CORE = [BASE, BASE + 'index.html', BASE + 'manifest.webmanifest', BASE + 'favicon.svg']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE).catch(() => {})))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Navigations → network-first, fall back to cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const net = await fetch(req)
          if (net.ok && net.type === 'basic') {
            const cache = await caches.open(VERSION)
            cache.put(BASE + 'index.html', net.clone())
          }
          return net
        } catch {
          return (await caches.match(BASE + 'index.html')) || (await caches.match(BASE)) || Response.error()
        }
      })(),
    )
    return
  }

  // Static assets → cache-first, then network (and cache it for next time).
  event.respondWith(
    (async () => {
      const cached = await caches.match(req)
      if (cached) return cached
      try {
        const net = await fetch(req)
        if (net.ok && net.type === 'basic' && (url.pathname.includes('/assets/') || CORE.includes(url.pathname))) {
          const cache = await caches.open(VERSION)
          cache.put(req, net.clone())
        }
        return net
      } catch {
        return cached || Response.error()
      }
    })(),
  )
})
