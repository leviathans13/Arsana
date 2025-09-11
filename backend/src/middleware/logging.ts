import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface LogEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  userAgent: string;
  ip: string;
  userId?: string;
  statusCode?: number;
  responseTime?: number;
  error?: string;
  requestBody?: any;
  queryParams?: any;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;

  log(entry: LogEntry): void {
    this.logs.push(entry);
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(JSON.stringify(entry, null, 2));
    }

    // In production, you might want to send logs to an external service
    // like Winston, Bunyan, or a cloud logging service
  }

  getLogs(limit: number = 100): LogEntry[] {
    return this.logs.slice(-limit);
  }

  getLogsByUser(userId: string, limit: number = 100): LogEntry[] {
    return this.logs
      .filter(log => log.userId === userId)
      .slice(-limit);
  }

  getLogsByStatus(statusCode: number, limit: number = 100): LogEntry[] {
    return this.logs
      .filter(log => log.statusCode === statusCode)
      .slice(-limit);
  }

  clearLogs(): void {
    this.logs = [];
  }
}

export const logger = new Logger();

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const requestId = uuidv4();
  
  // Add request ID to request object for tracking
  (req as any).requestId = requestId;

  const logEntry: LogEntry = {
    id: requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent') || 'Unknown',
    ip: req.ip || req.connection.remoteAddress || 'Unknown',
    userId: (req as any).user?.userId,
    requestBody: req.method !== 'GET' ? sanitizeRequestBody(req.body) : undefined,
    queryParams: Object.keys(req.query).length > 0 ? req.query : undefined,
  };

  // Override res.end to capture response details
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const responseTime = Date.now() - startTime;
    
    logEntry.statusCode = res.statusCode;
    logEntry.responseTime = responseTime;

    // Log error if status code indicates an error
    if (res.statusCode >= 400) {
      logEntry.error = `HTTP ${res.statusCode}`;
    }

    logger.log(logEntry);
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Sanitize request body for logging (remove sensitive data)
const sanitizeRequestBody = (body: any): any => {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
};

// Performance monitoring middleware
export const performanceMonitor = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

    // Log slow requests (> 1 second)
    if (duration > 1000) {
      console.warn(`Slow request detected: ${req.method} ${req.url} took ${duration.toFixed(2)}ms`);
    }

    // Log to performance metrics (you might want to send this to a monitoring service)
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to monitoring service like DataDog, New Relic, etc.
      // monitoringService.recordRequestDuration(req.url, duration, res.statusCode);
    }
  });

  next();
};

// Security logging middleware
export const securityLogger = (req: Request, res: Response, next: NextFunction): void => {
  // Log potential security issues
  const suspiciousPatterns = [
    /script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
  ];

  const checkForSuspiciousContent = (input: any): boolean => {
    if (typeof input === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(input));
    }
    if (typeof input === 'object' && input !== null) {
      return Object.values(input).some(checkForSuspiciousContent);
    }
    return false;
  };

  if (checkForSuspiciousContent(req.body) || checkForSuspiciousContent(req.query)) {
    console.warn(`Potential security threat detected from IP: ${req.ip}`, {
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      body: req.body,
      query: req.query,
    });
  }

  next();
};

// Error logging middleware
export const errorLogger = (error: Error, req: Request, res: Response, next: NextFunction): void => {
  const logEntry: LogEntry = {
    id: (req as any).requestId || uuidv4(),
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent') || 'Unknown',
    ip: req.ip || req.connection.remoteAddress || 'Unknown',
    userId: (req as any).user?.userId,
    error: error.message,
    statusCode: (error as any).statusCode || 500,
  };

  logger.log(logEntry);

  // Log full error details in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error details:', {
      ...logEntry,
      stack: error.stack,
    });
  }

  next(error);
};

// Health check endpoint for monitoring
export const healthCheck = (req: Request, res: Response): void => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
  };

  res.json(health);
};

// Metrics endpoint
export const getMetrics = (req: Request, res: Response): void => {
  const logs = logger.getLogs(1000);
  
  const metrics = {
    totalRequests: logs.length,
    requestsByStatus: logs.reduce((acc, log) => {
      const status = log.statusCode || 0;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<number, number>),
    averageResponseTime: logs
      .filter(log => log.responseTime)
      .reduce((acc, log) => acc + (log.responseTime || 0), 0) / logs.length || 0,
    errors: logs.filter(log => log.statusCode && log.statusCode >= 400).length,
    uniqueUsers: new Set(logs.map(log => log.userId).filter(Boolean)).size,
  };

  res.json(metrics);
};