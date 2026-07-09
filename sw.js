/**
 * NEP DELIVERY CONTROL - Service Worker
 * PWA com Cache Offline e Push Notifications (FCM)
 */

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyCqwJ64SjXQf_ekZhRZcF4nN_Fqhwvxi_Q",
    authDomain: "ecossistema-nep.firebaseapp.com",
    projectId: "ecossistema-nep",
    storageBucket: "ecossistema-nep.firebasestorage.app",
    messagingSenderId: "1041112586342",
    appId: "1:1041112586342:web:0b7dc02b242cd3dbe635a7"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

const CACHE_NAME = 'nep-cache-v5';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/design-system.css',
    '/css/components.css',
    '/css/kanban.css',
    '/css/nep-help.css',
    '/css/light-mode-fixes.css',
    '/js/app.js',
    '/js/auth.js',
    '/js/kanban.js',
    '/js/dashboard.js',
    '/js/notifications.js',
    '/NEP. IMAGEM.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Orbitron:wght@500;700;900&display=swap'
];

// =========================================
// INSTALL - Cache static assets
// =========================================
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                // Cache assets individually to handle failures gracefully
                return Promise.allSettled(
                    STATIC_ASSETS.map(url =>
                        cache.add(url).catch(err => console.warn(`[SW] Failed to cache: ${url}`, err))
                    )
                );
            })
            .then(() => self.skipWaiting())
    );
});

// =========================================
// ACTIVATE - Clean old caches
// =========================================
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// =========================================
// FETCH - Network first, fallback to cache
// =========================================
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip Firebase and external API requests
    if (event.request.url.includes('firestore.googleapis.com') ||
        event.request.url.includes('firebase') ||
        event.request.url.includes('googleapis.com/identitytoolkit')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clone response to cache
                const responseClone = response.clone();

                caches.open(CACHE_NAME)
                    .then((cache) => {
                        // Only cache successful responses
                        if (response.status === 200) {
                            cache.put(event.request, responseClone);
                        }
                    });

                return response;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(event.request)
                    .then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }

                        // Return offline page for navigation requests
                        if (event.request.mode === 'navigate') {
                            return caches.match('/');
                        }

                        return new Response('Offline', { status: 503 });
                    });
            })
    );
});

// =========================================
// PUSH NOTIFICATIONS
// =========================================
// =========================================
// BACKGROUND MESSAGING (FCM)
// =========================================
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload);

    const notificationTitle = payload.notification?.title || 'NEP Delivery Control';
    const notificationOptions = {
        body: payload.notification?.body || 'Nova notificação',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: payload.data?.notificationId || 'nep-notification',
        data: payload.data || {},
        actions: [
            { action: 'open', title: 'Abrir' },
            { action: 'close', title: 'Fechar' }
        ],
        vibrate: [200, 100, 200],
        requireInteraction: true
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// =========================================
// NOTIFICATION CLICK
// =========================================
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event);

    event.notification.close();

    const action = event.action;
    const data = event.notification.data || {};

    if (action === 'close') {
        return;
    }

    // Determine URL to open
    let urlToOpen = '/';

    if (data.url) {
        urlToOpen = data.url;
    } else if (data.module) {
        urlToOpen = `/?module=${data.module}`;
    } else if (data.referencia_tipo) {
        const moduleMap = {
            'task': 'kanban',
            'forum': 'forum',
            'announcement': 'announcements',
            'okr': 'okr',
            'achievement': 'scoring'
        };
        urlToOpen = `/?module=${moduleMap[data.referencia_tipo] || 'dashboard'}`;
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Focus existing window if open
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.navigate(urlToOpen);
                        return client.focus();
                    }
                }
                // Open new window if not
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// =========================================
// BACKGROUND SYNC (for offline actions)
// =========================================
self.addEventListener('sync', (event) => {
    console.log('[SW] Sync event:', event.tag);

    if (event.tag === 'sync-notifications') {
        event.waitUntil(syncNotifications());
    }
});

async function syncNotifications() {
    // Placeholder for syncing queued notifications when back online
    console.log('[SW] Syncing notifications...');
}

// =========================================
// MESSAGE HANDLER (for app communication)
// =========================================
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);

    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});

console.log('[SW] Service Worker loaded');
