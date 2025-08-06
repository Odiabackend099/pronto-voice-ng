// Security utilities for production deployment

/**
 * Sanitize user input to prevent XSS attacks
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript protocols
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Validate emergency data input
 */
export const validateEmergencyData = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check required fields
  if (!data.type || typeof data.type !== 'string') {
    errors.push('Emergency type is required');
  }

  if (!data.description || typeof data.description !== 'string') {
    errors.push('Emergency description is required');
  }

  // Validate location if provided
  if (data.location) {
    if (typeof data.location.lat !== 'number' || typeof data.location.lng !== 'number') {
      errors.push('Invalid location coordinates');
    }
    
    // Basic coordinate validation
    if (data.location.lat < -90 || data.location.lat > 90) {
      errors.push('Invalid latitude');
    }
    
    if (data.location.lng < -180 || data.location.lng > 180) {
      errors.push('Invalid longitude');
    }
  }

  // Sanitize text fields
  if (data.description) {
    data.description = sanitizeInput(data.description);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Rate limiting utility
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  isAllowed(key: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }

    const requestTimes = this.requests.get(key)!;
    
    // Remove old requests outside the window
    const validRequests = requestTimes.filter(time => time > windowStart);
    this.requests.set(key, validRequests);

    if (validRequests.length >= maxRequests) {
      return false;
    }

    // Add current request
    validRequests.push(now);
    return true;
  }

  getRemainingRequests(key: string, maxRequests: number = 10, windowMs: number = 60000): number {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!this.requests.has(key)) {
      return maxRequests;
    }

    const requestTimes = this.requests.get(key)!;
    const validRequests = requestTimes.filter(time => time > windowStart);
    
    return Math.max(0, maxRequests - validRequests.length);
  }
}

/**
 * Secure headers for API requests
 */
export const getSecureHeaders = (): Record<string, string> => {
  return {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };
};

/**
 * Generate secure session ID
 */
export const generateSecureId = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Mask sensitive data for logging
 */
export const maskSensitiveData = (data: any): any => {
  if (!data || typeof data !== 'object') return data;

  const sensitiveKeys = [
    'password', 'token', 'key', 'secret', 'api_key', 'apikey',
    'location', 'coordinates', 'lat', 'lng', 'latitude', 'longitude',
    'phone', 'email', 'address', 'name', 'id'
  ];

  const masked = { ...data };

  for (const key in masked) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      if (typeof masked[key] === 'string') {
        masked[key] = '***MASKED***';
      } else if (typeof masked[key] === 'number') {
        masked[key] = 0;
      } else {
        masked[key] = null;
      }
    }
  }

  return masked;
};

/**
 * Content Security Policy headers
 */
export const CSP_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.openai.com https://api.elevenlabs.io",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "connect-src 'self' https://api.openai.com https://api.elevenlabs.io wss: https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
};