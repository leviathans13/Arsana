import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { RateLimitError } from '../utils/errors';
import { cache } from '../utils/cache';

// Custom rate limit store using our cache
class CacheRateLimitStore {
  private cache = cache;

  async increment(key: string, windowMs: number): Promise<{ totalHits: number; resetTime: Date }> {
    const now = Date.now();
    const window = Math.floor(now / windowMs);
    const cacheKey = `rate_limit:${key}:${window}`;
    
    const current = this.cache.get<number>(cacheKey) || 0;
    const newCount = current + 1;
    
    this.cache.set(cacheKey, newCount, Math.ceil(windowMs / 1000));
    
    return {
      totalHits: newCount,
      resetTime: new Date((window + 1) * windowMs),
    };
  }

  async decrement(key: string, windowMs: number): Promise<void> {
    const now = Date.now();
    const window = Math.floor(now / windowMs);
    const cacheKey = `rate_limit:${key}:${window}`;
    
    const current = this.cache.get<number>(cacheKey) || 0;
    if (current > 0) {
      this.cache.set(cacheKey, current - 1, Math.ceil(windowMs / 1000));
    }
  }

  async resetKey(key: string): Promise<void> {
    const now = Date.now();
    const window = Math.floor(now / 1000); // Use 1-second windows for reset
    const cacheKey = `rate_limit:${key}:${window}`;
    this.cache.del(cacheKey);
  }
}

// Rate limit configurations
export const rateLimitConfigs = {
  // General API rate limiting
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: 15 * 60, // 15 minutes in seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      throw new RateLimitError('Too many requests from this IP');
    },
  }),

  // Strict rate limiting for auth endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: {
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: 15 * 60,
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
    handler: (req: Request, res: Response) => {
      throw new RateLimitError('Too many authentication attempts');
    },
  }),

  // File upload rate limiting
  fileUpload: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 uploads per hour
    message: {
      error: 'Too many file uploads, please try again later.',
      retryAfter: 60 * 60,
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      throw new RateLimitError('Too many file uploads');
    },
  }),

  // Search rate limiting
  search: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 searches per minute
    message: {
      error: 'Too many search requests, please try again later.',
      retryAfter: 60,
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      throw new RateLimitError('Too many search requests');
    },
  }),

  // User-specific rate limiting
  userSpecific: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requests per window per user
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise fall back to IP
      return (req as any).user?.userId || req.ip;
    },
    message: {
      error: 'Too many requests for this user, please try again later.',
      retryAfter: 15 * 60,
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      throw new RateLimitError('Too many requests for this user');
    },
  }),
};

// Dynamic rate limiting based on user role
export const createRoleBasedRateLimit = (baseConfig: any) => {
  return rateLimit({
    ...baseConfig,
    keyGenerator: (req: Request) => {
      const user = (req as any).user;
      if (user) {
        // Admins get higher limits
        if (user.role === 'ADMIN') {
          return `admin:${user.userId}`;
        }
        return `user:${user.userId}`;
      }
      return req.ip;
    },
    max: (req: Request) => {
      const user = (req as any).user;
      if (user?.role === 'ADMIN') {
        return baseConfig.max * 2; // Admins get double the limit
      }
      return baseConfig.max;
    },
  });
};

// Adaptive rate limiting based on system load
export const createAdaptiveRateLimit = (baseConfig: any) => {
  return rateLimit({
    ...baseConfig,
    max: (req: Request) => {
      // Check system memory usage
      const memUsage = process.memoryUsage();
      const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
      // Reduce rate limit if memory usage is high
      if (memUsagePercent > 80) {
        return Math.floor(baseConfig.max * 0.5);
      } else if (memUsagePercent > 60) {
        return Math.floor(baseConfig.max * 0.75);
      }
      
      return baseConfig.max;
    },
  });
};

// Rate limit bypass for trusted IPs
export const createTrustedIPRateLimit = (baseConfig: any, trustedIPs: string[] = []) => {
  return rateLimit({
    ...baseConfig,
    skip: (req: Request) => {
      return trustedIPs.includes(req.ip || '');
    },
  });
};

// Rate limit middleware factory
export const createRateLimit = (config: any) => {
  return rateLimit(config);
};

// Rate limit status endpoint
export const getRateLimitStatus = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const key = user ? `user:${user.userId}` : req.ip;
    
    // Get current rate limit status from cache
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const window = Math.floor(now / windowMs);
    const cacheKey = `rate_limit:${key}:${window}`;
    
    const currentHits = cache.get<number>(cacheKey) || 0;
    const maxHits = user?.role === 'ADMIN' ? 200 : 100;
    const resetTime = new Date((window + 1) * windowMs);
    
    res.json({
      current: currentHits,
      limit: maxHits,
      remaining: Math.max(0, maxHits - currentHits),
      resetTime,
      windowMs,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get rate limit status' });
  }
};

// Rate limit reset endpoint (admin only)
export const resetRateLimit = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { targetKey } = req.body;
    if (!targetKey) {
      return res.status(400).json({ error: 'Target key is required' });
    }

    // Reset rate limit for the specified key
    const now = Date.now();
    const windowMs = 15 * 60 * 1000;
    const window = Math.floor(now / windowMs);
    const cacheKey = `rate_limit:${targetKey}:${window}`;
    
    cache.del(cacheKey);
    
    res.json({ message: 'Rate limit reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset rate limit' });
  }
};

// Rate limit analytics
export const getRateLimitAnalytics = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get rate limit keys from cache
    const keys = cache.keys();
    const rateLimitKeys = keys.filter(key => key.startsWith('rate_limit:'));
    
    const analytics = {
      totalRateLimitKeys: rateLimitKeys.length,
      activeWindows: new Set(rateLimitKeys.map(key => key.split(':')[2])).size,
      topOffenders: [] as Array<{ key: string; hits: number }>,
    };

    // Get top offenders
    for (const key of rateLimitKeys.slice(0, 10)) {
      const hits = cache.get<number>(key) || 0;
      if (hits > 0) {
        analytics.topOffenders.push({
          key: key.replace('rate_limit:', ''),
          hits,
        });
      }
    }

    analytics.topOffenders.sort((a, b) => b.hits - a.hits);

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get rate limit analytics' });
  }
};