const CACHE_NAME = 'vico-pwa-v8.7'; // Cambia este número para forzar actualización
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  'https://unpkg.com/lucide@latest',
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Inter:wght@300;400;600&display=swap'
];

// Instalación y almacenamiento en caché
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('VICO SW: Archivos en caché');
      return cache.addAll(ASSETS);
    })
  );
});

// Activación y limpieza de versiones antiguas
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

// Estrategia de Red primero, luego Caché (Para asegurar actualización)
self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
