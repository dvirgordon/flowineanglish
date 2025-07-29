// Service Worker Registration Script
// This script handles service worker registration and updates

class ServiceWorkerManager {
    constructor() {
        this.swRegistration = null;
        this.updateAvailable = false;
        this.init();
    }

    async init() {
        if ('serviceWorker' in navigator) {
            try {
                await this.registerServiceWorker();
                this.setupEventListeners();
                this.checkForUpdates();
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        } else {
            console.log('Service Worker not supported in this browser');
        }
    }

    async registerServiceWorker() {
        try {
            this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });

            console.log('Service Worker registered successfully:', this.swRegistration);

            // Check if there's an update available
            this.swRegistration.addEventListener('updatefound', () => {
                console.log('Service Worker update found');
                this.handleUpdateFound();
            });

        } catch (error) {
            console.error('Service Worker registration failed:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Listen for service worker state changes
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('Service Worker controller changed');
            this.showUpdateNotification('App updated! Please refresh to get the latest version.');
        });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
            console.log('Message from Service Worker:', event.data);
            this.handleServiceWorkerMessage(event.data);
        });

        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.handleOnline();
        });

        window.addEventListener('offline', () => {
            this.handleOffline();
        });
    }

    handleUpdateFound() {
        const newWorker = this.swRegistration.installing;
        
        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                    // New service worker is installed and ready
                    this.updateAvailable = true;
                    this.showUpdateNotification('New version available! Click to update.');
                }
            }
        });
    }

    handleServiceWorkerMessage(data) {
        switch (data.type) {
            case 'CACHE_UPDATED':
                console.log('Cache updated:', data.cacheName);
                break;
            case 'OFFLINE_MODE':
                this.handleOffline();
                break;
            case 'ONLINE_MODE':
                this.handleOnline();
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    }

    handleOnline() {
        console.log('App is online');
        this.hideOfflineIndicator();
        
        // Sync any pending data
        if (this.swRegistration && this.swRegistration.sync) {
            this.swRegistration.sync.register('background-sync')
                .then(() => {
                    console.log('Background sync registered');
                })
                .catch((error) => {
                    console.error('Background sync registration failed:', error);
                });
        }
    }

    handleOffline() {
        console.log('App is offline');
        this.showOfflineIndicator();
    }

    showOfflineIndicator() {
        // Create or update offline indicator
        let indicator = document.getElementById('offline-indicator');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'offline-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: #dc3545;
                color: white;
                text-align: center;
                padding: 10px;
                z-index: 9999;
                font-size: 14px;
                font-weight: 500;
            `;
            document.body.appendChild(indicator);
        }
        
        indicator.textContent = '📶 You are currently offline. Some features may be limited.';
        indicator.style.display = 'block';
    }

    hideOfflineIndicator() {
        const indicator = document.getElementById('offline-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    showUpdateNotification(message) {
        // Create update notification
        const notification = document.createElement('div');
        notification.id = 'update-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span>🔄</span>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; color: white; cursor: pointer; font-size: 18px;">
                    ×
                </button>
            </div>
        `;
        
        notification.addEventListener('click', () => {
            this.updateApp();
        });
        
        document.body.appendChild(notification);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    }

    updateApp() {
        if (this.updateAvailable && this.swRegistration && this.swRegistration.waiting) {
            // Send message to service worker to skip waiting
            this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
            
            // Reload the page after a short delay
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    }

    async checkForUpdates() {
        if (this.swRegistration) {
            try {
                await this.swRegistration.update();
            } catch (error) {
                console.error('Error checking for updates:', error);
            }
        }
    }

    // Utility methods for cache management
    async clearCache() {
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
            console.log('All caches cleared');
        }
    }

    async getCacheSize() {
        if ('caches' in window) {
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
        return 0;
    }

    // Method to cache additional URLs
    async cacheUrls(urls) {
        if (this.swRegistration && this.swRegistration.active) {
            this.swRegistration.active.postMessage({
                type: 'CACHE_URLS',
                urls: urls
            });
        }
    }
}

// Initialize service worker manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.swManager = new ServiceWorkerManager();
});

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// Export for use in other scripts
window.ServiceWorkerManager = ServiceWorkerManager; 