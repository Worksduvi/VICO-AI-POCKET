// VICO POCKET OS - Service Worker v15
// PWA-first: cache inmutable para assets, network para APIs externas

const CACHE_NAME = 'vico-pocket-v15';
const ASSETS = ['./', './index.html', './icon.png', './manifest.json', './sw.js'];

// Instalación: pre-cachear todos los assets
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .catch(err => console.warn('VICO SW: cache parcial -', err))
    );
    self.skipWaiting(); // Activar inmediatamente
});

// Activación: limpiar caches anteriores y tomar control
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// Fetch strategy:
// - Assets propios (.html, .png, .json, .js): cache-first → funciona 100% offline
// - Requests a APIs externas (rss proxy, groq, gemini): network-first
self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;

    const url = new URL(e.request.url);
    const isOwnAsset = url.origin === self.location.origin;
    const isApiCall  = url.hostname.includes('groq') ||
                       url.hostname.includes('gemini') ||
                       url.hostname.includes('googleapis') ||
                       url.hostname.includes('allorigins') ||
                       url.hostname.includes('rss2json');

    if (isApiCall) {
        // Network-first para APIs: si falla, no servir caché
        e.respondWith(fetch(e.request).catch(() => new Response('', {status: 503})));
        return;
    }

    if (isOwnAsset) {
        // Cache-first para assets propios: app funciona offline
        e.respondWith(
            caches.match(e.request).then(cached => {
                if (cached) return cached;
                return fetch(e.request).then(response => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
                    }
                    return response;
                }).catch(() => caches.match('./index.html'));
            })
        );
        return;
    }

    // Cualquier otra request: network con fallback silencioso
    e.respondWith(fetch(e.request).catch(() => new Response('', {status: 503})));
});

// ============================================================
// NOTIFICATIONCLICK — Clave para pantalla de bloqueo Android
// ============================================================
self.addEventListener('notificationclick', e => {
    e.notification.close();

    const targetUrl = e.notification.data?.url || self.location.origin + '/';

    if (e.action === 'dismiss') return;

    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
            for (const client of cs) {
                if ('focus' in client) {
                    client.focus();
                    client.postMessage({ action: 'open-agenda' });
                    return;
                }
            }
            if (clients.openWindow) return clients.openWindow(targetUrl);
        })
    );
});

// Notificación push
self.addEventListener('push', e => {
    if (!e.data) return;
    try {
        const payload = e.data.json();
        e.waitUntil(
            self.registration.showNotification(payload.title || 'VICO POCKET OS', {
                body:               payload.body || 'Nueva notificación',
                icon:               './icon.png',
                badge:              './icon.png',
                requireInteraction: true,
                vibrate:            [400, 100, 400, 100, 800],
                data:               { url: self.location.origin + '/' }
            })
        );
    } catch(err) {
        const text = e.data.text();
        e.waitUntil(
            self.registration.showNotification('VICO AGENDA', {
                body: text, icon: './icon.png', requireInteraction: true
            })
        );
    }
});

// Mensaje desde la app para forzar update
self.addEventListener('message', e => {
    if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
