// Flow English Service Worker
// Version: 1.0.0
// Cache Name: flow-english-v1

const CACHE_NAME = 'flow-english-v1';
const STATIC_CACHE = 'flow-english-static-v1';
const DYNAMIC_CACHE = 'flow-english-dynamic-v1';

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/login.html',
  '/admin.html',
  '/student.html',
  '/teacher.html',
  '/firebase-config.js',
  '/script.js',
  '/style.css',
  'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/9.0.0/firebase-storage.js'
];

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

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle Firebase requests (don't cache)
  if (url.hostname.includes('firebase') || url.hostname.includes('googleapis')) {
    return;
  }
  
  // Handle HTML pages
  if (request.destination === 'document') {
    event.respondWith(handlePageRequest(request));
    return;
  }
  
  // Handle static assets
  if (request.destination === 'script' || 
      request.destination === 'style' || 
      request.destination === 'image') {
    event.respondWith(handleStaticAssetRequest(request));
    return;
  }
  
  // Handle API requests
  if (url.pathname.includes('/api/') || url.hostname.includes('firestore')) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // Default strategy for other requests
  event.respondWith(handleDefaultRequest(request));
});

// Handle page requests (HTML files)
async function handlePageRequest(request) {
  try {
    // Try network first, fallback to cache
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the fresh response
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('Service Worker: Network failed for page, trying cache:', request.url);
  }
  
  // Fallback to cache
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // If not in cache, return offline page
  return caches.match('/offline.html');
}

// Handle static asset requests
async function handleStaticAssetRequest(request) {
  // Check cache first, then network
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const cache = caches.open(DYNAMIC_CACHE);
          cache.then((cache) => cache.put(request, response));
        }
      })
      .catch(() => {
        // Ignore fetch errors for background updates
      });
    
    return cachedResponse;
  }
  
  // If not in cache, try network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the response
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('Service Worker: Failed to fetch static asset:', request.url);
  }
  
  // Return a default response for images
  if (request.destination === 'image') {
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f0f0f0"/><text x="100" y="100" text-anchor="middle" fill="#666">Image not available</text></svg>',
      {
        headers: { 'Content-Type': 'image/svg+xml' }
      }
    );
  }
  
  return new Response('Asset not available', { status: 404 });
}

// Handle API requests
async function handleApiRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful API responses for a short time
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('Service Worker: API request failed, trying cache:', request.url);
  }
  
  // Fallback to cache for API requests
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Return error response
  return new Response('API not available', { status: 503 });
}

// Handle default requests
async function handleDefaultRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the response
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache:', request.url);
  }
  
  // Fallback to cache
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Return error response
  return new Response('Resource not available', { status: 404 });
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Handle background sync
async function doBackgroundSync() {
  try {
    // Sync any pending data when connection is restored
    console.log('Service Worker: Performing background sync...');
    
    // You can add specific sync logic here
    // For example, sync offline form submissions, etc.
    
  } catch (error) {
    console.error('Service Worker: Background sync failed:', error);
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from Flow English',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Dashboard',
        icon: '/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-192x192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Flow English', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    // Open the dashboard
    event.waitUntil(
      clients.openWindow('/student.html')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    event.notification.close();
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle message events from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE)
        .then((cache) => {
          return cache.addAll(event.data.urls);
        })
    );
  }
});

// Utility function to clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames.map((cacheName) => caches.delete(cacheName))
  );
}

// Utility function to get cache size
async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }
  
  return totalSize;
}

// Export utility functions for use in main thread
self.flowEnglishUtils = {
  clearAllCaches,
  getCacheSize
}; 