// Production-ready error logging and monitoring for Protect.NG CrossAI
import { supabase } from '@/integrations/supabase/client';

export interface ErrorLogEntry {
  id?: string;
  timestamp: string;
  error_type: 'RUNTIME_ERROR' | 'API_ERROR' | 'AUTH_ERROR' | 'NETWORK_ERROR' | 'VALIDATION_ERROR';
  message: string;
  stack?: string;
  user_id?: string;
  session_id: string;
  url: string;
  user_agent: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  context?: Record<string, any>;
  resolved: boolean;
}

export class ProductionLogger {
  private static instance: ProductionLogger;
  private sessionId: string;
  private errorQueue: ErrorLogEntry[] = [];
  private isOnline: boolean = navigator.onLine;

  static getInstance(): ProductionLogger {
    if (!ProductionLogger.instance) {
      ProductionLogger.instance = new ProductionLogger();
    }
    return ProductionLogger.instance;
  }

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupGlobalErrorHandlers();
    this.setupNetworkMonitoring();
    
    // Process error queue when coming back online
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processErrorQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupGlobalErrorHandlers(): void {
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      this.logError({
        error_type: 'RUNTIME_ERROR',
        message: event.message || 'Unknown runtime error',
        stack: event.error?.stack,
        severity: 'HIGH',
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        }
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        error_type: 'RUNTIME_ERROR',
        message: `Unhandled promise rejection: ${event.reason}`,
        stack: event.reason?.stack,
        severity: 'HIGH',
        context: { reason: event.reason }
      });
    });

    // Handle React errors (if using React error boundary)
    window.addEventListener('react-error', ((event: CustomEvent) => {
      this.logError({
        error_type: 'RUNTIME_ERROR',
        message: event.detail.message || 'React component error',
        stack: event.detail.stack,
        severity: 'CRITICAL',
        context: { componentStack: event.detail.componentStack }
      });
    }) as EventListener);
  }

  private setupNetworkMonitoring(): void {
    // Monitor network errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        if (!response.ok) {
          this.logError({
            error_type: 'API_ERROR',
            message: `HTTP ${response.status}: ${response.statusText}`,
            severity: response.status >= 500 ? 'HIGH' : 'MEDIUM',
            context: {
              url: args[0],
              status: response.status,
              statusText: response.statusText
            }
          });
        }
        
        return response;
      } catch (error) {
        this.logError({
          error_type: 'NETWORK_ERROR',
          message: `Network request failed: ${error}`,
          severity: 'HIGH',
          context: {
            url: args[0],
            error: error instanceof Error ? error.message : String(error)
          }
        });
        throw error;
      }
    };
  }

  async logError(errorData: Partial<ErrorLogEntry>): Promise<void> {
    const errorEntry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      session_id: this.sessionId,
      url: window.location.href,
      user_agent: navigator.userAgent,
      resolved: false,
      ...errorData,
      error_type: errorData.error_type || 'RUNTIME_ERROR',
      message: errorData.message || 'Unknown error',
      severity: errorData.severity || 'MEDIUM'
    };

    // Add to queue for offline handling
    this.errorQueue.push(errorEntry);

    // Try to send immediately if online
    if (this.isOnline) {
      await this.processErrorQueue();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', errorEntry);
    }
  }

  private async processErrorQueue(): Promise<void> {
    if (this.errorQueue.length === 0) return;

    const errors = [...this.errorQueue];
    this.errorQueue = [];

    try {
      // Send errors to Supabase edge function for processing
      const { error } = await supabase.functions.invoke('log-emergency', {
        body: { 
          type: 'error_batch',
          errors: errors
        }
      });

      if (error) {
        console.error('Failed to log errors to server:', error);
        // Put errors back in queue if failed
        this.errorQueue.unshift(...errors);
      }
    } catch (error) {
      console.error('Error queue processing failed:', error);
      // Put errors back in queue if failed
      this.errorQueue.unshift(...errors);
    }
  }

  // Log emergency-specific events
  logEmergencyEvent(event: string, data: any, severity: ErrorLogEntry['severity'] = 'MEDIUM'): void {
    this.logError({
      error_type: 'RUNTIME_ERROR',
      message: `Emergency Event: ${event}`,
      severity,
      context: { event, data }
    });
  }

  // Log authentication events
  logAuthEvent(event: string, success: boolean, error?: any): void {
    this.logError({
      error_type: 'AUTH_ERROR',
      message: `Auth Event: ${event} - ${success ? 'Success' : 'Failed'}`,
      severity: success ? 'LOW' : 'MEDIUM',
      context: { event, success, error }
    });
  }

  // Log performance metrics
  logPerformance(metric: string, value: number, threshold?: number): void {
    const isSlow = threshold && value > threshold;
    
    this.logError({
      error_type: 'RUNTIME_ERROR',
      message: `Performance: ${metric} = ${value}ms ${isSlow ? '(SLOW)' : ''}`,
      severity: isSlow ? 'MEDIUM' : 'LOW',
      context: { metric, value, threshold, isSlow }
    });
  }

  // Get error statistics for dashboard
  async getErrorStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    recent: number;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('log-emergency', {
        body: { 
          type: 'get_error_stats',
          session_id: this.sessionId
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to get error stats:', error);
      return {
        total: 0,
        byType: {},
        bySeverity: {},
        recent: 0
      };
    }
  }
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map();
  private static logger = ProductionLogger.getInstance();

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
    const thresholds = {
      'emergency_report_submit': 3000,
      'auth_login': 2000,
      'auth_signup': 3000,
      'dashboard_load': 2000,
      'voice_transcription': 5000,
      'location_lookup': 1000
    };

    const threshold = thresholds[operation as keyof typeof thresholds];
    if (threshold && duration > threshold) {
      this.logger.logPerformance(operation, duration, threshold);
    }
  }

  static getAverageTime(operation: string): number {
    const metrics = this.metrics.get(operation) || [];
    if (metrics.length === 0) return 0;
    return metrics.reduce((sum, time) => sum + time, 0) / metrics.length;
  }

  static getCoreWebVitals(): Promise<{
    fcp: number; // First Contentful Paint
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
  }> {
    return new Promise((resolve) => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const vitals = {
          fcp: 0,
          lcp: 0,
          fid: 0,
          cls: 0
        };

        entries.forEach((entry) => {
          switch (entry.entryType) {
            case 'paint':
              if (entry.name === 'first-contentful-paint') {
                vitals.fcp = entry.startTime;
              }
              break;
            case 'largest-contentful-paint':
              vitals.lcp = entry.startTime;
              break;
            case 'first-input':
              vitals.fid = (entry as any).processingStart - entry.startTime;
              break;
            case 'layout-shift':
              if (!(entry as any).hadRecentInput) {
                vitals.cls += (entry as any).value;
              }
              break;
          }
        });

        resolve(vitals);
      });

      observer.observe({ 
        entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] 
      });

      // Fallback timeout
      setTimeout(() => {
        observer.disconnect();
        resolve({ fcp: 0, lcp: 0, fid: 0, cls: 0 });
      }, 10000);
    });
  }
}

// Security monitoring
export class SecurityMonitor {
  private static logger = ProductionLogger.getInstance();

  static logSecurityEvent(event: string, severity: ErrorLogEntry['severity'], details: any): void {
    this.logger.logError({
      error_type: 'RUNTIME_ERROR',
      message: `Security Event: ${event}`,
      severity,
      context: { securityEvent: event, details }
    });
  }

  static detectSuspiciousActivity(): void {
    // Monitor for rapid requests
    const requestCounts = new Map<string, number>();
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const url = args[0]?.toString() || 'unknown';
      const count = requestCounts.get(url) || 0;
      requestCounts.set(url, count + 1);

      // Reset counts every minute
      setTimeout(() => {
        requestCounts.set(url, Math.max(0, (requestCounts.get(url) || 0) - 1));
      }, 60000);

      // Alert on suspicious activity
      if (count > 30) { // More than 30 requests per minute
        this.logSecurityEvent('Rapid API requests detected', 'HIGH', {
          url,
          requestCount: count,
          userAgent: navigator.userAgent
        });
      }

      return originalFetch(...args);
    };
  }

  static validateCSP(): void {
    // Check if Content Security Policy is properly configured
    const metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!metaCSP) {
      this.logSecurityEvent('Missing Content Security Policy', 'MEDIUM', {
        recommendation: 'Add CSP meta tag or header'
      });
    }
  }
}

// Initialize monitoring systems
export function initializeMonitoring(): void {
  const logger = ProductionLogger.getInstance();
  SecurityMonitor.detectSuspiciousActivity();
  SecurityMonitor.validateCSP();
  
  // Log app startup
  logger.logError({
    error_type: 'RUNTIME_ERROR',
    message: 'Application started',
    severity: 'LOW',
    context: {
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  });
}

// Export singleton instances
export const logger = ProductionLogger.getInstance();
export const performanceMonitor = PerformanceMonitor;
