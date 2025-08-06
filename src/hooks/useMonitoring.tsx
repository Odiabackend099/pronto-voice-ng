import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { maskSensitiveData } from '@/utils/security';

interface MonitoringService {
  trackError: (error: Error, context?: any) => Promise<void>;
  trackPerformance: (operation: string, duration: number, metadata?: any) => Promise<void>;
  trackUserAction: (action: string, metadata?: any) => Promise<void>;
}

export const useMonitoringService = (): MonitoringService => {
  const [isEnabled] = useState(process.env.NODE_ENV === 'production');

  const trackError = useCallback(async (error: Error, context?: any) => {
    if (!isEnabled) return;

    try {
      const errorData = {
        error_type: error.name || 'UnknownError',
        error_message: error.message,
        stack_trace: error.stack,
        user_agent: navigator.userAgent,
        url: window.location.href,
        metadata: maskSensitiveData(context || {}),
        created_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from('error_logs')
        .insert(errorData);

      if (insertError) {
        logger.error('Failed to log error to monitoring', { error: insertError.message });
      }
    } catch (monitoringError) {
      logger.error('Monitoring service error', { error: monitoringError });
    }
  }, [isEnabled]);

  const trackPerformance = useCallback(async (operation: string, duration: number, metadata?: any) => {
    if (!isEnabled) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const performanceData = {
        operation_type: operation,
        duration_ms: duration,
        user_id: user?.id || null,
        session_id: generateSessionId(),
        metadata: maskSensitiveData(metadata || {}),
        created_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from('performance_metrics')
        .insert(performanceData);

      if (insertError) {
        logger.error('Failed to log performance metric', { error: insertError.message });
      }
    } catch (monitoringError) {
      logger.error('Performance monitoring error', { error: monitoringError });
    }
  }, [isEnabled]);

  const trackUserAction = useCallback(async (action: string, metadata?: any) => {
    if (!isEnabled) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const auditData = {
        event_type: action,
        user_id: user?.id || null,
        endpoint: window.location.pathname,
        request_data: maskSensitiveData(metadata || {}),
        response_status: 200,
        created_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from('security_audit_log')
        .insert(auditData);

      if (insertError) {
        logger.error('Failed to log user action', { error: insertError.message });
      }
    } catch (monitoringError) {
      logger.error('User action monitoring error', { error: monitoringError });
    }
  }, [isEnabled]);

  return { trackError, trackPerformance, trackUserAction };
};

// Generate session ID for tracking
const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};