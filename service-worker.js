// Flow English Service Worker
// Version: 2.0.0
// Cache Name: flow-english-v2

const CACHE_NAME = 'flow-english-v2';
const STATIC_CACHE = 'flow-english-static-v2';
const DYNAMIC_CACHE = 'flow-english-dynamic-v2';
const API_CACHE = 'flow-english-api-v2';

// Files to cache immediately (critical resources)
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
  '/sw-register.js',
  '/manifest.json',
  '/offline.html',
  'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/9.0.0/firebase-storage.js'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/',
  '/api/users',
  '/api/classes',
  '/api/payments',
  '/api/requests'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...', CACHE_NAME);
  
  event.waitUntil(
    Promise.all([
      // Cache static files
      caches.open(STATIC_CACHE)
        .then((cache) => {
          console.log('Service Worker: Caching static files');
          return cache.addAll(STATIC_FILES);
        })
        .catch((error) => {
          console.error('Service Worker: Error caching static files:', error);
          // Continue installation even if some files fail to cache
        }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...', CACHE_NAME);
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches that don't match current version
            if (!cacheName.includes('v2')) {
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
  
  // Handle Firebase requests (don't cache for security)
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('googleapis') || 
      url.hostname.includes('gstatic.com')) {
    return;
  }
  
  // Handle different types of requests
  if (request.destination === 'document') {
    event.respondWith(handlePageRequest(request));
  } else if (request.destination === 'script' || 
             request.destination === 'style' || 
             request.destination === 'image') {
    event.respondWith(handleStaticAssetRequest(request));
  } else if (isApiRequest(url)) {
    event.respondWith(handleApiRequest(request));
  } else {
    event.respondWith(handleDefaultRequest(request));
  }
});

// Check if request is an API request
function isApiRequest(url) {
  return url.pathname.includes('/api/') || 
         url.pathname.includes('/users') ||
         url.pathname.includes('/classes') ||
         url.pathname.includes('/payments') ||
         url.pathname.includes('/requests');
}

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
      const cache = await caches.open(API_CACHE);
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
  } else if (event.tag === 'payment-sync') {
    event.waitUntil(syncPaymentData());
  } else if (event.tag === 'class-sync') {
    event.waitUntil(syncClassData());
  }
});

// Handle background sync
async function doBackgroundSync() {
  try {
    console.log('Service Worker: Performing background sync...');
    
    // Sync any pending data when connection is restored
    await syncPaymentData();
    await syncClassData();
    
    // Notify clients that sync is complete
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        timestamp: new Date().toISOString()
      });
    });
    
  } catch (error) {
    console.error('Service Worker: Background sync failed:', error);
  }
}

// Sync payment data
async function syncPaymentData() {
  try {
    // Get any offline payment data from IndexedDB
    const offlinePayments = await getOfflinePayments();
    
    for (const payment of offlinePayments) {
      try {
        // Attempt to sync with server
        await syncPaymentToServer(payment);
        // Remove from offline storage if successful
        await removeOfflinePayment(payment.id);
      } catch (error) {
        console.error('Service Worker: Failed to sync payment:', payment.id, error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Payment sync failed:', error);
  }
}

// Sync class data
async function syncClassData() {
  try {
    // Get any offline class data from IndexedDB
    const offlineClasses = await getOfflineClasses();
    
    for (const classData of offlineClasses) {
      try {
        // Attempt to sync with server
        await syncClassToServer(classData);
        // Remove from offline storage if successful
        await removeOfflineClass(classData.id);
      } catch (error) {
        console.error('Service Worker: Failed to sync class:', classData.id, error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Class sync failed:', error);
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  let notificationData = {
    title: 'Flow English',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Dashboard',
        icon: '/icons/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/icon-192x192.png'
      }
    ]
  };
  
  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (error) {
      notificationData.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event.action);
  
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
  
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_URLS':
      cacheUrls(data.urls);
      break;
      
    case 'CLEAR_CACHE':
      clearCache(data.cacheName);
      break;
      
    case 'GET_CACHE_INFO':
      getCacheInfo().then(info => {
        event.ports[0].postMessage(info);
      });
      break;
      
    case 'STORE_OFFLINE_DATA':
      storeOfflineData(data.type, data.payload);
      break;
      
    case 'GET_OFFLINE_DATA':
      getOfflineData(data.type).then(result => {
        event.ports[0].postMessage(result);
      });
      break;
      
    default:
      console.log('Service Worker: Unknown message type:', type);
  }
});

// Cache additional URLs
async function cacheUrls(urls) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    await cache.addAll(urls);
    console.log('Service Worker: URLs cached successfully:', urls);
  } catch (error) {
    console.error('Service Worker: Error caching URLs:', error);
  }
}

// Clear specific cache
async function clearCache(cacheName) {
  try {
    await caches.delete(cacheName);
    console.log('Service Worker: Cache cleared:', cacheName);
  } catch (error) {
    console.error('Service Worker: Error clearing cache:', error);
  }
}

// Get cache information
async function getCacheInfo() {
  try {
    const cacheNames = await caches.keys();
    const cacheInfo = {};
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      cacheInfo[cacheName] = {
        size: keys.length,
        urls: keys.map(request => request.url)
      };
    }
    
    return cacheInfo;
  } catch (error) {
    console.error('Service Worker: Error getting cache info:', error);
    return {};
  }
}

// Store offline data in IndexedDB
async function storeOfflineData(type, payload) {
  try {
    const db = await openIndexedDB();
    const transaction = db.transaction(['offlineData'], 'readwrite');
    const store = transaction.objectStore('offlineData');
    
    await store.put({
      id: `${type}_${Date.now()}`,
      type: type,
      payload: payload,
      timestamp: new Date().toISOString()
    });
    
    console.log('Service Worker: Offline data stored:', type);
  } catch (error) {
    console.error('Service Worker: Error storing offline data:', error);
  }
}

// Get offline data from IndexedDB
async function getOfflineData(type) {
  try {
    const db = await openIndexedDB();
    const transaction = db.transaction(['offlineData'], 'readonly');
    const store = transaction.objectStore('offlineData');
    const index = store.index('type');
    
    const data = await index.getAll(type);
    return data;
  } catch (error) {
    console.error('Service Worker: Error getting offline data:', error);
    return [];
  }
}

// Helper functions for IndexedDB operations
async function getOfflinePayments() {
  return getOfflineData('payment');
}

async function getOfflineClasses() {
  return getOfflineData('class');
}

async function removeOfflinePayment(id) {
  try {
    const db = await openIndexedDB();
    const transaction = db.transaction(['offlineData'], 'readwrite');
    const store = transaction.objectStore('offlineData');
    await store.delete(id);
  } catch (error) {
    console.error('Service Worker: Error removing offline payment:', error);
  }
}

async function removeOfflineClass(id) {
  try {
    const db = await openIndexedDB();
    const transaction = db.transaction(['offlineData'], 'readwrite');
    const store = transaction.objectStore('offlineData');
    await store.delete(id);
  } catch (error) {
    console.error('Service Worker: Error removing offline class:', error);
  }
}

// Open IndexedDB
async function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FlowEnglishDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object store for offline data
      if (!db.objectStoreNames.contains('offlineData')) {
        const store = db.createObjectStore('offlineData', { keyPath: 'id' });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Mock functions for server sync (replace with actual implementation)
async function syncPaymentToServer(payment) {
  // Implement actual payment sync logic
  console.log('Service Worker: Syncing payment to server:', payment);
  return Promise.resolve();
}

async function syncClassToServer(classData) {
  // Implement actual class sync logic
  console.log('Service Worker: Syncing class to server:', classData);
  return Promise.resolve();
}

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
  getCacheSize,
  getCacheInfo
};

console.log('Service Worker: Loaded successfully');
