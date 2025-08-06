// Service Worker for Protect.NG CrossAI PWA
const CACHE_NAME = 'protect-ng-v1.0.0';
const OFFLINE_URL = '/';

// Resources to cache for offline functionality
const CACHE_URLS = [
  '/',
  '/report',
  '/dashboard',
  '/manifest.json',
  '/lovable-uploads/22dad437-2a21-49ca-9723-622f503676fa.png',
  // Add other critical assets
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell and content');
        return cache.addAll(CACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Skip waiting on install');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Claiming clients for current page');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-http requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.open(CACHE_NAME)
            .then((cache) => {
              return cache.match(OFFLINE_URL);
            });
        })
    );
    return;
  }

  // Handle other requests with cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
          .then((fetchResponse) => {
            // Cache successful GET requests
            if (event.request.method === 'GET' && fetchResponse.status === 200) {
              const responseClone = fetchResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseClone);
                });
            }
            return fetchResponse;
          });
      })
      .catch(() => {
        // Fallback for failed requests
        if (event.request.destination === 'image') {
          return caches.match('/lovable-uploads/22dad437-2a21-49ca-9723-622f503676fa.png');
        }
      })
  );
});

// Background sync for emergency reports
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'emergency-report-sync') {
    event.waitUntil(
      // Handle background sync for emergency reports
      handleEmergencyReportSync()
    );
  }
});

// Push notifications for emergency alerts
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');
  
  const options = {
    body: event.data ? event.data.text() : 'Emergency alert received',
    icon: '/lovable-uploads/22dad437-2a21-49ca-9723-622f503676fa.png',
    badge: '/lovable-uploads/22dad437-2a21-49ca-9723-622f503676fa.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Emergency',
        icon: '/lovable-uploads/22dad437-2a21-49ca-9723-622f503676fa.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/lovable-uploads/22dad437-2a21-49ca-9723-622f503676fa.png'
      }
    ],
    requireInteraction: true
  };

  event.waitUntil(
    self.registration.showNotification('Protect.NG Emergency Alert', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received.');

  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  } else if (event.action === 'close') {
    // Just close the notification
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle emergency report sync
async function handleEmergencyReportSync() {
  try {
    // Get pending emergency reports from IndexedDB
    const pendingReports = await getPendingEmergencyReports();
    
    for (const report of pendingReports) {
      try {
        // Attempt to sync the report
        await syncEmergencyReport(report);
        // Remove from pending queue on success
        await removePendingEmergencyReport(report.id);
      } catch (error) {
        console.error('[SW] Failed to sync emergency report:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Helper functions for IndexedDB operations
async function getPendingEmergencyReports() {
  // Implementation would use IndexedDB to get pending reports
  return [];
}

async function syncEmergencyReport(report) {
  // Implementation would send report to server
  console.log('[SW] Syncing emergency report:', report);
}

async function removePendingEmergencyReport(reportId) {
  // Implementation would remove report from IndexedDB
  console.log('[SW] Removing synced report:', reportId);
}