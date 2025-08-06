type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  source?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private sanitizeData(data: any): any {
    if (!data) return data;
    
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'location', 'coordinates', 'lat', 'lng'];
    
    if (typeof data === 'object') {
      const sanitized = { ...data };
      
      for (const key in sanitized) {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          sanitized[key] = '[REDACTED]';
        }
      }
      
      return sanitized;
    }
    
    return data;
  }

  private log(level: LogLevel, message: string, data?: any, source?: string): void {
    const entry: LogEntry = {
      level,
      message,
      data: this.isDevelopment ? data : this.sanitizeData(data),
      timestamp: new Date().toISOString(),
      source
    };

    // In development, use console
    if (this.isDevelopment) {
      const logMethod = console[level] || console.log;
      logMethod(`[${level.toUpperCase()}] ${message}`, data || '');
      return;
    }

    // In production, send to monitoring service
    this.sendToMonitoring(entry);
  }

  private async sendToMonitoring(entry: LogEntry): Promise<void> {
    try {
      // For now, only log errors to avoid overwhelming logs in production
      if (entry.level === 'error') {
        // Send to Supabase for error tracking
        // This could be replaced with a proper monitoring service like Sentry
        await fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry)
        });
      }
    } catch (error) {
      // Fallback - don't log monitoring failures to avoid infinite loops
      console.error('Failed to send log to monitoring:', error);
    }
  }

  debug(message: string, data?: any, source?: string): void {
    this.log('debug', message, data, source);
  }

  info(message: string, data?: any, source?: string): void {
    this.log('info', message, data, source);
  }

  warn(message: string, data?: any, source?: string): void {
    this.log('warn', message, data, source);
  }

  error(message: string, data?: any, source?: string): void {
    this.log('error', message, data, source);
  }

  // Emergency-specific logging
  emergencyReported(emergencyId: string, type: string, severity: string): void {
    this.info('Emergency reported', { 
      emergencyId, 
      type, 
      severity, 
      timestamp: new Date().toISOString() 
    }, 'EmergencyService');
  }

  aiAgentConnected(agentId: string, sessionId: string): void {
    this.info('AI Agent connected', { 
      agentId, 
      sessionId 
    }, 'AIAgent');
  }

  aiAgentError(agentId: string, error: string): void {
    this.error('AI Agent error', { 
      agentId, 
      error: error.substring(0, 100) // Limit error message length
    }, 'AIAgent');
  }

  audioProcessingStarted(duration?: number): void {
    this.debug('Audio processing started', { 
      duration 
    }, 'AudioProcessor');
  }

  audioProcessingCompleted(transcript: string, language: string, processingTime: number): void {
    this.info('Audio processing completed', { 
      transcriptLength: transcript.length,
      language,
      processingTime
    }, 'AudioProcessor');
  }
}

export const logger = new Logger();