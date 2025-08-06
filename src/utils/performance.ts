// Performance optimization utilities for production

/**
 * Debounce function to limit expensive operations
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Throttle function to limit API calls
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), delay);
    }
  };
};

/**
 * Create batched function for bulk operations
 */
export const createBatchedFunction = <T>(
  batchProcessor: (items: T[]) => Promise<void>,
  delay: number = 100,
  maxBatchSize: number = 10
) => {
  let batch: T[] = [];
  let timeoutId: ReturnType<typeof setTimeout>;

  return (item: T) => {
    batch.push(item);
    
    clearTimeout(timeoutId);
    
    if (batch.length >= maxBatchSize) {
      const currentBatch = [...batch];
      batch = [];
      batchProcessor(currentBatch);
    } else {
      timeoutId = setTimeout(() => {
        if (batch.length > 0) {
          const currentBatch = [...batch];
          batch = [];
          batchProcessor(currentBatch);
        }
      }, delay);
    }
  };
};

/**
 * Memory usage optimization for audio data
 */
export const optimizeAudioBuffer = (audioData: ArrayBuffer): ArrayBuffer => {
  // Create a new buffer with only the necessary data
  const optimizedBuffer = audioData.slice(0);
  return optimizedBuffer;
};

/**
 * Clean up memory for audio resources
 */
export const cleanupAudioResources = () => {
  // Force garbage collection of audio objects
  const audioElements = document.querySelectorAll('audio');
  audioElements.forEach(audio => {
    audio.pause();
    audio.currentTime = 0;
    audio.src = '';
    audio.load();
  });
};

/**
 * Performance monitoring for emergency response times
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTiming(operation: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(operation, duration);
    };
  }

  recordMetric(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    const metrics = this.metrics.get(operation)!;
    metrics.push(duration);
    
    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  getAverageTime(operation: string): number {
    const metrics = this.metrics.get(operation) || [];
    if (metrics.length === 0) return 0;
    return metrics.reduce((sum, time) => sum + time, 0) / metrics.length;
  }

  getMetrics(): Record<string, { average: number; count: number; latest: number }> {
    const result: Record<string, { average: number; count: number; latest: number }> = {};
    
    for (const [operation, times] of this.metrics) {
      result[operation] = {
        average: this.getAverageTime(operation),
        count: times.length,
        latest: times[times.length - 1] || 0
      };
    }
    
    return result;
  }
}

/**
 * Connection quality monitor for voice/video calls
 */
export class ConnectionMonitor {
  private static instance: ConnectionMonitor;
  private quality: 'excellent' | 'good' | 'fair' | 'poor' = 'good';

  static getInstance(): ConnectionMonitor {
    if (!ConnectionMonitor.instance) {
      ConnectionMonitor.instance = new ConnectionMonitor();
    }
    return ConnectionMonitor.instance;
  }

  async checkConnection(): Promise<'excellent' | 'good' | 'fair' | 'poor'> {
    try {
      // Test connection speed with small request
      const start = performance.now();
      await fetch('/favicon.ico', { cache: 'no-cache' });
      const latency = performance.now() - start;

      if (latency < 100) this.quality = 'excellent';
      else if (latency < 300) this.quality = 'good';
      else if (latency < 1000) this.quality = 'fair';
      else this.quality = 'poor';

      return this.quality;
    } catch {
      this.quality = 'poor';
      return this.quality;
    }
  }

  getQuality(): 'excellent' | 'good' | 'fair' | 'poor' {
    return this.quality;
  }
}
