const CACHE_NAME = 'traingun-v1';
const ASSETS_TO_CACHE = [
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/engine.js',
    './js/ui.js',
    './js/stats.js',
    './js/storage.js',
    './js/sensitivity.js',
    './js/weapon.js',
    './js/audio.js',
    './js/keybinds.js',
    './js/routine.js',
    './js/modes/tracking.js',
    './js/modes/flicking.js',
    './js/modes/switching.js',
    './js/modes/reflex.js',
    './js/modes/sixtarget.js',
    './js/modes/humanoid.js',
    './images/icon.svg',
    './manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching all assets');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then(
                    (response) => {
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        return response;
                    }
                );
            })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
