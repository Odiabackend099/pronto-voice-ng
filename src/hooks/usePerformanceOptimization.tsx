import { useEffect, useCallback, useMemo } from 'react';
import { debounce, throttle, PerformanceMonitor, ConnectionMonitor } from '@/utils/performance';

/**
 * Hook for optimizing expensive operations
 */
export const useOptimizedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300,
  type: 'debounce' | 'throttle' = 'debounce'
) => {
  return useMemo(() => {
    return type === 'debounce' 
      ? debounce(callback, delay)
      : throttle(callback, delay);
  }, [callback, delay, type]);
};

/**
 * Hook for monitoring emergency response performance
 */
export const useEmergencyPerformance = () => {
  const monitor = PerformanceMonitor.getInstance();

  const trackEmergencyOperation = useCallback((operation: string) => {
    return monitor.startTiming(`emergency_${operation}`);
  }, [monitor]);

  const getEmergencyMetrics = useCallback(() => {
    const metrics = monitor.getMetrics();
    return Object.entries(metrics)
      .filter(([key]) => key.startsWith('emergency_'))
      .reduce((acc, [key, value]) => {
        acc[key.replace('emergency_', '')] = value;
        return acc;
      }, {} as Record<string, { average: number; count: number; latest: number }>);
  }, [monitor]);

  return { trackEmergencyOperation, getEmergencyMetrics };
};

/**
 * Hook for connection quality monitoring
 */
export const useConnectionQuality = () => {
  const connectionMonitor = ConnectionMonitor.getInstance();

  const checkConnection = useCallback(async () => {
    return await connectionMonitor.checkConnection();
  }, [connectionMonitor]);

  const getQuality = useCallback(() => {
    return connectionMonitor.getQuality();
  }, [connectionMonitor]);

  // Auto-check connection every 30 seconds
  useEffect(() => {
    const interval = setInterval(checkConnection, 30000);
    checkConnection(); // Initial check
    
    return () => clearInterval(interval);
  }, [checkConnection]);

  return { checkConnection, getQuality };
};

/**
 * Hook for memory management in audio processing
 */
export const useAudioMemoryManagement = () => {
  useEffect(() => {
    const cleanup = () => {
      // Clean up audio resources on page unload
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
        audio.load();
      });
    };

    window.addEventListener('beforeunload', cleanup);
    
    // Cleanup every 5 minutes to prevent memory leaks
    const interval = setInterval(cleanup, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('beforeunload', cleanup);
      clearInterval(interval);
      cleanup();
    };
  }, []);
};