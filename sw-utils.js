// Service Worker Utilities for Flow App

class ServiceWorkerUtils {
    constructor() {
        this.registration = null;
        this.isOnline = navigator.onLine;
        this.init();
    }

    async init() {
        // Check if service worker is supported
        if ('serviceWorker' in navigator) {
            try {
                this.registration = await navigator.serviceWorker.ready;
                console.log('Service Worker ready:', this.registration);
                
                // Listen for online/offline events
                window.addEventListener('online', () => {
                    this.isOnline = true;
                    this.onOnline();
                });
                
                window.addEventListener('offline', () => {
                    this.isOnline = false;
                    this.onOffline();
                });
                
                // Check for updates
                this.checkForUpdates();
                
            } catch (error) {
                console.error('Service Worker initialization failed:', error);
            }
        }
    }

    // Check for service worker updates
    async checkForUpdates() {
        if (this.registration) {
            this.registration.addEventListener('updatefound', () => {
                const newWorker = this.registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        this.showUpdateNotification();
                    }
                });
            });
        }
    }

    // Show update notification
    showUpdateNotification() {
        if (confirm('A new version of Flow is available. Would you like to update now?')) {
            this.updateApp();
        }
    }

    // Update the app
    updateApp() {
        if (this.registration && this.registration.waiting) {
            this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
        }
    }

    // Handle online event
    onOnline() {
        console.log('App is back online');
        this.syncOfflineData();
        this.showMessage('Connection restored! Syncing data...', 'success');
    }

    // Handle offline event
    onOffline() {
        console.log('App is offline');
        this.showMessage('You are offline. Changes will be saved locally and synced when connection is restored.', 'warning');
    }

    // Sync offline data
    async syncOfflineData() {
        if (this.registration && this.registration.sync) {
            try {
                await this.registration.sync.register('background-sync');
                console.log('Background sync registered');
            } catch (error) {
                console.error('Background sync registration failed:', error);
            }
        }
    }

    // Cache data for offline use
    async cacheData(data) {
        if (this.registration) {
            this.registration.active.postMessage({
                type: 'CACHE_DATA',
                data: data
            });
        }
    }

    // Request notification permission
    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return false;
    }

    // Send notification
    async sendNotification(title, options = {}) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(title, {
                icon: '/flow-logo.jpeg',
                badge: '/flow-logo.jpeg',
                ...options
            });
            
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
            
            return notification;
        }
    }

    // Show message to user
    showMessage(message, type = 'info') {
        // Create a temporary message element
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;
        messageEl.style.position = 'fixed';
        messageEl.style.top = '20px';
        messageEl.style.right = '20px';
        messageEl.style.zIndex = '9999';
        messageEl.style.padding = '10px 20px';
        messageEl.style.borderRadius = '5px';
        messageEl.style.color = 'white';
        messageEl.style.fontWeight = 'bold';
        
        // Set background color based on type
        switch (type) {
            case 'success':
                messageEl.style.backgroundColor = '#4CAF50';
                break;
            case 'error':
                messageEl.style.backgroundColor = '#f44336';
                break;
            case 'warning':
                messageEl.style.backgroundColor = '#ff9800';
                break;
            default:
                messageEl.style.backgroundColor = '#2196F3';
        }
        
        document.body.appendChild(messageEl);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.remove();
            }
        }, 5000);
    }

    // Get service worker version
    async getVersion() {
        return new Promise((resolve) => {
            if (this.registration && this.registration.active) {
                const channel = new MessageChannel();
                channel.port1.onmessage = (event) => {
                    resolve(event.data.version);
                };
                this.registration.active.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
            } else {
                resolve('unknown');
            }
        });
    }

    // Check if app is installed
    isAppInstalled() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true;
    }

    // Install app prompt
    async showInstallPrompt() {
        if ('BeforeInstallPromptEvent' in window) {
            const promptEvent = window.deferredPrompt;
            if (promptEvent) {
                promptEvent.prompt();
                const result = await promptEvent.userChoice;
                window.deferredPrompt = null;
                return result.outcome === 'accepted';
            }
        }
        return false;
    }

    // Get offline status
    getOfflineStatus() {
        return !this.isOnline;
    }

    // Get cache status
    async getCacheStatus() {
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            return cacheNames.length > 0;
        }
        return false;
    }
}

// Create global instance
window.swUtils = new ServiceWorkerUtils();

// Listen for beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPrompt = e;
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ServiceWorkerUtils;
} 