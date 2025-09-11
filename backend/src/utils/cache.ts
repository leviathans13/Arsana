import NodeCache from 'node-cache';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  checkperiod?: number; // Check for expired keys interval
  useClones?: boolean; // Clone cached values
}

class CacheManager {
  private cache: NodeCache;
  private defaultTTL: number = 300; // 5 minutes default

  constructor(options: CacheOptions = {}) {
    this.cache = new NodeCache({
      stdTTL: options.ttl || this.defaultTTL,
      checkperiod: options.checkperiod || 60,
      useClones: options.useClones || false,
    });

    // Log cache statistics periodically
    setInterval(() => {
      const stats = this.cache.getStats();
      if (process.env.NODE_ENV === 'development') {
        console.log('Cache Stats:', stats);
      }
    }, 60000); // Every minute
  }

  // Set a value in cache
  set<T>(key: string, value: T, ttl?: number): boolean {
    return this.cache.set(key, value, ttl);
  }

  // Get a value from cache
  get<T>(key: string): T | undefined {
    return this.cache.get<T>(key);
  }

  // Get or set a value (cache-aside pattern)
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await fetchFunction();
    this.set(key, value, ttl);
    return value;
  }

  // Delete a value from cache
  del(key: string): number {
    return this.cache.del(key);
  }

  // Delete multiple keys
  delMultiple(keys: string[]): number {
    return this.cache.del(keys);
  }

  // Check if key exists
  has(key: string): boolean {
    return this.cache.has(key);
  }

  // Get all keys
  keys(): string[] {
    return this.cache.keys();
  }

  // Clear all cache
  flushAll(): void {
    this.cache.flushAll();
  }

  // Get cache statistics
  getStats() {
    return this.cache.getStats();
  }

  // Cache key generators
  static generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  // User-related cache keys
  static userKey(userId: string): string {
    return this.generateKey('user', userId);
  }

  static userLettersKey(userId: string, type: 'incoming' | 'outgoing'): string {
    return this.generateKey('user', 'letters', type, userId);
  }

  // Letter-related cache keys
  static letterKey(id: string, type: 'incoming' | 'outgoing'): string {
    return this.generateKey('letter', type, id);
  }

  static lettersListKey(type: 'incoming' | 'outgoing', filters: Record<string, any>): string {
    const filterString = Object.entries(filters)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    return this.generateKey('letters', type, 'list', filterString);
  }

  // Notification cache keys
  static notificationsKey(userId?: string): string {
    return userId 
      ? this.generateKey('notifications', 'user', userId)
      : this.generateKey('notifications', 'all');
  }

  // Statistics cache keys
  static statsKey(period: 'daily' | 'weekly' | 'monthly'): string {
    return this.generateKey('stats', period);
  }
}

// Create singleton instance
export const cache = new CacheManager({
  ttl: 300, // 5 minutes default
  checkperiod: 60, // Check for expired keys every minute
  useClones: true, // Clone cached values to prevent mutations
});

// Cache middleware for Express routes
export const cacheMiddleware = (ttl: number = 300) => {
  return (req: any, res: any, next: any) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = CacheManager.generateKey(
      'route',
      req.method,
      req.originalUrl,
      JSON.stringify(req.query)
    );

    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = function(body: any) {
      cache.set(cacheKey, body, ttl);
      return originalJson.call(this, body);
    };

    next();
  };
};

// Cache invalidation utilities
export const invalidateUserCache = (userId: string): void => {
  const keys = cache.keys();
  const userKeys = keys.filter(key => key.includes(`user:${userId}`));
  cache.delMultiple(userKeys);
};

export const invalidateLetterCache = (letterId: string, type: 'incoming' | 'outgoing'): void => {
  // Invalidate specific letter
  cache.del(CacheManager.letterKey(letterId, type));
  
  // Invalidate all letter lists (they might contain this letter)
  const keys = cache.keys();
  const listKeys = keys.filter(key => 
    key.includes('letters') && key.includes('list')
  );
  cache.delMultiple(listKeys);
};

export const invalidateNotificationsCache = (userId?: string): void => {
  cache.del(CacheManager.notificationsKey(userId));
  if (!userId) {
    // If invalidating all notifications, also invalidate user-specific ones
    const keys = cache.keys();
    const notificationKeys = keys.filter(key => key.includes('notifications'));
    cache.delMultiple(notificationKeys);
  }
};

// Cache warming utilities
export const warmCache = async (prisma: any): Promise<void> => {
  try {
    console.log('Warming cache...');

    // Warm user cache for active users
    const activeUsers = await prisma.user.findMany({
      where: {
        updatedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      take: 50
    });

    for (const user of activeUsers) {
      cache.set(CacheManager.userKey(user.id), {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }, 600); // 10 minutes
    }

    // Warm recent letters cache
    const recentLetters = await prisma.incomingLetter.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    for (const letter of recentLetters) {
      cache.set(CacheManager.letterKey(letter.id, 'incoming'), letter, 300);
    }

    console.log('Cache warmed successfully');
  } catch (error) {
    console.error('Error warming cache:', error);
  }
};

export default cache;