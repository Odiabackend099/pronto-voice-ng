import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// PWA Service Worker Registration with Enhanced Features
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });
      
      console.log('✅ Service Worker registered successfully');
      
      // Enhanced update handling
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available, notify user
              if (confirm('New version available! Reload to update?')) {
                window.location.reload();
              }
            }
          });
        }
      });
      
      // Check for updates every 30 seconds in production
      setInterval(() => {
        registration.update();
      }, 30000);
      
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  });
}

// Enhanced PWA Features
class PWAEnhancer {
  private static instance: PWAEnhancer;
  
  static getInstance() {
    if (!PWAEnhancer.instance) {
      PWAEnhancer.instance = new PWAEnhancer();
    }
    return PWAEnhancer.instance;
  }
  
  init() {
    this.setupOfflineDetection();
    this.setupInstallPrompt();
    this.setupPushNotifications();
    this.setupBackgroundSync();
    this.setupPerformanceMonitoring();
  }
  
  private setupOfflineDetection() {
    const updateOnlineStatus = () => {
      const status = navigator.onLine ? 'online' : 'offline';
      document.body.setAttribute('data-connection', status);
      
      // Store offline status for emergency handling
      localStorage.setItem('connection-status', status);
      
      if (!navigator.onLine) {
        this.showOfflineMessage();
      } else {
        this.hideOfflineMessage();
        this.syncOfflineData();
      }
    };
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
  }
  
  private setupInstallPrompt() {
    let deferredPrompt: any;
    
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // Show install banner after 30 seconds if not dismissed
      setTimeout(() => {
        if (deferredPrompt && !localStorage.getItem('pwa-install-dismissed')) {
          this.showInstallBanner(deferredPrompt);
        }
      }, 30000);
    });
    
    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA installed successfully');
      localStorage.setItem('pwa-installed', 'true');
      deferredPrompt = null;
    });
  }
  
  private setupPushNotifications() {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      // Request permission for notifications
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('✅ Notification permission granted');
          this.registerPushService();
        }
      });
    }
  }
  
  private setupBackgroundSync() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        // Check if background sync is supported
        if ('sync' in registration) {
          // Register background sync for emergency reports
          return (registration as any).sync.register('emergency-report-sync');
        }
      }).catch(err => {
        console.log('Background sync registration failed:', err);
      });
    }
  }
  
  private setupPerformanceMonitoring() {
    // Monitor app performance for PWA optimization
    if ('performance' in window) {
      window.addEventListener('load', () => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        console.log('📊 PWA Performance Metrics:', {
          loadTime: perfData.loadEventEnd - perfData.loadEventStart,
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
          firstPaint: this.getFirstPaint(),
          timeToInteractive: this.getTimeToInteractive()
        });
      });
    }
  }
  
  private showOfflineMessage() {
    const existingMessage = document.getElementById('offline-message');
    if (existingMessage) return;
    
    const message = document.createElement('div');
    message.id = 'offline-message';
    message.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; right: 0; background: #dc2626; color: white; text-align: center; padding: 8px; z-index: 10000; font-size: 14px;">
        📱 Offline Mode - Emergency reports will sync when connection returns
      </div>
    `;
    document.body.appendChild(message);
  }
  
  private hideOfflineMessage() {
    const message = document.getElementById('offline-message');
    if (message) {
      message.remove();
    }
  }
  
  private showInstallBanner(deferredPrompt: any) {
    const banner = document.createElement('div');
    banner.innerHTML = `
      <div style="position: fixed; bottom: 20px; left: 20px; right: 20px; background: hsl(158, 66%, 19%); color: white; padding: 16px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 10000; display: flex; align-items: center; justify-content: space-between;">
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">Install Protect.NG CrossAI</div>
          <div style="font-size: 14px; opacity: 0.9;">Quick access for emergency reporting</div>
        </div>
        <div>
          <button id="install-pwa-btn" style="background: white; color: hsl(158, 66%, 19%); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; margin-right: 8px;">Install</button>
          <button id="dismiss-pwa-btn" style="background: transparent; color: white; border: 1px solid rgba(255,255,255,0.3); padding: 8px 12px; border-radius: 6px;">Later</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(banner);
    
    document.getElementById('install-pwa-btn')?.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('Install prompt result:', outcome);
        banner.remove();
      }
    });
    
    document.getElementById('dismiss-pwa-btn')?.addEventListener('click', () => {
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());
      banner.remove();
    });
  }
  
  private async syncOfflineData() {
    // Sync any offline emergency reports
    const offlineReports = JSON.parse(localStorage.getItem('offline-emergency-reports') || '[]');
    
    for (const report of offlineReports) {
      try {
        // Attempt to sync the report
        await this.syncEmergencyReport(report);
        // Remove from offline storage on success
        this.removeOfflineReport(report.id);
      } catch (error) {
        console.error('Failed to sync offline report:', error);
      }
    }
  }
  
  private async syncEmergencyReport(report: any) {
    // Implementation for syncing emergency reports
    console.log('Syncing emergency report:', report.id);
  }
  
  private removeOfflineReport(reportId: string) {
    const reports = JSON.parse(localStorage.getItem('offline-emergency-reports') || '[]');
    const filtered = reports.filter((r: any) => r.id !== reportId);
    localStorage.setItem('offline-emergency-reports', JSON.stringify(filtered));
  }
  
  private async registerPushService() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array('your-vapid-public-key-here')
      });
      
      console.log('✅ Push service registered:', subscription);
      // Send subscription to your server
    } catch (error) {
      console.error('Push service registration failed:', error);
    }
  }
  
  private urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
  
  private getFirstPaint() {
    const paint = performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint');
    return paint ? paint.startTime : 0;
  }
  
  private getTimeToInteractive() {
    // Simplified TTI calculation
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return navigation.domInteractive - navigation.fetchStart;
  }
}

// Initialize PWA enhancements
const pwaEnhancer = PWAEnhancer.getInstance();
pwaEnhancer.init();

createRoot(document.getElementById("root")!).render(<App />);
