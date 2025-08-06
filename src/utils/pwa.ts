// PWA Optimization Utilities for Cross AI

/**
 * PWA Status Checker - Validates PWA implementation
 */
export class PWAStatusChecker {
  static async checkPWAStatus(): Promise<{
    isInstallable: boolean;
    isInstalled: boolean;
    serviceWorkerRegistered: boolean;
    manifestValid: boolean;
    httpsEnabled: boolean;
    offlineCapable: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    
    // Check HTTPS
    const httpsEnabled = location.protocol === 'https:' || location.hostname === 'localhost';
    if (!httpsEnabled) {
      issues.push('PWA requires HTTPS for production');
    }
    
    // Check Service Worker
    const serviceWorkerRegistered = 'serviceWorker' in navigator;
    if (!serviceWorkerRegistered) {
      issues.push('Service Worker not supported');
    }
    
    // Check Manifest
    const manifestValid = await this.validateManifest();
    if (!manifestValid) {
      issues.push('Web App Manifest invalid or missing');
    }
    
    // Check if app is installable
    const isInstallable = 'BeforeInstallPromptEvent' in window;
    
    // Check if app is already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as any).standalone ||
                       document.referrer.includes('android-app://');
    
    // Check offline capability
    const offlineCapable = serviceWorkerRegistered && await this.checkOfflineCapability();
    
    return {
      isInstallable,
      isInstalled,
      serviceWorkerRegistered,
      manifestValid,
      httpsEnabled,
      offlineCapable,
      issues
    };
  }
  
  private static async validateManifest(): Promise<boolean> {
    try {
      const response = await fetch('/manifest.json');
      const manifest = await response.json();
      
      // Check required manifest fields
      const required = ['name', 'short_name', 'start_url', 'display', 'theme_color', 'icons'];
      return required.every(field => manifest[field]);
    } catch {
      return false;
    }
  }
  
  private static async checkOfflineCapability(): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      return !!registration && registration.active !== null;
    } catch {
      return false;
    }
  }
}

/**
 * Emergency Offline Storage Manager
 */
export class OfflineStorageManager {
  private static readonly OFFLINE_REPORTS_KEY = 'offline-emergency-reports';
  private static readonly MAX_OFFLINE_REPORTS = 50;
  
  static saveOfflineReport(report: any): void {
    try {
      const reports = this.getOfflineReports();
      const newReport = {
        ...report,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        status: 'pending-sync'
      };
      
      reports.push(newReport);
      
      // Limit stored reports
      if (reports.length > this.MAX_OFFLINE_REPORTS) {
        reports.splice(0, reports.length - this.MAX_OFFLINE_REPORTS);
      }
      
      localStorage.setItem(this.OFFLINE_REPORTS_KEY, JSON.stringify(reports));
      
      // Register background sync if available
      this.requestBackgroundSync();
    } catch (error) {
      console.error('Failed to save offline report:', error);
    }
  }
  
  static getOfflineReports(): any[] {
    try {
      const reports = localStorage.getItem(this.OFFLINE_REPORTS_KEY);
      return reports ? JSON.parse(reports) : [];
    } catch {
      return [];
    }
  }
  
  static removeOfflineReport(reportId: string): void {
    try {
      const reports = this.getOfflineReports();
      const filtered = reports.filter(r => r.id !== reportId);
      localStorage.setItem(this.OFFLINE_REPORTS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove offline report:', error);
    }
  }
  
  static clearOfflineReports(): void {
    localStorage.removeItem(this.OFFLINE_REPORTS_KEY);
  }
  
  private static async requestBackgroundSync(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.ready;
      if ('sync' in registration) {
        await (registration as any).sync.register('emergency-report-sync');
      }
    } catch (error) {
      console.log('Background sync not available:', error);
    }
  }
}

/**
 * PWA Performance Monitor
 */
export class PWAPerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map();
  
  static startTiming(operation: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(operation, duration);
    };
  }
  
  static recordMetric(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    const metrics = this.metrics.get(operation)!;
    metrics.push(duration);
    
    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift();
    }
    
    // Log slow operations
    if (duration > 1000) {
      console.warn(`⚠️ Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`);
    }
  }
  
  static getMetrics(): Record<string, { average: number; count: number; latest: number }> {
    const result: Record<string, { average: number; count: number; latest: number }> = {};
    
    for (const [operation, times] of this.metrics) {
      const average = times.reduce((sum, time) => sum + time, 0) / times.length;
      result[operation] = {
        average: Math.round(average * 100) / 100,
        count: times.length,
        latest: Math.round((times[times.length - 1] || 0) * 100) / 100
      };
    }
    
    return result;
  }
  
  static getVitals(): {
    fcp: number; // First Contentful Paint
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
  } {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    
    return {
      fcp: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      lcp: this.getLargestContentfulPaint(),
      fid: this.getFirstInputDelay(),
      cls: this.getCumulativeLayoutShift()
    };
  }
  
  private static getLargestContentfulPaint(): number {
    // Simplified LCP implementation
    const lcpEntry = performance.getEntriesByType('largest-contentful-paint').pop();
    return lcpEntry ? lcpEntry.startTime : 0;
  }
  
  private static getFirstInputDelay(): number {
    // Simplified FID implementation
    const fidEntry = performance.getEntriesByType('first-input').pop();
    return fidEntry ? (fidEntry as any).processingStart - fidEntry.startTime : 0;
  }
  
  private static getCumulativeLayoutShift(): number {
    // Simplified CLS implementation
    const clsEntries = performance.getEntriesByType('layout-shift');
    return clsEntries.reduce((cls, entry) => cls + (entry as any).value, 0);
  }
}

/**
 * PWA Install Manager
 */
export class PWAInstallManager {
  private static deferredPrompt: any = null;
  
  static init(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      console.log('PWA install prompt available');
    });
    
    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA installed successfully');
      this.deferredPrompt = null;
      
      // Track installation
      this.trackInstallation();
    });
  }
  
  static async promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!this.deferredPrompt) {
      return 'unavailable';
    }
    
    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      this.deferredPrompt = null;
      return outcome;
    } catch (error) {
      console.error('Install prompt failed:', error);
      return 'dismissed';
    }
  }
  
  static isInstallable(): boolean {
    return !!this.deferredPrompt;
  }
  
  static isInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone ||
           document.referrer.includes('android-app://');
  }
  
  private static trackInstallation(): void {
    // Track PWA installation for analytics
    console.log('📱 PWA Installation Analytics:', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language
    });
  }
}

/**
 * PWA Update Manager
 */
export class PWAUpdateManager {
  private static registration: ServiceWorkerRegistration | null = null;
  
  static init(registration: ServiceWorkerRegistration): void {
    this.registration = registration;
    
    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.notifyUpdate();
          }
        });
      }
    });
    
    // Check for updates periodically (every 5 minutes)
    setInterval(() => {
      this.checkForUpdates();
    }, 5 * 60 * 1000);
  }
  
  static async checkForUpdates(): Promise<boolean> {
    if (!this.registration) return false;
    
    try {
      await this.registration.update();
      return true;
    } catch (error) {
      console.error('Update check failed:', error);
      return false;
    }
  }
  
  static async applyUpdate(): Promise<void> {
    if (!this.registration?.waiting) return;
    
    // Tell the waiting service worker to take over
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    
    // Reload the page to use the new service worker
    window.location.reload();
  }
  
  private static notifyUpdate(): void {
    // Show update notification
    const updateBanner = document.createElement('div');
    updateBanner.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; right: 0; background: hsl(158, 66%, 19%); color: white; padding: 12px; text-align: center; z-index: 10001; font-size: 14px;">
        🔄 New version available! 
        <button onclick="window.pwaUpdateManager.applyUpdate()" style="background: white; color: hsl(158, 66%, 19%); border: none; padding: 4px 12px; border-radius: 4px; margin-left: 8px; font-weight: 600;">
          Update Now
        </button>
        <button onclick="this.parentElement.parentElement.remove()" style="background: transparent; color: white; border: 1px solid rgba(255,255,255,0.3); padding: 4px 8px; border-radius: 4px; margin-left: 4px;">
          Later
        </button>
      </div>
    `;
    
    document.body.appendChild(updateBanner);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      updateBanner.remove();
    }, 10000);
  }
}

// Global PWA Update Manager access
(window as any).pwaUpdateManager = PWAUpdateManager;
