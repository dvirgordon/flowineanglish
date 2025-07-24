// Flow English Teaching Platform - Service Worker
const CACHE_NAME = 'flow-app-v1.0.0';
const STATIC_CACHE = 'flow-static-v1.0.0';
const DYNAMIC_CACHE = 'flow-dynamic-v1.0.0';

// Files to cache immediately
const STATIC_FILES = [
    '/',
    '/index.html',
    '/login.html',
    '/dashboard.html',
    '/adduser.html',
    '/account.html',
    '/style.css',
    '/app.js',
    '/login.js',
    '/dashboard.js',
    '/adduser.js',
    '/account.js',
    '/firebace.js',
    '/flow-logo.jpeg',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-solid-900.woff2',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-solid-900.ttf'
];

// Firebase configuration for background sync
const FIREBASE_CONFIG = {
    // This will be populated from the main app
};

// Install event - cache static files
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('Service Worker: Caching static files');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('Service Worker: Static files cached successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Service Worker: Error caching static files:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Activated successfully');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip Firebase requests (they need to go to network)
    if (url.hostname.includes('firebase') || url.hostname.includes('googleapis')) {
        return;
    }

    // Handle different types of requests
    if (request.method === 'GET') {
        event.respondWith(
            caches.match(request)
                .then((response) => {
                    // Return cached version if available
                    if (response) {
                        console.log('Service Worker: Serving from cache:', request.url);
                        return response;
                    }

                    // Otherwise, fetch from network
                    return fetch(request)
                        .then((networkResponse) => {
                            // Cache successful responses for future use
                            if (networkResponse && networkResponse.status === 200) {
                                const responseClone = networkResponse.clone();
                                caches.open(DYNAMIC_CACHE)
                                    .then((cache) => {
                                        cache.put(request, responseClone);
                                    });
                            }
                            return networkResponse;
                        })
                        .catch(() => {
                            // If network fails, try to serve a fallback
                            if (request.destination === 'document') {
                                return caches.match('/login.html');
                            }
                            return new Response('Offline - Please check your connection', {
                                status: 503,
                                statusText: 'Service Unavailable'
                            });
                        });
                })
        );
    }
});

// Background sync for offline data
self.addEventListener('sync', (event) => {
    console.log('Service Worker: Background sync triggered:', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(syncOfflineData());
    }
});

// Push notification event
self.addEventListener('push', (event) => {
    console.log('Service Worker: Push notification received');
    
    const options = {
        body: event.data ? event.data.text() : 'New notification from Flow',
        icon: '/flow-logo.jpeg',
        badge: '/flow-logo.jpeg',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'View Classes',
                icon: '/flow-logo.jpeg'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/flow-logo.jpeg'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('Flow English Teaching', options)
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker: Notification clicked');
    
    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/dashboard.html')
        );
    } else if (event.action === 'close') {
        // Just close the notification
        return;
    } else {
        // Default action - open the app
        event.waitUntil(
            clients.openWindow('/dashboard.html')
        );
    }
});

// Message event for communication with main app
self.addEventListener('message', (event) => {
    console.log('Service Worker: Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
    
    if (event.data && event.data.type === 'CACHE_DATA') {
        cacheAppData(event.data.data);
    }
});

// Function to sync offline data when connection is restored
async function syncOfflineData() {
    try {
        console.log('Service Worker: Syncing offline data...');
        
        // Get offline data from IndexedDB
        const offlineData = await getOfflineData();
        
        if (offlineData && offlineData.length > 0) {
            // Sync each piece of offline data
            for (const data of offlineData) {
                await syncDataToCloud(data);
            }
            
            // Clear offline data after successful sync
            await clearOfflineData();
            
            console.log('Service Worker: Offline data synced successfully');
        }
    } catch (error) {
        console.error('Service Worker: Error syncing offline data:', error);
    }
}

// Function to cache app data for offline use
async function cacheAppData(data) {
    try {
        const db = await openIndexedDB();
        const transaction = db.transaction(['offlineData'], 'readwrite');
        const store = transaction.objectStore('offlineData');
        
        await store.add({
            id: Date.now(),
            data: data,
            timestamp: new Date().toISOString()
        });
        
        console.log('Service Worker: Data cached for offline use');
    } catch (error) {
        console.error('Service Worker: Error caching data:', error);
    }
}

// Function to get offline data from IndexedDB
async function getOfflineData() {
    try {
        const db = await openIndexedDB();
        const transaction = db.transaction(['offlineData'], 'readonly');
        const store = transaction.objectStore('offlineData');
        
        return await store.getAll();
    } catch (error) {
        console.error('Service Worker: Error getting offline data:', error);
        return [];
    }
}

// Function to clear offline data
async function clearOfflineData() {
    try {
        const db = await openIndexedDB();
        const transaction = db.transaction(['offlineData'], 'readwrite');
        const store = transaction.objectStore('offlineData');
        
        await store.clear();
        console.log('Service Worker: Offline data cleared');
    } catch (error) {
        console.error('Service Worker: Error clearing offline data:', error);
    }
}

// Function to sync data to cloud
async function syncDataToCloud(data) {
    try {
        // This would integrate with your Firebase configuration
        // For now, we'll just log the sync attempt
        console.log('Service Worker: Syncing data to cloud:', data);
        
        // In a real implementation, you would:
        // 1. Use the Firebase SDK to sync data
        // 2. Handle authentication
        // 3. Update the cloud database
        
        return true;
    } catch (error) {
        console.error('Service Worker: Error syncing to cloud:', error);
        return false;
    }
}

// Function to open IndexedDB
function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('FlowOfflineDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Create object store for offline data
            if (!db.objectStoreNames.contains('offlineData')) {
                const store = db.createObjectStore('offlineData', { keyPath: 'id' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
}

// Periodic background sync for data updates
self.addEventListener('periodicsync', (event) => {
    console.log('Service Worker: Periodic sync triggered');
    
    if (event.tag === 'periodic-data-sync') {
        event.waitUntil(syncOfflineData());
    }
});

console.log('Service Worker: Loaded successfully');
