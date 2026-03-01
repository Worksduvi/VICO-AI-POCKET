// VICO POCKET OS - Service Worker v14
// Este archivo es CRÍTICO para que las notificaciones aparezcan en la pantalla de bloqueo de Android

const CACHE_NAME = 'vico-pocket-v14';
const ASSETS = ['./', './index.html', './icon.png', './manifest.json'];

// Instalación: cachear assets principales
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).catch(() => {})
    );
    self.skipWaiting();
});

// Activación: limpiar caches viejos
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch: network-first con fallback a caché
self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});

// ============================================================
// NOTIFICATIONCLICK — Clave para pantalla de bloqueo Android
// Sin este handler, las notificaciones no abren la app al tocarlas
// ============================================================
self.addEventListener('notificationclick', e => {
    e.notification.close(); // Cerrar la notificación del panel

    const targetUrl = e.notification.data?.url || self.location.origin + '/';

    if (e.action === 'dismiss') {
        // Solo cerrar, no abrir la app
        return;
    }

    // Acción 'open' o tap directo en la notificación → abrir/enfocar la app
    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
            // Si la app ya está abierta en alguna pestaña → enfocarla
            for (const client of cs) {
                if ('focus' in client) {
                    client.focus();
                    // Enviar mensaje para que el JS de la app navegue a la agenda
                    client.postMessage({ action: 'open-agenda' });
                    return;
                }
            }
            // Si no está abierta → abrirla
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// Notificación push (para uso futuro con servidor push)
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
        // Fallback si no viene JSON
        const text = e.data.text();
        e.waitUntil(
            self.registration.showNotification('VICO AGENDA', {
                body: text, icon: './icon.png', requireInteraction: true
            })
        );
    }
});
